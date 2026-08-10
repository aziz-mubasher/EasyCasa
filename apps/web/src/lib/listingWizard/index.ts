/**
 * Re-export wizard machine from @easycasa/shared (EC-S-T07).
 * Vitest suite stays here for apps/web discovery.
 */
export {
  WIZARD_STEPS,
  PROPERTY_TYPES,
  DraftValidationError,
  isWizardStepId,
  validateStep,
  canSubmit,
  nextStep,
  prevStep,
  deserializeDraft,
} from '@easycasa/shared';
export type {
  WizardStepId,
  PropertyType,
  BasicsFields,
  AddressFields,
  DetailsFields,
  PriceFields,
  PhotosFields,
  DescriptionFields,
  ReviewFields,
  ListingDraftPayload,
  ValidationResult,
} from '@easycasa/shared';
