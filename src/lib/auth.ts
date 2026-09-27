import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { normalizeProfilePermissions } from "@/lib/profile-permissions";

const START_PAGES = new Set(["/", "/metas", "/farol", "/agenda"]);

function normalizeStartPage(value: unknown): "/" | "/metas" | "/farol" | "/agenda" {
  return typeof value === "string" && START_PAGES.has(value)
    ? value as "/" | "/metas" | "/farol" | "/agenda"
    : "/";
}

const nextAuth = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuário", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;
        const normalizedUsername = username.trim().toLowerCase();

        // Keyed by username, not IP — the proxy in front of this app may not
        // forward a trustworthy client IP, and a per-account cap is what
        // actually stops a credential-stuffing run against one login.
        const allowed = checkRateLimit("login", normalizedUsername, {
          limit: 10,
          windowMs: 5 * 60 * 1000,
        });
        if (!allowed) {
          await recordAuditLog({
            action: "LOGIN_FAILURE",
            entity: "Authentication",
            entityId: normalizedUsername,
            details: { reason: "rate_limited" },
          });
          return null;
        }

        const user = await prisma.user.findUnique({
          relationLoadStrategy: "join",
          where: { username: normalizedUsername },
          include: { preference: { select: { startPage: true } } },
        });
        if (!user) {
          await recordAuditLog({
            action: "LOGIN_FAILURE",
            entity: "Authentication",
            entityId: normalizedUsername,
            details: { reason: "invalid_credentials" },
          });
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid || !user.active) {
          await recordAuditLog({
            userId: user.id,
            action: "LOGIN_FAILURE",
            entity: "Authentication",
            entityId: user.id,
            details: { reason: valid ? "inactive_account" : "invalid_credentials" },
          });
          return null;
        }

        await recordAuditLog({
          userId: user.id,
          action: "LOGIN_SUCCESS",
          entity: "Authentication",
          entityId: user.id,
        });

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          startPage: normalizeStartPage(user.preference?.startPage),
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username: string }).username;
        token.role = (user as { role: string }).role;
        token.startPage = normalizeStartPage(user.startPage);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
        session.user.startPage = normalizeStartPage(token.startPage);

        // Re-read role/active from the DB on every request instead of
        // trusting the JWT (which can be up to 30 days stale) — a role
        // change or deactivation must take effect on the very next protected
        // render or Server Action, not only on the next login.
        const dbUser = await prisma.user.findUnique({
          relationLoadStrategy: "join",
          where: { id: token.id as string },
          select: {
            name: true,
            role: true,
            active: true,
            avatarUpdatedAt: true,
            accessProfile: { select: { permissions: true } },
            preference: { select: { theme: true, density: true, startPage: true, showTeamReds: true } },
          },
        });
        session.user.name = dbUser?.name ?? session.user.name;
        session.user.role = dbUser?.role ?? token.role as string;
        session.user.active = dbUser?.active ?? false;
        session.user.permissions = normalizeProfilePermissions(dbUser?.accessProfile?.permissions);
        session.user.avatarUpdatedAt = dbUser?.avatarUpdatedAt?.toISOString() ?? null;
        session.user.theme = dbUser?.preference?.theme === "light" ? "light" : "dark";
        session.user.density = dbUser?.preference?.density === "compact" ? "compact" : "comfortable";
        session.user.startPage = normalizeStartPage(dbUser?.preference?.startPage ?? token.startPage);
        session.user.showTeamReds = dbUser?.preference?.showTeamReds ?? true;
      }
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

// Layouts, pages and nested Server Components frequently request the same
// session during one render. React's request-scoped cache keeps the security
// refresh above fresh on every request while avoiding duplicate DB reads
// inside that request.
const uncachedAuth = nextAuth.auth;
export const auth = cache(async () => {
  const session = await uncachedAuth();
  // The proxy only decodes the signed JWT to avoid a duplicate database hit.
  // Keep deactivation enforcement immediate at the protected data boundary.
  return session?.user.active === false ? null : session;
});
