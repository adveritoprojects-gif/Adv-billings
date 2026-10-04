import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ContactsList from "@/components/crm/ContactsList";
import {
  listCompanyOptions,
  listContacts,
  listMembers,
  parseCrmListParams,
} from "@/server/services/crm";
import { requirePageModule } from "@/server/auth/guards";
import { hasPermission, PERMISSIONS } from "@/server/auth/permissions";
import { getTranslations } from "next-intl/server";

interface ContactsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const ctx = await requirePageModule("crm", PERMISSIONS.CONTACTS_READ);
  const t = await getTranslations("crm");

  const query = parseCrmListParams(await searchParams);
  const members = await listMembers(ctx);
  const companies = await listCompanyOptions(ctx);
  const result = await listContacts(ctx, query, members);
  const canManage = hasPermission(
    ctx.role.key,
    ctx.permissions,
    PERMISSIONS.CONTACTS_MANAGE,
  );

  return (
    <>
      <PageBreadcrumb pageTitle={t("contacts.title")} />
      <ContactsList
        rows={result.rows}
        total={result.total}
        page={result.page}
        totalPages={result.totalPages}
        query={query}
        members={members}
        companies={companies}
        canManage={canManage}
      />
    </>
  );
}
