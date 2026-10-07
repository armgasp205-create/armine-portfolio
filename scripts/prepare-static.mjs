import { copyFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, ".site-dist");
await mkdir(output, { recursive: true });
// Publish only portfolio assets, not source folders, credentials or archives.
for (const file of await readdir(root, { withFileTypes: true })) {
  if (file.isFile() && /\.(html|css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(file.name)) {
    await copyFile(join(root, file.name), join(output, file.name));
  }
}
console.log("Portfolio assets and React app are ready in .site-dist");
