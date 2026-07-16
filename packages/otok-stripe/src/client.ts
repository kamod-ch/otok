import Stripe from "stripe";
import type { StripeClientConfig } from "./types.js";

export function createStripeClient(config: StripeClientConfig): Stripe {
  if (!config.secretKey) {
    throw new Error("createStripeClient requires a non-empty secretKey");
  }
  return new Stripe(config.secretKey, {
    ...(config.apiVersion ? { apiVersion: config.apiVersion } : {}),
  });
}
