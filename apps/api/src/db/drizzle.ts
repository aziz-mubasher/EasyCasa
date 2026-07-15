import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { apiConfig } from '../config';
import { schema } from './schema';

export const pool = new pg.Pool({ connectionString: apiConfig.DATABASE_URL });
export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export type Db = typeof db;
