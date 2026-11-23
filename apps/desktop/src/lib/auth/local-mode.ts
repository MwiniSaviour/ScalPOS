export type CloudConnection = { org_id: string } | null;

export function shouldUseLocalOnly(hasLocalShop: boolean, connection: CloudConnection): boolean {
  return hasLocalShop && connection === null;
}
