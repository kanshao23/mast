import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { writeSecrets } from "../lib/secrets/keychain";

async function main() {
  const legacy = resolve(homedir(), ".local/share/mast/secrets.json");
  if (existsSync(legacy)) {
    const data = JSON.parse(readFileSync(legacy, "utf8"));
    await writeSecrets(data);
    unlinkSync(legacy);
    console.log("migrated", Object.keys(data).length, "secrets to keychain");
  } else {
    console.log("no legacy secrets file");
  }
}
main().catch(e => { console.error(e); process.exit(1); });
