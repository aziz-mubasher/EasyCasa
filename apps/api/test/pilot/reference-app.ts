import { Body, Controller, Get, Module, NotFoundException, Param, Post } from '@nestjs/common';

import { EMAIL_PORT } from '../../src/email/email-port';
import { EmailService } from '../../src/email/email.service';
import { NoopEmailProvider } from '../../src/email/providers/noop-email.provider';
import { OutboxEmailProvider } from '../../src/email/providers/outbox-email.provider';
import { PILOT_LISTINGS, type PilotListing } from '../../src/pilot/seed/seed';

/**
 * Reference seeker-journey app — Phase 37.
 *
 * NOT the production modules — an executable *contract* for the pilot path:
 * search → listing → enquiry → viewing, with the exact email side-effects.
 * Real modules are held to the same journey via seeker-journey.int.spec.ts.
 */
interface Enquiry {
  id: string;
  listingId: string;
  seekerEmail: string;
  message: string;
}
interface Viewing {
  id: string;
  listingId: string;
  seekerEmail: string;
  slot: string;
  status: 'confirmed';
}

class Store {
  listings = new Map<string, PilotListing>(PILOT_LISTINGS.map((l) => [l.slug, l]));
  enquiries: Enquiry[] = [];
  viewings: Viewing[] = [];
  ownerEmail = 'agente@easycasaita.com';
  ownerName = 'Agenzia EasyCasa';
}
const store = new Store();

@Controller('search')
class SearchController {
  @Post('bounds')
  bounds(@Body() b: { minLat: number; minLng: number; maxLat: number; maxLng: number }) {
    const hits = [...store.listings.values()].filter(
      (l) =>
        l.lat >= b.minLat && l.lat <= b.maxLat && l.lng >= b.minLng && l.lng <= b.maxLng,
    );
    return {
      count: hits.length,
      results: hits.map((l) => ({ slug: l.slug, title: l.title, priceEur: l.priceEur })),
    };
  }
}

@Controller('listings')
class ListingsController {
  constructor(private readonly email: EmailService) {}

  private get(slug: string): PilotListing {
    const l = store.listings.get(slug);
    if (!l) throw new NotFoundException('listing not found');
    return l;
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.get(slug);
  }

  @Post(':slug/enquiries')
  async enquire(
    @Param('slug') slug: string,
    @Body() b: { seekerName: string; seekerEmail: string; message: string },
  ) {
    const listing = this.get(slug);
    const enquiry: Enquiry = {
      id: `enq-${store.enquiries.length + 1}`,
      listingId: slug,
      seekerEmail: b.seekerEmail,
      message: b.message,
    };
    store.enquiries.push(enquiry);
    await this.email.enquiryReceivedSeeker(b.seekerEmail, {
      seekerName: b.seekerName,
      listingTitle: listing.title,
      listingUrl: `https://easycasaita.com/listings/${listing.slug}`,
    });
    await this.email.enquiryReceivedOwner(store.ownerEmail, {
      ownerName: store.ownerName,
      seekerName: b.seekerName,
      seekerEmail: b.seekerEmail,
      listingTitle: listing.title,
      message: b.message,
    });
    return enquiry;
  }

  @Post(':slug/viewings')
  async book(
    @Param('slug') slug: string,
    @Body() b: { seekerName: string; seekerEmail: string; slot: string; whenLocal: string },
  ) {
    const listing = this.get(slug);
    const viewing: Viewing = {
      id: `vw-${store.viewings.length + 1}`,
      listingId: slug,
      seekerEmail: b.seekerEmail,
      slot: b.slot,
      status: 'confirmed',
    };
    store.viewings.push(viewing);
    await this.email.viewingConfirmed(b.seekerEmail, {
      seekerName: b.seekerName,
      listingTitle: listing.title,
      address: listing.address,
      whenLocal: b.whenLocal,
    });
    return viewing;
  }
}

export const outbox = new OutboxEmailProvider(new NoopEmailProvider());

@Module({
  controllers: [SearchController, ListingsController],
  providers: [{ provide: EMAIL_PORT, useValue: outbox }, EmailService],
})
export class ReferenceAppModule {}

export function resetStore(): void {
  store.enquiries = [];
  store.viewings = [];
  outbox.clear();
}
