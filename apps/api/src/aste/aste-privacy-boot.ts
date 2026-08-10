import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';

import { DsarService } from '../privacy/dsar.service';
import { ErasureService } from '../privacy/erasure.service';
import { PersonalDataRegistry } from '../privacy/personal-data.registry';
import { AsteAnalysesDataSource } from '../privacy/sources/aste-analyses.data-source';

/** Registers aste analyses DSAR source after PrivacyModule boots (EC-22). */
@Injectable()
export class AstePrivacyBoot implements OnModuleInit {
  constructor(
    private readonly source: AsteAnalysesDataSource,
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
