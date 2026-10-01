/** Next.js 16 server reference ids are exactly 42 characters. */
const SERVER_REFERENCE_ID_LENGTH = 42;

export function isValidServerActionId(id: string): boolean {
  return id.length === SERVER_REFERENCE_ID_LENGTH;
}
