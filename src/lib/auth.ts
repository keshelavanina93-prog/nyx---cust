import NextAuth, { type NextAuthConfig } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";

/** Adapter whose DB connection is resolved lazily (PGlite / Postgres both async to open). */
function lazyAdapter(): Adapter {
  let real: Promise<Adapter> | undefined;
  const get = () => {
    real ??= getDb().then((db) =>
      (DrizzleAdapter as unknown as (client: unknown, cfg: unknown) => Adapter)(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
        sessionsTable: schema.sessions,
        verificationTokensTable: schema.verificationTokens,
      }),
    );
    return real;
  };
  const methods = [
    "createUser",
    "getUser",
    "getUserByEmail",
    "getUserByAccount",
    "updateUser",
    "deleteUser",
    "linkAccount",
    "unlinkAccount",
    "createSession",
    "getSessionAndUser",
    "updateSession",
    "deleteSession",
    "createVerificationToken",
    "useVerificationToken",
    "getAccount",
    "createAuthenticator",
    "getAuthenticator",
    "listAuthenticatorsByUserId",
    "updateAuthenticatorCounter",
  ] as const;
  const out: Record<string, unknown> = {};
  for (const m of methods) {
    out[m] = async (...args: unknown[]) => {
      const a = await get();
      const fn = (a as unknown as Record<string, (...x: unknown[]) => unknown>)[m];
      if (!fn) throw new Error(`adapter method ${m} unavailable`);
      return fn(...args);
    };
  }
  return out as unknown as Adapter;
}

/** Dev login: never in production builds, except an explicit local e2e override (E2E_PROD_BUILD=true) that is not set on hosted environments. */
const devLoginEnabled = process.env.AUTH_DEV_LOGIN === "true" && (process.env.NODE_ENV !== "production" || process.env.E2E_PROD_BUILD === "true");

const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_RESEND_KEY) {
  providers.push(Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: process.env.AUTH_EMAIL_FROM ?? "noreply@example.com" }));
}
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }));
}
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(creds) {
        const email = String(creds?.email ?? "")
          .trim()
          .toLowerCase();
        if (!email || !email.includes("@")) return null;
        const db = await getDb();
        const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
        if (existing) return { id: existing.id, email: existing.email, name: existing.name };
        const [created] = await db.insert(schema.users).values({ email, name: email.split("@")[0], emailVerified: new Date() }).returning();
        return { id: created!.id, email: created!.email, name: created!.name };
      },
    }),
  );
}

export const authConfig: NextAuthConfig = {
  adapter: lazyAdapter(),
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", verifyRequest: "/login?sent=1", error: "/login" },
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = String(token.uid);
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export const authFeatures = {
  devLogin: devLoginEnabled,
  magicLink: !!process.env.AUTH_RESEND_KEY,
  google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
};

export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}
