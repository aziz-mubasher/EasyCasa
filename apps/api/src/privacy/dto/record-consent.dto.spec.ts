import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { RecordConsentDto } from './record-consent.dto';

describe('RecordConsentDto', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  async function validate(body: unknown): Promise<RecordConsentDto> {
    return pipe.transform(body, { type: 'body', metatype: RecordConsentDto });
  }

  it('accepts a valid consent payload', async () => {
    const dto = await validate({
      purpose: 'privacy_policy',
      granted: true,
      policyVersion: 'v1-draft',
    });
    expect(dto).toMatchObject({
      purpose: 'privacy_policy',
      granted: true,
      policyVersion: 'v1-draft',
    });
  });

  it('rejects unknown purposes and extra fields', async () => {
    await expect(
      validate({ purpose: 'cookies', granted: true, policyVersion: 'v1-draft' }),
    ).rejects.toThrow();
    await expect(
      validate({
        purpose: 'privacy_policy',
        granted: true,
        policyVersion: 'v1-draft',
        extra: true,
      }),
    ).rejects.toThrow();
  });

  it('rejects missing required fields', async () => {
    await expect(validate({ granted: true, policyVersion: 'v1-draft' })).rejects.toThrow();
    await expect(
      validate({ purpose: 'privacy_policy', policyVersion: 'v1-draft' }),
    ).rejects.toThrow();
  });
});
