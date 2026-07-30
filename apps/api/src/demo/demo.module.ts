import { Module } from '@nestjs/common';

import { SearchModule } from '../search/search.module';
import { DemoListingSink } from './seed/demo-listing.sink';
import { DemoScenarioSeeder } from './seed/seed-scenarios';

@Module({
  imports: [SearchModule],
  providers: [DemoListingSink, DemoScenarioSeeder],
  exports: [DemoListingSink, DemoScenarioSeeder],
})
export class DemoModule {}
