/**
 * Generate a unique ID similar to nanoid
 * Uses crypto.randomUUID() for better entropy
 */
export function nanoid(): string {
  // Use crypto.randomUUID() if available (modern browsers and Node.js 16+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback: simple ID generator
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}
