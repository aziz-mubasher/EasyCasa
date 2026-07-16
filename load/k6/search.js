// k6 load test — search & listings read paths (the hot paths).
// Run:  BASE_URL=https://staging.easycasa.it k6 run load/k6/search.js
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend } from "k6/metrics";

const BASE = __ENV.BASE_URL || "https://staging.easycasa.it";

const searchLatency = new Trend("search_latency", true);
const listingLatency = new Trend("listing_latency", true);

export const options = {
  scenarios: {
    // Ramp to a sustained browse load, then a short spike.
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 50 },
        { duration: "3m", target: 50 },
        { duration: "1m", target: 150 }, // spike
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    // SLOs — fail the run (and thus the CI gate) if we blow past them.
    http_req_failed: ["rate<0.01"], // <1% errors
    search_latency: ["p(95)<800"], // search under 800ms p95
    listing_latency: ["p(95)<500"], // detail under 500ms p95
    http_req_duration: ["p(99)<2000"],
  },
};

const REGIONS = ["lombardia", "toscana", "puglia", "sicilia", "veneto"];
const QUERIES = [
  "casa da ristrutturare con giardino",
  "farmhouse near lake under 150k",
  "apartment 3 bedrooms sea view",
  "commercial space city centre",
];

function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}

export default function () {
  group("keyword + facet search", () => {
    const region = pick(REGIONS);
    const res = http.get(
      `${BASE}/api/search?region=${region}&page=1&sort=relevance`,
      { tags: { name: "search" } }
    );
    searchLatency.add(res.timings.duration);
    check(res, {
      "search 200": (r) => r.status === 200,
      "search has results field": (r) => r.body && r.body.includes("results"),
    });
  });

  sleep(Math.random() * 2);

  group("natural-language / semantic search", () => {
    const res = http.post(
      `${BASE}/api/ai/search`,
      JSON.stringify({ query: pick(QUERIES), locale: "it" }),
      { headers: { "Content-Type": "application/json" }, tags: { name: "ai_search" } }
    );
    check(res, { "ai search 200/429": (r) => r.status === 200 || r.status === 429 });
  });

  sleep(Math.random() * 2);

  group("listing detail", () => {
    // Assumes a stable set of seeded staging slugs; adjust to your fixtures.
    const id = 1 + Math.floor(Math.random() * 200);
    const res = http.get(`${BASE}/api/listings/${id}`, {
      tags: { name: "listing_detail" },
    });
    listingLatency.add(res.timings.duration);
    check(res, { "listing 200/404": (r) => r.status === 200 || r.status === 404 });
  });

  sleep(Math.random() * 3);
}
