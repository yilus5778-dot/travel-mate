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
const clientStyles = clientAssets.filter(
  (name) => name.startsWith("index-") && name.endsWith(".css"),
);

if (clientScripts.length !== 1) {
  throw new Error(`Expected one client script, found ${clientScripts.length}`);
}
if (clientStyles.length !== 1) {
  throw new Error(`Expected one client stylesheet, found ${clientStyles.length}`);
}

const clientAssetPath = `/assets/${clientScripts[0]}`;
const clientStylePath = `/assets/${clientStyles[0]}`;
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
const clientStyle = (
  await readFile(join(output, "public", "assets", clientStyles[0]), "utf8")
).replaceAll("</style", "<\\/style");
const preloadTag = `<link rel="modulepreload" href="${clientAssetPath}"/>`;
const externalScriptTag = `<script type="module" async="" src="${clientAssetPath}"></script>`;
const externalStyleTag = `<link rel="stylesheet" href="${clientStylePath}"/>`;

const sitesEntry = `import worker from "./index.mjs";

const CLIENT_SCRIPT = ${JSON.stringify(clientScript)};
const CLIENT_STYLE = ${JSON.stringify(clientStyle)};
const PRELOAD_TAG = ${JSON.stringify(preloadTag)};
const EXTERNAL_SCRIPT_TAG = ${JSON.stringify(externalScriptTag)};
const EXTERNAL_STYLE_TAG = ${JSON.stringify(externalStyleTag)};

export default {
  ...worker,
  async fetch(request, env, context) {
    const response = await worker.fetch(request, env, context);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return response;

    const baseHtml = (await response.text())
      .replace(PRELOAD_TAG, "")
      .replace(EXTERNAL_SCRIPT_TAG, "")
      .replace(EXTERNAL_STYLE_TAG, "")
      .replace(
        /<link\\b(?=[^>]*\\brel="modulepreload")(?=[^>]*\\bhref="\\/assets\\/[^"]+\\.js")[^>]*\\/?>/g,
        "",
      )
      .replace(
        /<script\\b(?=[^>]*\\btype="module")(?=[^>]*\\bsrc="\\/assets\\/[^"]+\\.js")[^>]*><\\/script>/g,
        "",
      )
      .replace(
        /<link\\b(?=[^>]*\\brel="stylesheet")(?=[^>]*\\bhref="\\/assets\\/[^"]+\\.css")[^>]*\\/?>/g,
        "",
      )
      .replaceAll("TravelMate · 捣鼓旅行", "travelmate")
      .replaceAll("TravelMate 捣鼓旅行", "travelmate")
      .replaceAll("TravelMate", "travelmate")
      .replaceAll("捣鼓旅行", "travelmate");
    const styledHtml = baseHtml.includes("<style")
      ? baseHtml
      : baseHtml.replace("</head>", \`<style>\${CLIENT_STYLE}</style></head>\`);
    const bodyCloseIndex = styledHtml.lastIndexOf("</body>");
    if (bodyCloseIndex === -1) return response;

    const inlineClient = \`<script>\${CLIENT_SCRIPT}</script>\`;
    const html =
      styledHtml.slice(0, bodyCloseIndex) +
      inlineClient +
      styledHtml.slice(bodyCloseIndex);
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

const wranglerConfigPath = join(dist, "server", "wrangler.json");
const wranglerConfig = JSON.parse(await readFile(wranglerConfigPath, "utf8"));
wranglerConfig.main = "index.js";
await writeFile(
  wranglerConfigPath,
  `${JSON.stringify(wranglerConfig, null, 2)}\n`,
);
