import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const output = join(root, ".output");
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(output, "server"), join(dist, "server"), { recursive: true });
await cp(join(output, "public"), join(dist, "public"), { recursive: true });
await cp(join(output, "server", "index.mjs"), join(dist, "server", "index.js"));
