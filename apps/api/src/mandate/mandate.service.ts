import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';

import { AmlService } from '../aml/aml.service';
import { deriveMandate } from '../transactions/domain/legal-basis';
import { nextMandateStatus } from '../transactions/domain/state';
import type {
  MandateRecord,
  MandateRepository,
  OrderRepository,
  PricingPort,
  SignatureProvider,
} from '../transactions/domain/ports';
import type { MandateTerms } from '../transactions/domain/types';
import { ORDER_REPOSITORY, PRICING_PORT } from '../orders/orders.service';

export const MANDATE_REPOSITORY = Symbol('MANDATE_REPOSITORY');
export const SIGNATURE_PROVIDER = Symbol('SIGNATURE_PROVIDER');

@Injectable()
export class MandateService {
  private readonly log = new Logger(MandateService.name);

  constructor(
    @Inject(MANDATE_REPOSITORY) private readonly mandates: MandateRepository,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRICING_PORT) private readonly pricing: PricingPort,
    @Inject(SIGNATURE_PROVIDER) private readonly signatures: SignatureProvider,
    @Optional()
    @Inject(forwardRef(() => AmlService))
    private readonly aml?: AmlService,
  ) {}

  async create(orderId: string, terms: MandateTerms): Promise<MandateRecord> {
    const order = await this.orders.get(orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (!order.propertyId) {
      throw new BadRequestException(
        `Order ${orderId} is listing-rooted; mandates require an owner property fascicolo`,
      );
    }

    const legalBasis: Record<string, ReturnType<PricingPort['legalBasisOf']>> = {};
    for (const code of order.itemCodes) legalBasis[code] = this.pricing.legalBasisOf(code);

    const derivation = deriveMandate(order.itemCodes, legalBasis);

    return this.mandates.create({
      orderId,
      propertyId: order.propertyId,
      derivation,
      terms,
    });
  }

  async get(id: string): Promise<MandateRecord> {
    const mandate = await this.mandates.get(id);
    if (!mandate) throw new NotFoundException(`Mandate ${id} not found`);
    return mandate;
  }

  async requestSignature(
    id: string,
    signer: { email: string; documentUrl: string },
  ): Promise<{ signingUrl: string }> {
    const mandate = await this.get(id);
    const canProceed =
      mandate.reviewRequiredItems.length === 0 && mandate.types.length >= 1;
    if (!canProceed) {
      throw new ConflictException(
        `Mandate ${id} has unresolved legal-basis items: ${mandate.reviewRequiredItems.join(', ')}`,
      );
    }

    const nextStatus = nextMandateStatus(mandate.status, 'SEND', { canProceed });

    const envelope = await this.signatures.createEnvelope({
      mandateId: id,
      signerEmail: signer.email,
      documentUrl: signer.documentUrl,
    });

    await this.mandates.attachEnvelope(id, envelope.envelopeId, envelope.signingUrl);
    await this.mandates.setStatus(id, nextStatus);

    return { signingUrl: envelope.signingUrl };
  }

  async onSignatureCompleted(envelopeId: string, signedAt: string): Promise<void> {
    const mandate = await this.mandates.findByEnvelope(envelopeId);
    if (!mandate) throw new NotFoundException(`No mandate for envelope ${envelopeId}`);
    if (mandate.status === 'SIGNED') return;
    const nextStatus = nextMandateStatus(mandate.status, 'SIGN');
    await this.mandates.markSigned(mandate.id, signedAt);
    await this.mandates.setStatus(mandate.id, nextStatus);

    if (this.aml) {
      try {
        await this.aml.openForMandate({
          propertyId: mandate.propertyId,
          ownerRef: `property:${mandate.propertyId}:owner`,
          fullName: `Owner ${mandate.propertyId.slice(0, 8)}`,
          countryCode: 'IT',
        });
      } catch (err) {
        this.log.warn(
          `KYC open on mandate sign failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
}
