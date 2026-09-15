import { describe, expect, it, vi } from 'vitest';
import { PartnersService } from './partners.service';

describe('PartnersService.routeLead', () => {
  it('does not write a lead while CORPORATE_STATE is PONTE', async () => {
    const execute = vi.fn();
    const insert = vi.fn();
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ regionId: 'r', price: '1' }]) })),
        })),
      })),
      execute,
      insert,
    };
    const svc = new PartnersService(db as never);
    const result = await svc.routeLead('L1', 'B1', 'hello', false);
    expect(result).toBeNull();
    expect(execute).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});
