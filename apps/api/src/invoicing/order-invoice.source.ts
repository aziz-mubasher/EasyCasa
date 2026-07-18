import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { apiConfig } from '../config';
import { ORDER_REPOSITORY } from '../orders/orders.service';
import type { OrderRepository } from '../transactions/domain/ports';
import type { PaymentPurpose } from '../payments/domain/types';
import { buildInvoice, IVA_STANDARD, type Invoice } from './domain/fattura';

export const INVOICE_SOURCE = Symbol('INVOICE_SOURCE');

export interface InvoiceSource {
  buildForOrder(orderId: string, purpose?: PaymentPurpose): Promise<Invoice>;
}

/**
 * Builds a FatturaPA payload from real order lines + party data.
 * Cedente = Easy Casa Ita; cessionario CF from service_orders.client_fiscal_code.
 */
@Injectable()
export class OrderInvoiceSource implements InvoiceSource {
  constructor(@Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository) {}

  async buildForOrder(
    orderId: string,
    purpose: PaymentPurpose = 'DUE_NOW',
  ): Promise<Invoice> {
    const order = await this.orders.get(orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const lines = order.lines.filter((l) => {
      if (purpose === 'PROVVIGIONE') return l.kind === 'provvigione';
      return l.kind !== 'provvigione';
    });

    if (lines.length === 0) {
      throw new NotFoundException(`No invoiceable lines for order ${orderId} (${purpose})`);
    }

    return buildInvoice({
      cedente: {
        denominazione: apiConfig.EASYCASA_DENOMINAZIONE,
        partitaIva: apiConfig.EASYCASA_PIVA,
      },
      cessionario: {
        denominazione: 'Cliente',
        ...(order.clientFiscalCode ? { codiceFiscale: order.clientFiscalCode } : {}),
        codiceDestinatario: '0000000',
      },
      operationDate: new Date().toISOString().slice(0, 10),
      lines: lines.map((l) => {
        const passthrough = l.kind === 'passthrough';
        return {
          description: l.itemCode,
          imponibileCents: l.netCents,
          ivaRate: passthrough ? 0 : IVA_STANDARD,
          ...(passthrough ? { natura: 'N2.2' } : {}),
        };
      }),
    });
  }
}
