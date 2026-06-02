import keytar from "keytar";

const SERVICE = "mast";

export async function readSecrets(): Promise<Record<string, string>> {
  const creds = await keytar.findCredentials(SERVICE);
  const out: Record<string, string> = {};
  for (const { account, password } of creds) out[account] = password;
  return out;
}

export async function writeSecrets(s: Record<string, string>): Promise<void> {
  for (const [k, v] of Object.entries(s)) {
    if (!v) await keytar.deletePassword(SERVICE, k);
    else await keytar.setPassword(SERVICE, k, v);
  }
}

export async function getSecret(name: string): Promise<string | null> {
  return keytar.getPassword(SERVICE, name);
}
