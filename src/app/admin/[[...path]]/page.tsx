import { staffNavigation, recordScope, can } from "@/modules/access/policy";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/security";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/site";
import { Admin, Login } from "@/components/admin";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const s = await siteSettings();
  return {
    title: { absolute: `Pracovný priestor | ${s.brand}` },
    robots: { index: false, follow: false },
  };
}
export default async function AdminPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const settings = await siteSettings();
  const user = await currentUser();
  if (!user) return <Login brand={settings.brand} />;
  const { path = [] } = await params;
  const resource = path[0] ?? "dashboard";
  const allowed = staffNavigation(user.role);
  if (path.length > 1 || !allowed.includes(resource)) notFound();
  const owned = recordScope(user);
  const [properties, leads, newLeads] = await Promise.all([
    can(user.role, "properties", "read")
      ? db.property.count({ where: owned })
      : 0,
    can(user.role, "leads", "read") ? db.lead.count({ where: owned }) : 0,
    can(user.role, "leads", "read")
      ? db.lead.count({ where: { ...owned, status: "NEW" } })
      : 0,
  ]);
  return (
    <Admin
      key={resource}
      brand={settings.brand}
      user={{ id: user.id, name: user.name, role: user.role }}
      resource={resource}
      stats={{ properties, leads, newLeads }}
    />
  );
}
