// k6 soak test — steady modest load for 30 minutes to surface memory leaks,
// connection-pool exhaustion, and slow degradation before launch.
// Run:  BASE_URL=https://staging.easycasa.it k6 run load/k6/soak.js
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "https://staging.easycasa.it";

export const options = {
  scenarios: {
    soak: {
      executor: "constant-vus",
      vus: 25,
      duration: "30m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    // Latency must not drift upward across the soak — keep p95 flat.
    http_req_duration: ["p(95)<900"],
  },
};

export default function () {
  const paths = ["/", "/api/health", "/api/search?region=lombardia", "/sitemap.xml"];
  const p = paths[Math.floor(Math.random() * paths.length)];
  const res = http.get(`${BASE}${p}`);
  check(res, { "2xx/3xx": (r) => r.status >= 200 && r.status < 400 });
  sleep(1 + Math.random() * 2);
}
