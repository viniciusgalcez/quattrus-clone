/** Up to two initials from a display name, for the small round avatar chip. */
export function ownerInitials(name: string): string {
  return name
    .split(/[.\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * A stable HSL color derived from the owner id, so the same person always
 * gets the same avatar color across a session without storing one. Hue only
 * varies — fixed saturation/lightness keeps every chip readable with white text.
 */
export function ownerColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 52%, 42%)`;
}
