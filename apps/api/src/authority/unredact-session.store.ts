import { Injectable } from '@nestjs/common';

/**
 * EC-14 — in-process session grants for support unredact (one record, one actor).
 * Process restart clears grants — intentional; do not persist.
 */
@Injectable()
export class UnredactSessionStore {
  /** actorUserId → set of resource keys `professional:<id>` */
  private readonly grants = new Map<string, Set<string>>();

  grant(actorUserId: string, resourceKey: string): void {
    let set = this.grants.get(actorUserId);
    if (!set) {
      set = new Set();
      this.grants.set(actorUserId, set);
    }
    set.add(resourceKey);
  }

  has(actorUserId: string, resourceKey: string): boolean {
    return this.grants.get(actorUserId)?.has(resourceKey) === true;
  }
}
