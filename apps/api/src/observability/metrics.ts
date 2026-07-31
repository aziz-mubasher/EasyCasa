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

/** EC-17 — WhatsApp inbound webhook. */
export const whatsappInboundReceived = new Counter({
  name: 'whatsapp_inbound_received_total',
  help: 'Inbound WhatsApp messages accepted after signature verify',
  registers: [registry],
});
export const whatsappInboundSignatureRejected = new Counter({
  name: 'whatsapp_inbound_signature_rejected_total',
  help: 'Inbound WhatsApp POSTs rejected for bad/missing signature or empty app secret',
  registers: [registry],
});
export const whatsappInboundDuplicate = new Counter({
  name: 'whatsapp_inbound_duplicate_total',
  help: 'Inbound WhatsApp messages skipped as Meta redeliveries (unique provider_message_id)',
  registers: [registry],
});
export const whatsappAutoReplySent = new Counter({
  name: 'whatsapp_auto_reply_sent_total',
  help: 'Free-form WhatsApp auto-acks sent (at most once per wa_id per 24h)',
  registers: [registry],
});
export const whatsappAutoReplySuppressed = new Counter({
  name: 'whatsapp_auto_reply_suppressed_total',
  help: 'Inbound messages where auto-reply was skipped (already replied, stop-word, or send failed)',
  labelNames: ['reason'] as const,
  registers: [registry],
});
export const whatsappInboundForwardFailed = new Counter({
  name: 'whatsapp_inbound_forward_failed_total',
  help: 'Ops email forwards that failed for inbound WhatsApp messages',
  registers: [registry],
});
