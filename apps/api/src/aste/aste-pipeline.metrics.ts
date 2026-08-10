import { Counter, Histogram } from 'prom-client';

import { registry } from '../observability/metrics';

/** EC-23 — aste extraction pipeline Prometheus metrics. */
export const astePipelineStageDuration = new Histogram({
  name: 'aste_pipeline_stage_duration_seconds',
  help: 'Aste pipeline stage duration in seconds',
  labelNames: ['stage'] as const,
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry],
});

export const astePipelineFailures = new Counter({
  name: 'aste_pipeline_failures_total',
  help: 'Aste pipeline failures by stage',
  labelNames: ['stage'] as const,
  registers: [registry],
});

export const astePipelineReady = new Counter({
  name: 'aste_pipeline_ready_total',
  help: 'Analyses that reached ready',
  registers: [registry],
});

export const astePipelineFailed = new Counter({
  name: 'aste_pipeline_failed_total',
  help: 'Analyses that reached failed (exhausted retries)',
  registers: [registry],
});

export const asteOcrPages = new Counter({
  name: 'aste_ocr_pages_total',
  help: 'OCR page outcomes',
  labelNames: ['ocr_used'] as const,
  registers: [registry],
});
