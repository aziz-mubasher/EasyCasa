import type { Banks4AllVerifyOutcome } from './types';

/**
 * Partner verify against Banks4All B4A-1.
 * Fail soft on the submit path — never throw for network/5xx.
 */
export interface Banks4AllPort {
  verify(token: string): Promise<Banks4AllVerifyOutcome>;
}

export const BANKS4ALL_PORT = Symbol('BANKS4ALL_PORT');
