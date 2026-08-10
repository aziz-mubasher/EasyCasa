import { describe, expect, it, vi } from 'vitest';
import { ConflictException, HttpException } from '@nestjs/common';

import { AsteChatService } from './aste-chat.service';

describe('AsteChatService', () => {
  it('409 when analysis not ready', async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                id: 'a1',
                userId: 'u1',
                status: 'processing',
                register: 'investor',
              },
            ]),
          })),
        })),
      })),
    };
    const service = new AsteChatService(
      db as never,
      { ASTE_CHAT_Q_PER_ANALYSIS_DAY: 20, ASTE_CHAT_Q_PER_USER_DAY: 60 } as never,
      {} as never,
      {} as never,
      { track: vi.fn() } as never,
    );
    await expect(service.ask('u1', 'a1', { question: 'Ciao?', lang: 'it' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects empty question', async () => {
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              { id: 'a1', userId: 'u1', status: 'ready', register: 'investor' },
            ]),
          })),
        })),
      })),
    };
    const service = new AsteChatService(
      db as never,
      { ASTE_CHAT_Q_PER_ANALYSIS_DAY: 20, ASTE_CHAT_Q_PER_USER_DAY: 60 } as never,
      {} as never,
      {} as never,
      { track: vi.fn() } as never,
    );
    await expect(service.ask('u1', 'a1', { question: '   ', lang: 'it' })).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});
