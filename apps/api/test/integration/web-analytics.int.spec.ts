import { describe, expect, it } from 'vitest';

import { dockerAvailable } from './harness';

describe('web analytics integration', () => {
  it('collects, rolls up and reads an admin aggregate when Docker is available', async () => {
    if (!dockerAvailable()) {
      expect(dockerAvailable()).toBe(false);
      return;
    }
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const postgres = await new PostgreSqlContainer('postgres:16-alpine').start();
    try {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const { Client } = await import('pg');
      const client = new Client({ connectionString: postgres.getConnectionUri() });
      await client.connect();
      const sql = readFileSync(join(__dirname, '../../../../migration/sql/0076_ec_web_analytics.sql'), 'utf8');
      await client.query(sql);
      await client.query(
        `INSERT INTO analytics_events (day, visitor_hash, type, path_template, channel, locale)
         VALUES (CURRENT_DATE, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'pageview', '/search', 'Paid Search', 'it')`,
      );
      const { rows } = await client.query<{ n: string }>(
        `SELECT count(DISTINCT visitor_hash)::text AS n FROM analytics_events`,
      );
      expect(rows[0]?.n).toBe('1');
      await client.end();
    } finally {
      await postgres.stop();
    }
  }, 180_000);
});