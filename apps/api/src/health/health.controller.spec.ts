import { describe, it, expect } from 'vitest';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports ok', () => {
    const res = new HealthController().check();
    expect(res.status).toBe('ok');
  });
});
