import { Injectable, OnModuleInit } from '@nestjs/common';
import { connect } from 'node:net';

import { apiConfig } from '../config';
import type { HealthIndicator, IndicatorResult } from './health-indicator';
import { HealthIndicatorRegistry } from './health-indicator.registry';

/**
 * Redis readiness — Phase 39. When REDIS_URL is empty, report up (optional dep).
 * Otherwise open a short TCP connect to host:port (no ioredis dependency).
 */
@Injectable()
export class RedisHealthIndicator implements HealthIndicator, OnModuleInit {
  readonly name = 'redis';

  constructor(private readonly registry: HealthIndicatorRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async check(): Promise<IndicatorResult> {
    const url = apiConfig.REDIS_URL?.trim();
    if (!url) {
      return { name: this.name, up: true, detail: 'not configured' };
    }
    try {
      const parsed = new URL(url);
      const host = parsed.hostname || '127.0.0.1';
      const port = Number(parsed.port || 6379);
      await tcpReachable(host, port, 2_000);
      return { name: this.name, up: true };
    } catch (err) {
      return { name: this.name, up: false, detail: String(err) };
    }
  }
}

function tcpReachable(host: string, port: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error('timeout'));
    }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve();
    });
    socket.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
