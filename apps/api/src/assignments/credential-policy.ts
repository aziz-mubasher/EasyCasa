import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../db/db.module';
import type { Db } from '../db/drizzle';
import { credentialPolicies } from '../db/schema';
import type { CredentialPolicyPort } from '../professionals/domain/ports';
import type { RequiredCredential } from '../professionals/domain/types';

/**
 * Default mapping of catalog items → required credential. DB overrides win;
 * unknown items fall back to NONE.
 */
export const DEFAULT_CREDENTIAL_POLICY: Record<string, RequiredCredential> = {
  FULL_MEDIATION: 'REA_MEDIATORE',
  CONFORMITY_SURVEY: 'ALBO_TECNICO',
  APE_ISSUANCE: 'APE_CERTIFIER',
  ROGITO_COORDINATION: 'NOTAIO',
  MEDIA_PACK: 'PHOTOGRAPHER',
  VIRTUAL_TOUR: 'PHOTOGRAPHER',
};

@Injectable()
export class DefaultCredentialPolicy implements CredentialPolicyPort, OnModuleInit {
  private readonly overrides = new Map<string, RequiredCredential>();

  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.overrides.clear();
    const rows = await this.db.select().from(credentialPolicies);
    for (const row of rows) {
      this.overrides.set(row.itemCode, row.requiredCredential as RequiredCredential);
    }
  }

  requiredCredentialFor(itemCode: string): RequiredCredential {
    return (
      this.overrides.get(itemCode) ??
      DEFAULT_CREDENTIAL_POLICY[itemCode] ??
      'NONE'
    );
  }

  async list(): Promise<{ itemCode: string; requiredCredential: RequiredCredential }[]> {
    const codes = new Set([
      ...Object.keys(DEFAULT_CREDENTIAL_POLICY),
      ...this.overrides.keys(),
    ]);
    return [...codes].sort().map((itemCode) => ({
      itemCode,
      requiredCredential: this.requiredCredentialFor(itemCode),
    }));
  }

  async set(itemCode: string, requiredCredential: RequiredCredential): Promise<void> {
    const existing = await this.db
      .select()
      .from(credentialPolicies)
      .where(eq(credentialPolicies.itemCode, itemCode))
      .limit(1);
    if (existing[0]) {
      await this.db
        .update(credentialPolicies)
        .set({ requiredCredential })
        .where(eq(credentialPolicies.itemCode, itemCode));
    } else {
      await this.db.insert(credentialPolicies).values({ itemCode, requiredCredential });
    }
    this.overrides.set(itemCode, requiredCredential);
  }
}
