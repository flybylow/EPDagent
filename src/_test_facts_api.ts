/**
 * HTTP smoke test for Facts API + CORS (dev server on :3000).
 * Usage: npm run dev   # other terminal
 *        npm run test:facts-api
 */
const BASE = process.env.EPDAGENT_TEST_BASE ?? "http://localhost:3000";
const ROCKWOOL = encodeURIComponent(
  "B-EPD_023.0011.007-02.00.00 Rockwool Rockfit Mono EN - signed"
);
const TABULAS_ORIGIN = "http://localhost:3001";

let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL ${msg}`);
    failed++;
  } else {
    console.log(`OK   ${msg}`);
  }
}

async function get(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, init);
}

async function main(): Promise<void> {
  try {
    const health = await get("/api/epds");
    if (!health.ok) {
      console.error(`Server not reachable at ${BASE} (${health.status}). Run: npm run dev`);
      process.exitCode = 1;
      return;
    }
  } catch (e) {
    console.error(`Cannot reach ${BASE}. Run: npm run dev\n`, e);
    process.exitCode = 1;
    return;
  }

  const preflight = await get(`/api/facts/${ROCKWOOL}`, {
    method: "OPTIONS",
    headers: { Origin: TABULAS_ORIGIN, "Access-Control-Request-Method": "GET" },
  });
  assert(preflight.status === 204, "OPTIONS preflight 204");
  assert(
    preflight.headers.get("Access-Control-Allow-Origin") === TABULAS_ORIGIN,
    "CORS allow-origin for Tabulas dev"
  );

  const facts = await get(`/api/facts/${ROCKWOOL}?parts=thermal,lca`, {
    headers: { Origin: TABULAS_ORIGIN },
  });
  assert(facts.ok, "GET facts 200");
  assert(
    facts.headers.get("Access-Control-Allow-Origin") === TABULAS_ORIGIN,
    "GET facts CORS header"
  );
  const body = (await facts.json()) as {
    thermal?: { properties: unknown[] };
    lca?: { indicators: Record<string, unknown> };
  };
  assert((body.thermal?.properties?.length ?? 0) > 0, "facts thermal slice");
  assert(Object.keys(body.lca?.indicators ?? {}).length > 0, "facts lca slice");

  const types = await get("/api/products/types", {
    headers: { Origin: TABULAS_ORIGIN },
  });
  assert(types.ok, "GET products/types");
  const typeList = (await types.json()) as { types: { id: string; count: number }[] };
  assert(typeList.types.some((t) => t.id === "insulation" && t.count > 0), "insulation type listed");

  const catalog = await get("/api/products?type=insulation&hints=1&limit=10", {
    headers: { Origin: TABULAS_ORIGIN },
  });
  assert(catalog.ok, "GET products type=insulation");
  const cat = (await catalog.json()) as {
    schema: string;
    products: { stem: string; calculator_hints?: { thermal?: unknown } }[];
  };
  assert(cat.schema === "epdagent.product-catalog.v2", "catalog v2");
  assert(cat.products.length > 0, "insulation catalog not empty");
  assert(
    cat.products.some((p) => p.stem.includes("Rockwool")),
    "catalog includes Rockwool"
  );
  assert(
    cat.products.some((p) => p.calculator_hints?.thermal != null),
    "hints include thermal"
  );

  const calc = await get(
    `/api/facts/${ROCKWOOL}?parts=calculator`,
    { headers: { Origin: TABULAS_ORIGIN } }
  );
  assert(calc.ok, "GET facts calculator part");
  const calcBody = (await calc.json()) as { calculator?: { thermal?: { lambda_W_mK?: number } } };
  assert(calcBody.calculator?.thermal?.lambda_W_mK != null, "facts calculator lambda");

  console.log(failed ? `\n${failed} failed` : "\nFacts API smoke tests passed");
  process.exitCode = failed ? 1 : 0;
}

main();
