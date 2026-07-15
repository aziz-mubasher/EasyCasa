import { Controller, Get } from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';
import { Public } from '../auth/public.decorator';

@Controller()
export class TaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Public() @Get('categories')
  categories() { return this.taxonomy.listCategories(); }

  @Public() @Get('regions')
  regions() { return this.taxonomy.listRegions(); }
}
