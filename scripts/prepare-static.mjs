import { copyFile, cp, mkdir, readdir } from "node:fs/promises";
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
await cp(join(root, "next-blog/out"), join(output, "next-blog"), { recursive: true });
try {
  await cp(join(root, "react-planner"), join(output, "react-planner"), { recursive: true });
} catch (error) {
  // CI builds React directly into .site-dist; local builds use react-planner.
  if (error.code !== "ENOENT") throw error;
}
console.log("Portfolio assets, React app and Next.js blog are ready in .site-dist");
