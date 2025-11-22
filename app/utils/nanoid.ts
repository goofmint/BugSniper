// Monotonic counter for collision prevention in fallback
let fallbackCounter = 0;

/**
 * Generate a unique ID similar to nanoid
 * Uses crypto.randomUUID() for better entropy
 */
export function nanoid(): string {
  // Use crypto.randomUUID() if available (modern browsers and Node.js 16+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for legacy environments: combines timestamp, counter, and multiple random segments
  // to significantly reduce collision risk even under high throughput
  fallbackCounter = (fallbackCounter + 1) % 1000000;
  const timestamp = Date.now().toString(36);
  const counter = fallbackCounter.toString(36).padStart(5, '0');
  const random1 = Math.random().toString(36).substring(2, 11);
  const random2 = Math.random().toString(36).substring(2, 11);
  return `${timestamp}-${counter}-${random1}${random2}`;
}
