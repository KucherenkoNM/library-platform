export function readCookie(header: string | undefined, name: string): string | null {
  if (header === undefined) return null;

  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) {
      return decodeURIComponent(rawValue.join('='));
    }
  }

  return null;
}
