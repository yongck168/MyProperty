import { describe, expect, it } from 'vitest';
import { normalizeMalaysianMobile } from '../app/domain/mobile';
describe('normalizeMalaysianMobile', () => {
  it.each(['018-313 8136','60183138136','+60 (18) 313-8136'])('normalizes %s', value => {
    expect(normalizeMalaysianMobile(value)).toEqual({ok:true,e164:'+60183138136',display:'+60 18-313 8136'});
  });
  it.each(['','0312345678','123','+6512345678','018ABC8136','+6012345678901'])('rejects %s', value => {
    expect(normalizeMalaysianMobile(value).ok).toBe(false);
  });
});
