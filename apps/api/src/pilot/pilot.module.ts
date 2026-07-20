import { Controller, Injectable, Module, Post } from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { SearchModule } from '../search/search.module';
import { DrizzleListingSink } from './seed/drizzle-listing.sink';
import { seedPilotListings } from './seed/seed';

@Controller('admin')
@Roles('admin')
class PilotAdminController {
  constructor(private readonly sink: DrizzleListingSink) {}

  /** Idempotent pilot seed — staging / day-one map data. */
  @Post('pilot/seed')
  async seed() {
    const seeded = await seedPilotListings(this.sink);
    return { seeded };
  }
}

@Injectable()
export class PilotSeedService {
  constructor(private readonly sink: DrizzleListingSink) {}

  run(): Promise<number> {
    return seedPilotListings(this.sink);
  }
}

@Module({
  imports: [SearchModule],
  controllers: [PilotAdminController],
  providers: [DrizzleListingSink, PilotSeedService],
  exports: [DrizzleListingSink, PilotSeedService],
})
export class PilotModule {}
