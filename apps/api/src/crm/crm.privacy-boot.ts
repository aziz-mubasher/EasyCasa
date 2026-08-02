import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';

import { PersonalDataRegistry } from '../privacy/personal-data.registry';
import { DsarService } from '../privacy/dsar.service';
import { ErasureService } from '../privacy/erasure.service';
import { CrmPersonalDataSource } from './crm.personal-data';

/** Registers CRM as a PersonalDataSource after PrivacyModule boots. */
@Injectable()
export class CrmPrivacyBoot implements OnModuleInit {
  constructor(
    private readonly source: CrmPersonalDataSource,
    @Optional() @Inject(PersonalDataRegistry) private readonly registry?: PersonalDataRegistry,
    @Optional() private readonly dsar?: DsarService,
    @Optional() private readonly erasure?: ErasureService,
  ) {}

  onModuleInit(): void {
    if (!this.registry) return;
    this.registry.register(this.source);
    this.dsar?.bind(this.registry);
    this.erasure?.bind(this.registry);
  }
}
