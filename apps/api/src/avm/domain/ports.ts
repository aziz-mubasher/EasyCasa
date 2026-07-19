import type { Comparable, OmiBand, PropertyType, SubjectProperty, ValuationEstimate } from './types';

/** Source of comparable price signals near a subject. */
export interface ComparablesPort {
  near(subject: SubjectProperty): Promise<Comparable[]>;
}

/** Source of the official OMI band for a zone + property type (fail-soft: null). */
export interface OmiPort {
  band(comune: string, provincia: string, type: PropertyType): Promise<OmiBand | null>;
}

/** Lead capture: record a valuation request (the funnel into the paid service). */
export interface ValuationRequestLog {
  record(input: {
    subject: SubjectProperty;
    estimate: ValuationEstimate;
    contactEmail: string | null;
    userId: string | null;
  }): Promise<{ id: string }>;
}
