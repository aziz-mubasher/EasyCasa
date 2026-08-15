/** Product analytics event names — viewing funnel + Aste lead magnet (EC-21). */
export const PRODUCT_EVENTS = {
  LISTING_AVAILABILITY_SET: 'listing.availability_set',
  LISTING_AVAILABILITY_SKIPPED: 'listing.availability_skipped',
  LISTING_AVAILABILITY_EDITED: 'listing.availability_edited',
  VIEWING_PICKER_VIEWED: 'viewing.picker_viewed',
  VIEWING_PICKER_EMPTY: 'viewing.picker_empty',
  VIEWING_REQUESTED: 'viewing.requested',
  ASTE_PAGE_VIEW: 'aste.page_view',
  ASTE_SIGNUP_SUBMITTED: 'aste.signup_submitted',
  ASTE_GUIDE_OPENED: 'aste.guide_opened',
  ASTE_ANALYSIS_CREATED: 'aste.analysis_created',
  ASTE_DOCUMENT_UPLOADED: 'aste.document_uploaded',
  ASTE_ANALYSIS_SUBMITTED: 'aste.analysis_submitted',
  ASTE_ANALYSIS_DELETED: 'aste.analysis_deleted',
  ASTE_ANALYSIS_PROCESSING_STARTED: 'aste.analysis_processing_started',
  ASTE_ANALYSIS_READY: 'aste.analysis_ready',
  ASTE_ANALYSIS_FAILED: 'aste.analysis_failed',
  /** EC-24 — report surface (no document text in props). */
  ASTE_REPORT_VIEWED: 'aste.report_viewed',
  ASTE_BUYER_PROFILE_COMPLETED: 'aste.buyer_profile_completed',
  ASTE_REPORT_PRINTED: 'aste.report_printed',
  ASTE_OMI_CHECK_COMPUTED: 'aste.omi_check_computed',
  /** EC-25 — chat (category only; never question/answer text). */
  ASTE_CHAT_QUESTION_ASKED: 'aste.chat_question_asked',
  ASTE_CHAT_RATE_LIMITED: 'aste.chat_rate_limited',
  /**
   * EC-28 — Banks4All financing lane on aste reports (Phase A).
   * Props: trigger, locale, optional provincia — never analysis/user/RGE/address ids.
   */
  ASTE_FINANCING_BLOCK_SHOWN: 'aste_financing_block_shown',
  ASTE_FINANCING_CTA_CLICKED: 'aste_financing_cta_clicked',
  /** EC-27 — credit unlock + purchase (ids only; no analysis content). */
  ASTE_REPORT_UNLOCKED: 'aste.report_unlocked',
  ASTE_CREDITS_PURCHASED: 'aste.credits_purchased',
  ASTE_TEASER_VIEWED: 'aste.teaser_viewed',
} as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

export type ProductEventProps = Record<string, string | number | boolean | null | undefined>;

export interface ProductEvent {
  name: ProductEventName;
  props: ProductEventProps;
  atMs: number;
}

/** In-memory sink — tests assert against it; production logs structured JSON. */
export class ProductAnalyticsSink {
  readonly events: ProductEvent[] = [];
  private readonly max: number;

  constructor(max = 500) {
    this.max = max;
  }

  track(name: ProductEventName, props: ProductEventProps = {}, atMs = Date.now()): void {
    this.events.push({ name, props, atMs });
    if (this.events.length > this.max) this.events.shift();
  }

  clear(): void {
    this.events.length = 0;
  }

  of(name: ProductEventName): ProductEvent[] {
    return this.events.filter((e) => e.name === name);
  }
}

export const productAnalytics = new ProductAnalyticsSink();
