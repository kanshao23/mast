import { spawn } from "node:child_process";
import type { ZodSchema } from "zod";

export type Provider = "claude" | "codex";

export interface AiCallArgs<T> {
  provider: Provider;
  prompt: string;
  schema?: ZodSchema<T>;
  timeoutMs?: number;
}

function runCli(provider: Provider, prompt: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const [cmd, args] =
      provider === "claude"
        ? ["claude", ["-p", "--output-format", "json"]]
        : ["codex", ["exec", "-"]];
    const proc = spawn(cmd as string, args as string[]);
    let stdout = "", stderr = "";
    const t = setTimeout(() => { proc.kill("SIGKILL"); reject(new Error("ai cli timeout")); }, timeoutMs);
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
    proc.stdin.write(prompt);
    proc.stdin.end();
    proc.on("close", (code: number) => {
      clearTimeout(t);
      if (code !== 0) return reject(new Error(`ai cli exit ${code}: ${stderr}`));
      resolve(stdout);
    });
  });
}

function extractText(provider: Provider, raw: string): string {
  if (provider === "claude") {
    try {
      const obj = JSON.parse(raw);
      return obj.result ?? obj.text ?? raw;
    } catch { return raw; }
  }
  return raw;
}

export async function aiCall<T>(args: AiCallArgs<T>): Promise<T> {
  const timeoutMs = args.timeoutMs ?? 5 * 60_000;
  const raw = await runCli(args.provider, args.prompt, timeoutMs);
  const text = extractText(args.provider, raw);
  if (!args.schema) return text as unknown as T;
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  const candidate = jsonStart >= 0 ? text.slice(jsonStart, jsonEnd + 1) : text;
  let parsed: unknown;
  try { parsed = JSON.parse(candidate); } catch { throw new Error("ai cli: response not JSON: " + text.slice(0, 200)); }
  return args.schema.parse(parsed);
}

let chain: Promise<unknown> = Promise.resolve();
export function aiCallSerial<T>(args: AiCallArgs<T>): Promise<T> {
  const next = chain.then(() => aiCall(args));
  chain = next.catch(() => {});
  return next;
}
