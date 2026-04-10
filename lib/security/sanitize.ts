export function sanitizeString(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim();
}
