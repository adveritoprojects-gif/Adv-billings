import { getTenantScope, TenantScopeError } from "./tenant";

export const TENANT_MODELS = [
  "OrganizationMember",
  "Subscription",
  "SubscriptionEvent",
  "Usage",
  "OrganizationModule",
  "Setting",
  "ActivityLog",
  "CrmLead",
  "CrmContact",
  "CrmCompany",
  "CrmCustomer",
  "CrmActivity",
  "CrmTask",
  "CrmNote",
  "CrmFollowUp",
] as const;

const TENANT_MODEL_SET: ReadonlySet<string> = new Set(TENANT_MODELS);

type OperationArgs = Record<string, unknown>;

function mergeWhere(where: unknown, organizationId: string): unknown {
  const base = (where ?? {}) as OperationArgs;
  return { ...base, organizationId };
}

function injectCreate(data: unknown, organizationId: string): unknown {
  if (Array.isArray(data)) {
    return data.map((entry) => injectCreate(entry, organizationId));
  }
  const base = { ...((data ?? {}) as OperationArgs) };
  delete base.organization;
  base.organizationId = organizationId;
  return base;
}

function scopeArgs(
  model: string,
  operation: string,
  args: OperationArgs | undefined,
  organizationId: string,
): OperationArgs | undefined {
  const next: OperationArgs = { ...(args ?? {}) };

  switch (operation) {
    case "create":
    case "createMany":
    case "createManyAndDelete":
      next.data = injectCreate(next.data, organizationId);
      return next;
    case "upsert":
      next.where = mergeWhere(next.where, organizationId);
      next.create = injectCreate(next.create, organizationId);
      return next;
    case "findUnique":
    case "findUniqueOrThrow":
    case "findFirst":
    case "findFirstOrThrow":
    case "findMany":
    case "count":
    case "aggregate":
    case "groupBy":
    case "update":
    case "updateMany":
    case "updateManyAndDelete":
    case "delete":
    case "deleteMany":
      next.where = mergeWhere(next.where, organizationId);
      return next;
    default:
      throw new TenantScopeError(model, operation);
  }
}

export function tenantEnforcementExtension() {
  return {
    query: {
      $allModels: {
        async $allOperations({
          model,
          operation,
          args,
          query,
        }: {
          model: string;
          operation: string;
          args: OperationArgs | undefined;
          query: (args?: OperationArgs) => Promise<unknown>;
        }) {
          if (!model || !TENANT_MODEL_SET.has(model)) {
            return query(args);
          }
          const scope = getTenantScope();
          if (scope?.kind === "system") {
            return query(args);
          }
          if (!scope || scope.kind !== "tenant") {
            throw new TenantScopeError(model, operation);
          }
          return query(
            scopeArgs(model, operation, args, scope.organizationId),
          );
        },
      },
    },
  };
}
