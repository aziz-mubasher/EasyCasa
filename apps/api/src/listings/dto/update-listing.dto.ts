import { CreateListingDto } from './create-listing.dto';

/** All fields optional for PATCH. */
export class UpdateListingDto implements Partial<CreateListingDto> {
  title?: string;
  description?: string;
  categoryId?: string;
  regionId?: string;
  transactionType?: CreateListingDto['transactionType'];
  transactionTypes?: CreateListingDto['transactionTypes'];
  assetClass?: CreateListingDto['assetClass'];
  propertyType?: CreateListingDto['propertyType'];
  condition?: CreateListingDto['condition'];
  financingOptions?: CreateListingDto['financingOptions'];
  leaseType?: CreateListingDto['leaseType'];
  sellerType?: CreateListingDto['sellerType'];
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  surfaceSqm?: number;
  yearBuilt?: number;
  yearRenovated?: number;
  address?: string;
  city?: string;
  province?: string;
  energyClass?: string;
  videoUrl?: string;
  latitude?: number;
  longitude?: number;
  features?: CreateListingDto['features'];
}
