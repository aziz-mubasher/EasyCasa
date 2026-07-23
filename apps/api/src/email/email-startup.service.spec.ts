import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { ApiConfig } from '../config';
import { EmailStartupService } from './email-startup.service';

const base = (over: Partial<ApiConfig>): ApiConfig =>
  ({ DEV_AUTH: false, SMTP_URL: '', EMAIL_PROVIDER_URL: '', ...over }) as ApiConfig;

describe('EmailStartupService', () => {
  it('logs ERROR when production posture and email transport unset', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const svc = new EmailStartupService(base({ DEV_AUTH: false }));
    svc.onModuleInit();
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(String(errorSpy.mock.calls[0]?.[0])).toContain('EMAIL MISCONFIGURED');
    errorSpy.mockRestore();
  });

  it('is silent when DEV_AUTH=true', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const svc = new EmailStartupService(base({ DEV_AUTH: true }));
    svc.onModuleInit();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('is silent when SMTP_URL is set', () => {
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const svc = new EmailStartupService(base({ SMTP_URL: 'smtp://relay:587' }));
    svc.onModuleInit();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
