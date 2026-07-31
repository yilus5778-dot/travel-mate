import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/app-model.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const model = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`
);

const vague = model.extractTravelIntent("国庆想去海边玩三天");
assert.equal(vague.destination, null);
assert.equal(vague.destinationPreference, "海边");
assert.equal(vague.durationDays, 3);
assert.equal(vague.dateText, "国庆");
assert.equal(vague.dateStatus, "approximate");
assert.deepEqual(model.getDestinationCandidates(vague.destinationPreference), [
  "厦门",
  "青岛",
  "北海",
]);

const pasted = model.extractTravelIntent("D1 抵达\nD2 海边慢游\nD3 返程");
assert.equal(pasted.looksLikeItinerary, true);
assert.equal(model.organizePastedItinerary("D1 抵达\nD2 海边慢游\nD3 返程").length, 3);

const generated = model.buildSuggestedItinerary("厦门", 3);
assert.equal(generated.length, 9);
assert.ok(generated.every((item) => item.source === "ai" && !item.confirmed));
assert.deepEqual([...new Set(generated.map((item) => item.day))], [1, 2, 3]);
assert.ok(generated.every((item) => item.time));
assert.equal(model.isMeaningfulIdea("123"), false);

console.log("Travelmate product model validation passed.");
