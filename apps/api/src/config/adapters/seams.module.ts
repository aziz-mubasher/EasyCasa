import { Module } from '@nestjs/common';

import { AmlAdapter } from './aml.adapter';
import { MeiliAdapter } from './meili.adapter';
import { NotificationsAdapter } from './notifications.adapter';
import { PspAdapter } from './psp.adapter';
import { RliAdapter } from './rli.adapter';
import { SdiAdapter } from './sdi.adapter';
import { SignatureAdapter } from './signature.adapter';

const ADAPTERS = [
  PspAdapter,
  SdiAdapter,
  AmlAdapter,
  RliAdapter,
  SignatureAdapter,
  NotificationsAdapter,
  MeiliAdapter,
];

@Module({ providers: ADAPTERS, exports: ADAPTERS })
export class SeamsModule {}

export const SEAM_ADAPTERS = ADAPTERS;
