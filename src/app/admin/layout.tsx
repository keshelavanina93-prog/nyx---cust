import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requireUser } from "@/lib/org";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.isSuperadmin) redirect("/");
  const locale = await getLocale();
  return (
    <AdminShell userEmail={user.email} locale={locale}>
      {children}
    </AdminShell>
  );
}
