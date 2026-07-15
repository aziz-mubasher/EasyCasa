import { CreateListingDto } from './create-listing.dto';

// All fields optional for PATCH. (Partial via manual re-declare to avoid @nestjs/mapped-types dep.)
export class UpdateListingDto implements Partial<CreateListingDto> {
  title?: string;
  description?: string;
  categoryId?: string;
  regionId?: string;
  transactionType?: CreateListingDto['transactionType'];
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  features?: string[];
}
