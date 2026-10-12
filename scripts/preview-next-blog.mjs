import { cp, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const blog = fileURLToPath(new URL("../next-blog/", import.meta.url));
const exported = join(blog, "out");
// Copy generated pages and assets beside the source for the root Live Server.
// Source directories and configuration files are never overwritten.
const allowedDirectories = new Set(["_next", "posts", "404", "_not-found"]);
for (const entry of await readdir(exported, { withFileTypes: true })) {
  if (entry.isDirectory() ? allowedDirectories.has(entry.name) : /\.(html|txt)$/.test(entry.name)) {
    await cp(join(exported, entry.name), join(blog, entry.name), { recursive: true });
  }
}
console.log("Live Server preview ready at /next-blog/");
