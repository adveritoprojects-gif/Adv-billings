export const BILLING_ERRORS = {
  subscriptionMissing: "billing.errors.subscriptionMissing",
  subscriptionReadOnly: "billing.errors.subscriptionReadOnly",
  subscriptionExpired: "billing.errors.subscriptionExpired",
  subscriptionSuspended: "billing.errors.subscriptionSuspended",
  userLimit: "billing.errors.userLimit",
  leadLimit: "billing.errors.leadLimit",
  customerLimit: "billing.errors.customerLimit",
  projectLimit: "billing.errors.projectLimit",
  storageLimit: "billing.errors.storageLimit",
  moduleNotInPlan: "billing.errors.moduleNotInPlan",
  forbidden: "billing.errors.forbidden",
  planUnavailable: "billing.errors.planUnavailable",
  generic: "billing.errors.generic",
} as const;

export type BillingErrorKey =
  (typeof BILLING_ERRORS)[keyof typeof BILLING_ERRORS];

export class BillingError extends Error {
  readonly errorKey: string;

  constructor(errorKey: string, message?: string) {
    super(message ?? errorKey);
    this.name = "BillingError";
    this.errorKey = errorKey;
  }
}

export function isBillingError(error: unknown): error is BillingError {
  return error instanceof BillingError;
}
