import "@/server/db/env-loader";

import {
  db,
  systemDb,
  TenantScopeError,
  withTenant,
} from "@/server/db";
import { logActivity } from "@/server/services/activity";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface TokenFile {
  ownerA: { token: string; organizationId: string; organizationSlug: string };
  ownerB: { token: string; organizationId: string; organizationSlug: string };
}

function loadTokenFile(): TokenFile {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), "prisma/.test-tokens.json"), "utf8"),
  );
}

async function expectThrows(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    if (error instanceof TenantScopeError) {
      console.log(`PASS: ${label} -> TenantScopeError`);
      return;
    }
    throw error;
  }
  throw new Error(`FAIL: ${label} did not throw TenantScopeError`);
}

async function main() {
  const tokens = loadTokenFile();
  const orgAId = tokens.ownerA.organizationId;
  const orgBId = tokens.ownerB.organizationId;

  await expectThrows("unscoped findMany on ActivityLog", () =>
    db.activityLog.findMany(),
  );

  await expectThrows("unscoped create on ActivityLog", () =>
    db.activityLog.create({
      data: {
        action: "evil.create",
        organizationId: "000000000000000000000000",
      },
    }),
  );

  await expectThrows("unscoped updateMany on OrganizationMember", () =>
    db.organizationMember.updateMany({ data: {} }),
  );

  const spoofed = await withTenant(orgAId, () =>
    db.activityLog.create({
      data: {
        organizationId: orgBId,
        action: "test.spoofed_organization_id",
        level: "AUDIT",
      },
    }),
  );
  if (spoofed.organizationId !== orgAId) {
    throw new Error(
      `FAIL: scope override did not apply (expected ${orgAId}, got ${spoofed.organizationId})`,
    );
  }
  console.log(
    "PASS: creating a row for org B inside org A scope is forced back to org A",
  );

  const aRows = await withTenant(orgAId, () =>
    db.activityLog.findMany({ select: { organizationId: true } }),
  );
  if (aRows.some((row) => row.organizationId !== orgAId)) {
    throw new Error("FAIL: org A scoped read returned foreign rows");
  }
  console.log(`PASS: org A scoped read returned ${aRows.length} rows, all org A`);

  const bRows = await withTenant(orgBId, () =>
    db.activityLog.findMany({ select: { organizationId: true } }),
  );
  if (bRows.some((row) => row.organizationId !== orgBId)) {
    throw new Error("FAIL: org B scoped read returned foreign rows");
  }
  console.log(`PASS: org B scoped read returned ${bRows.length} rows, all org B`);

  const aHasBMarker = aRows.length > 0 && bRows.length > 0;
  if (!aHasBMarker) {
    throw new Error("FAIL: expected activity rows in both orgs (run db:seed)");
  }

  const bRowsAll = await withTenant(orgBId, () =>
    db.activityLog.findMany({ take: 1 }),
  );
  if (bRowsAll.length === 0) {
    throw new Error("FAIL: expected activity rows in org B (run db:seed)");
  }
  const foreignId = bRowsAll[0].id;
  const leaked = await withTenant(orgAId, () =>
    db.activityLog.findFirst({ where: { id: foreignId } }),
  );
  if (leaked) {
    throw new Error("FAIL: org A read an org B row by id");
  }
  console.log(
    "PASS: reading an org B row by id inside org A scope returns null",
  );

  await withTenant(orgAId, () =>
    db.activityLog.deleteMany({ where: { action: "test.spoofed_organization_id" } }),
  );

  await expectThrows("unscoped findMany on CrmLead", () =>
    db.crmLead.findMany(),
  );

  const crmA = await withTenant(orgAId, () =>
    db.crmLead.findMany({ select: { organizationId: true } }),
  );
  if (crmA.some((row) => row.organizationId !== orgAId)) {
    throw new Error("FAIL: org A crmLead read returned foreign rows");
  }
  console.log(`PASS: org A crmLead read returned ${crmA.length} rows, all org A`);

  const bLead = await withTenant(orgBId, () =>
    db.crmLead.findFirst({ select: { id: true } }),
  );
  if (bLead) {
    const leakedCrm = await withTenant(orgAId, () =>
      db.crmLead.findFirst({ where: { id: bLead.id } }),
    );
    if (leakedCrm) {
      throw new Error("FAIL: org A read an org B lead by id");
    }
    console.log(
      "PASS: reading an org B CrmLead by id inside org A scope returns null",
    );
  } else {
    console.log("SKIP: org B has no leads to cross-check");
  }

  await expectThrows("unscoped findMany on Usage", () =>
    db.usage.findMany(),
  );
  await expectThrows("unscoped create on SubscriptionEvent", () =>
    db.subscriptionEvent.create({
      data: {
        organizationId: "000000000000000000000000",
        type: "CREATED",
      },
    }),
  );

  const usageA = await withTenant(orgAId, () =>
    db.usage.create({
      data: {
        organizationId: orgAId,
        metric: "LEADS",
        quantity: 1,
        periodStart: new Date(),
      },
    }),
  );
  const crossUsage = await withTenant(orgBId, () =>
    db.usage.findUnique({ where: { id: usageA.id } }),
  );
  if (crossUsage) {
    throw new Error("FAIL: org B read an org A Usage row by id");
  }
  console.log(
    "PASS: reading an org A Usage row by id inside org B scope returns null",
  );
  await withTenant(orgAId, () =>
    db.usage.deleteMany({ where: { id: usageA.id } }),
  );

  const eventA = await withTenant(orgAId, () =>
    db.subscriptionEvent.create({
      data: {
        organizationId: orgAId,
        type: "STATE_CHANGED",
        toState: "ACTIVE",
      },
    }),
  );
  const crossEvent = await withTenant(orgBId, () =>
    db.subscriptionEvent.findUnique({ where: { id: eventA.id } }),
  );
  if (crossEvent) {
    throw new Error("FAIL: org B read an org A SubscriptionEvent row by id");
  }
  console.log(
    "PASS: reading an org A SubscriptionEvent row by id inside org B scope returns null",
  );
  await withTenant(orgAId, () =>
    db.subscriptionEvent.deleteMany({ where: { id: eventA.id } }),
  );

  const systemCount = await systemDb.activityLog.count();
  console.log(`PASS: system (unscoped) access works, ${systemCount} activity rows total`);

  await logActivity(orgAId, {
    action: "test.scope_check_passed",
    actorId: null,
    level: "AUDIT",
  });
  console.log("PASS: all tenant scope checks passed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
