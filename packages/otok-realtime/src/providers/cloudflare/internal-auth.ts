import { INTERNAL_HEADER } from "./contract.js";

export function assertInternalRequest(request: Request, secret: string): boolean {
  const header = request.headers.get(INTERNAL_HEADER);
  return Boolean(secret && header && header === secret);
}

export function internalHeaders(secret: string): HeadersInit {
  return { [INTERNAL_HEADER]: secret };
}
