/**
 * Tenant scoping helpers. Every tenant query MUST go through `requireOrg()` and filter by organizationId.
 */
import { and, eq, type SQL } from "drizzle-orm";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth, isSuperadminEmail } from "@/lib/auth";
import { getDb, schema } from "@/db/client";

export type Role = "owner" | "member" | "viewer";

export type OrgContext = {
  user: { id: string; email: string; name: string | null; isSuperadmin: boolean };
  org: typeof schema.organizations.$inferSelect;
  role: Role;
  ip: string | null;
  userAgent: string | null;
};

export class AccessDenied extends Error {
  constructor(msg = "access denied") {
    super(msg);
  }
}

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const db = await getDb();
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, session.user.id) });
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, isSuperadmin: u.isSuperadmin || isSuperadminEmail(u.email) };
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

async function requestMeta() {
  try {
    const h = await headers();
    return { ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null, userAgent: h.get("user-agent") };
  } catch {
    return { ip: null, userAgent: null };
  }
}

/** Resolve org by slug and verify membership. Superadmins may view any org (role=viewer unless member). */
export async function requireOrg(slug: string, allowed?: Role[]): Promise<OrgContext> {
  const user = await requireUser();
  const db = await getDb();
  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.slug, slug) });
  if (!org) redirect("/");
  const m = await db.query.memberships.findFirst({ where: and(eq(schema.memberships.organizationId, org.id), eq(schema.memberships.userId, user.id)) });
  let role: Role | null = m?.role ?? null;
  if (!role && user.isSuperadmin) role = "viewer";
  if (!role) redirect("/");
  if (allowed && !allowed.includes(role)) throw new AccessDenied(`role ${role} cannot perform this action`);
  const meta = await requestMeta();
  return { user, org, role, ...meta };
}

/** Same as requireOrg but for server actions keyed by org id. */
export async function requireOrgById(orgId: string, allowed?: Role[]): Promise<OrgContext> {
  const db = await getDb();
  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) });
  if (!org) throw new AccessDenied("org not found");
  return requireOrg(org.slug, allowed);
}

export const canEdit = (role: Role) => role === "owner" || role === "member";

/** Compose an org-scoped where clause. */
export function withOrg<T extends { organizationId: unknown }>(table: T, orgId: string, ...rest: (SQL | undefined)[]): SQL {
  return and(eq(table.organizationId as never, orgId), ...rest)!;
}

export async function listUserOrgs(userId: string) {
  const db = await getDb();
  const rows = await db
    .select({ org: schema.organizations, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.organizations, eq(schema.memberships.organizationId, schema.organizations.id))
    .where(eq(schema.memberships.userId, userId));
  return rows;
}
