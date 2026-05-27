/**
 * Product facts builder + catalog tags (no HTTP server).
 * Usage: npm run test:facts
 */
import { buildProductFacts, parseFactParts } from "../lib/facts/build";
import { pickPrimaryGwp } from "../lib/facts/lca-slice";
import { inferProductTags, recordMatchesTag } from "../lib/facts/tags";
import { loadPhase2, loadPhase3 } from "../lib/data";

const ROCKWOOL =
  "B-EPD_023.0011.007-02.00.00 Rockwool Rockfit Mono EN - signed";

let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL ${msg}`);
    failed++;
  } else {
    console.log(`OK   ${msg}`);
  }
}

// parseFactParts
const parts = parseFactParts("thermal,lca");
assert(parts.has("thermal") && parts.has("lca") && !parts.has("identity"), "parseFactParts");

// insulation tag on Rockwool
const p2 = loadPhase2(ROCKWOOL);
const p3 = loadPhase3(ROCKWOOL);
const tags = inferProductTags(p2, p3);
assert(recordMatchesTag(tags, "insulation"), "rockwool tagged insulation");
assert(tags.includes("thermal-data"), "rockwool has thermal-data tag");

// full facts
const full = buildProductFacts(ROCKWOOL, parseFactParts(null));
assert(full?.schema === "epdagent.product-facts.v1", "schema version");
assert(
  Boolean(full?.thermal?.properties?.some((r) => /λ|lambda|thermal/i.test(r.property ?? ""))),
  "thermal lambda"
);

// partial facts
const slice = buildProductFacts(ROCKWOOL, new Set(["thermal", "lca"]));
assert(slice?.identity === undefined, "partial omits identity");
assert((slice?.thermal?.properties?.length ?? 0) > 0, "partial thermal");
assert(slice?.lca?.indicators && Object.keys(slice.lca.indicators).length > 0, "partial lca");

const gwp = slice?.lca ? pickPrimaryGwp(slice.lca.indicators) : null;
assert(gwp != null && /gwp/i.test(gwp.indicator), "GWP row present");
assert(gwp?.modules?.A1 != null || gwp?.a1_a3 != null, "GWP has module values");

// unknown stem
const missing = buildProductFacts("__no_such_epd__", parseFactParts(null));
assert(missing === null, "missing stem returns null");

console.log(failed ? `\n${failed} failed` : "\nAll facts tests passed");
process.exitCode = failed ? 1 : 0;
