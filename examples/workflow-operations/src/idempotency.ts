export class IdempotencyStore {
  private readonly map = new Map<string, { location: string; at: number }>();
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  private key(operatorId: string, idempotencyKey: string, action: string, instanceId: string): string {
    return `${operatorId}:${idempotencyKey}:${action}:${instanceId}`;
  }

  get(operatorId: string, idempotencyKey: string, action: string, instanceId: string): string | null {
    const k = this.key(operatorId, idempotencyKey, action, instanceId);
    const hit = this.map.get(k);
    if (!hit) return null;
    if (Date.now() - hit.at > this.ttlMs) {
      this.map.delete(k);
      return null;
    }
    return hit.location;
  }

  set(operatorId: string, idempotencyKey: string, action: string, instanceId: string, location: string): void {
    const k = this.key(operatorId, idempotencyKey, action, instanceId);
    this.map.set(k, { location, at: Date.now() });
  }
}
