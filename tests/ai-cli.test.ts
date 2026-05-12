import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

vi.mock("node:child_process", () => ({
  spawn: () => {
    const handlers: Record<string, Function[]> = {};
    const proc = {
      stdout: {
        on: (e: string, cb: Function) => {
          handlers[`stdout:${e}`] ??= [];
          handlers[`stdout:${e}`].push(cb);
        },
      },
      stderr: { on: () => {} },
      stdin: { write: () => {}, end: () => {} },
      on: (e: string, cb: Function) => {
        if (e === "close") {
          handlers[`stdout:data`]?.forEach(h => h(Buffer.from(JSON.stringify({ result: "{\"foo\":\"bar\"}" }))));
          cb(0);
        }
      },
      kill: () => {},
    };
    return proc;
  },
}));

import { aiCall } from "../src/lib/ai/cli";

describe("aiCall", () => {
  it("parses JSON response against schema", async () => {
    const r = await aiCall({
      provider: "claude",
      prompt: "say bar",
      schema: z.object({ foo: z.string() }),
    });
    expect(r.foo).toBe("bar");
  });
});
