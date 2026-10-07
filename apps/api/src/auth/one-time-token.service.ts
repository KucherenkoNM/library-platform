import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class OneTimeTokenService {
  create(expiresInMinutes: number): { rawToken: string; tokenHash: string; expiresAt: Date } {
    const rawToken = randomBytes(32).toString('base64url');
    return {
      rawToken,
      tokenHash: this.hash(rawToken),
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    };
  }

  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
