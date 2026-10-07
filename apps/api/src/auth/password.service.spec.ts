import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  it('hashes passwords with Argon2id and verifies them', async () => {
    const service = new PasswordService();
    const hash = await service.hash('A-strong-test-password-123!');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(service.verify(hash, 'A-strong-test-password-123!')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });
});
