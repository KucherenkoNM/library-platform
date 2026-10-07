import { describe, expect, it } from 'vitest';
import { z } from 'zod';

describe('web environment contract', () => {
  it('requires a valid API URL', () => {
    const schema = z.object({ VITE_API_URL: z.string().url() });
    expect(schema.parse({ VITE_API_URL: 'http://localhost:3000/api/v1' }).VITE_API_URL).toContain(
      '/api/v1',
    );
  });
});
