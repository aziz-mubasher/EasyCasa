/**
 * Phase 14 client surface — endpoints that close gaps for existing UIs:
 * owner property list, upload presign, and device registration.
 * (Admin list/config methods live on EasyCasaAdminApi in `admin.ts`.)
 */
import { z } from 'zod';

import { createRequester, type RequesterOptions } from './http';

export const MeOwnerPropertySchema = z.object({
  id: z.string(),
  dealType: z.enum(['sale', 'rent']),
  status: z.string(),
  title: z.string().nullable(),
  inCondominio: z.boolean(),
});
export type MeOwnerProperty = z.infer<typeof MeOwnerPropertySchema>;

export const PresignResultSchema = z.object({
  uploadUrl: z.string(),
  fileUrl: z.string(),
});
export type PresignResult = z.infer<typeof PresignResultSchema>;

export const OkSchema = z.object({ ok: z.literal(true) });

export class EasyCasaMeApi {
  private readonly request: ReturnType<typeof createRequester>;

  constructor(private readonly opts: RequesterOptions) {
    this.request = createRequester(opts);
  }

  listMyProperties(): Promise<MeOwnerProperty[]> {
    return this.request('/me/properties', z.array(MeOwnerPropertySchema));
  }

  presignUpload(body: { filename: string; contentType: string }): Promise<PresignResult> {
    return this.request('/uploads/presign', PresignResultSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  registerDevice(body: {
    token: string;
    platform: 'ios' | 'android' | 'web';
    locale: string;
  }): Promise<{ ok: true }> {
    return this.request('/me/devices', OkSchema, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
