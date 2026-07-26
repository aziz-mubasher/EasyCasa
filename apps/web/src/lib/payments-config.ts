export function paymentsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';
}

export function stripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
}
