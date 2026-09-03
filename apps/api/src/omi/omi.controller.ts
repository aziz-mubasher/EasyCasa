import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../auth/public.decorator';
import { OmiBandService } from './omi-band.service';
import { OmiZoneService } from './omi-zone.service';

class ResolveAddressDto {
  @IsString()
  address!: string;
}

@Controller('omi')
export class OmiController {
  constructor(
    private readonly zones: OmiZoneService,
    private readonly bands: OmiBandService,
  ) {}

  /** EC-S-T08 — point → OMI zone (GiST on omi_zone_polygons). */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('zone')
  async zone(
    @Query('lat') latRaw: string,
    @Query('lng') lngRaw: string,
  ) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { zone: null };
    }
    return { zone: await this.zones.zoneFromPoint(lng, lat) };
  }

  /** EC-S-T08 — address → geocode → zone. Never blocks the seller on miss. */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('resolve')
  async resolve(@Body() body: ResolveAddressDto) {
    const coords = await this.zones.geocodeAddress(body.address);
    const zone = coords ? await this.zones.zoneFromPoint(coords.lng, coords.lat) : null;
    return { zone, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
  }

  /** EC-S-T09 — OMI €/m² band for a zone. */
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('band')
  async band(
    @Query('zoneId') zoneId: string,
    @Query('propertyType') propertyType = 'apartment',
    @Query('condition') condition?: string,
  ) {
    if (!zoneId?.trim()) return { band: null };
    return {
      band: await this.bands.bandForZone({
        zoneId: zoneId.trim(),
        propertyType,
        condition: condition ?? null,
      }),
    };
  }
}
