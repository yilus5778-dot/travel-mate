import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const output = join(root, ".output");
const dist = join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(output, "server"), join(dist, "server"), { recursive: true });
await cp(join(output, "public"), join(dist, "public"), { recursive: true });

const clientAssets = await readdir(join(output, "public", "assets"));
const clientScripts = clientAssets.filter(
  (name) => name.startsWith("index-") && name.endsWith(".js"),
);

if (clientScripts.length !== 1) {
  throw new Error(`Expected one client script, found ${clientScripts.length}`);
}

const clientAssetPath = `/assets/${clientScripts[0]}`;
const clientScript = (
  await readFile(join(output, "public", "assets", clientScripts[0]), "utf8")
)
  .replaceAll(
    "import.meta.resolve?import.meta.resolve(e):new URL(e,import.meta.url).href",
    "new URL(e,document.baseURI).href",
  )
  .replaceAll("</script", "<\\/script");

if (clientScript.includes("import.meta")) {
  throw new Error("Client bundle still contains import.meta and cannot be inlined");
}
const preloadTag = `<link rel="modulepreload" href="${clientAssetPath}"/>`;
const externalScriptTag = `<script type="module" async="" src="${clientAssetPath}"></script>`;

const sitesEntry = `import worker from "./index.mjs";

const CLIENT_SCRIPT = ${JSON.stringify(clientScript)};
const PRELOAD_TAG = ${JSON.stringify(preloadTag)};
const EXTERNAL_SCRIPT_TAG = ${JSON.stringify(externalScriptTag)};

export default {
  ...worker,
  async fetch(request, env, context) {
    const response = await worker.fetch(request, env, context);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return response;

    const baseHtml = (await response.text())
      .replace(PRELOAD_TAG, "")
      .replace(EXTERNAL_SCRIPT_TAG, "");
    const bodyCloseIndex = baseHtml.lastIndexOf("</body>");
    if (bodyCloseIndex === -1) return response;

    const inlineClient = \`<script>\${CLIENT_SCRIPT}</script>\`;
    const html =
      baseHtml.slice(0, bodyCloseIndex) +
      inlineClient +
      baseHtml.slice(bodyCloseIndex);
    const headers = new Headers(response.headers);
    headers.delete("content-length");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
`;

await writeFile(join(dist, "server", "index.js"), sitesEntry);
