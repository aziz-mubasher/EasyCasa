import type { Connection, RowDataPacket } from 'mysql2/promise';
import { config, wpTable } from '../config.js';

export interface RawPost {
  ID: number;
  post_title: string;
  post_name: string;
  post_content: string;
  post_status: string;
  post_author: number;
  post_date_gmt: string;
  post_type: string;
}

export interface RawUser {
  ID: number;
  user_email: string;
  display_name: string;
  user_nicename: string;
}

/** All meta for a post as a flat key->value record. */
export type MetaBag = Record<string, string>;

export async function fetchListings(conn: Connection): Promise<RawPost[]> {
  const [rows] = await conn.query<(RawPost & RowDataPacket)[]>(
    `SELECT ID, post_title, post_name, post_content, post_status, post_author,
            post_date_gmt, post_type
       FROM ${wpTable('posts')}
      WHERE post_type = ? AND post_status IN ('publish','draft','pending')`,
    [config.WP_LISTING_POST_TYPE],
  );
  return rows;
}

export async function fetchPostMeta(conn: Connection, postId: number): Promise<MetaBag> {
  const [rows] = await conn.query<(RowDataPacket & { meta_key: string; meta_value: string })[]>(
    `SELECT meta_key, meta_value FROM ${wpTable('postmeta')} WHERE post_id = ?`,
    [postId],
  );
  const bag: MetaBag = {};
  for (const r of rows) bag[r.meta_key] = r.meta_value;
  return bag;
}

export async function fetchUsers(conn: Connection): Promise<RawUser[]> {
  const [rows] = await conn.query<(RawUser & RowDataPacket)[]>(
    `SELECT ID, user_email, display_name, user_nicename FROM ${wpTable('users')}`,
  );
  return rows;
}

export async function fetchContent(conn: Connection): Promise<RawPost[]> {
  const [rows] = await conn.query<(RawPost & RowDataPacket)[]>(
    `SELECT ID, post_title, post_name, post_content, post_status, post_author,
            post_date_gmt, post_type
       FROM ${wpTable('posts')}
      WHERE post_type IN ('page','post') AND post_status = 'publish'`,
  );
  return rows;
}
