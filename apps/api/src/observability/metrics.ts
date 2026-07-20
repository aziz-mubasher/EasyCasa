import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

/**
 * Prometheus registry + app metrics — Phase 39. A single registry so /metrics
 * exposes one coherent scrape. Default process metrics (event loop, memory, GC)
 * plus HTTP request duration/count. Phase 6 shipped the Prometheus scrape config
 * and alert rules; this is the endpoint they were always meant to scrape.
 */
export const registry = new Registry();
registry.setDefaultLabels({ app: 'easycasa-api' });
collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});
