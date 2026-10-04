import { AsyncLocalStorage } from "node:async_hooks";

export type TenantScope =
  | { kind: "tenant"; organizationId: string }
  | { kind: "system" };

const globalForScope = globalThis as unknown as {
  __tenantScopeStorage?: AsyncLocalStorage<TenantScope>;
};

const storage =
  globalForScope.__tenantScopeStorage ??
  new AsyncLocalStorage<TenantScope>();

globalForScope.__tenantScopeStorage = storage;

export class TenantScopeError extends Error {
  readonly model?: string;
  readonly operation?: string;

  constructor(model?: string, operation?: string) {
    super(
      model
        ? `Tenant model "${model}"${
            operation ? ` (operation: ${operation})` : ""
          } was queried outside of a tenant scope. Wrap the call in withTenant(organizationId, ...) or use systemDb for platform-level operations.`
        : "A tenant-scoped database call was made outside of a tenant scope.",
    );
    this.name = "TenantScopeError";
    this.model = model;
    this.operation = operation;
  }
}

export async function withTenant<T>(
  organizationId: string,
  fn: () => T,
): Promise<Awaited<T>> {
  if (!organizationId) {
    throw new TenantScopeError();
  }
  const scope: TenantScope = { kind: "tenant", organizationId };
  const result = await storage.run(
    scope,
    async (): Promise<Awaited<T>> => await fn(),
  );
  return result;
}

export async function withSystem<T>(fn: () => T): Promise<Awaited<T>> {
  const result = await storage.run(
    { kind: "system" },
    async (): Promise<Awaited<T>> => await fn(),
  );
  return result;
}

export function getTenantScope(): TenantScope | undefined {
  return storage.getStore();
}

export async function orgScope<T>(
  ctx: { organization: { id: string } },
  fn: () => T,
): Promise<Awaited<T>> {
  return withTenant(ctx.organization.id, fn);
}
