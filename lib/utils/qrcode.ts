export function buildTableMenuUrl(baseUrl: string, tableNumber: number) {
  const url = new URL("/menu", baseUrl);
  url.searchParams.set("mesa", String(tableNumber));
  return url.toString();
}
