import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { normalizeProfilePermissions } from "@/lib/profile-permissions";

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        const user = await prisma.user.findUnique({ where: { username } });
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;

        // Re-read role/active from the DB on every request instead of
        // trusting the JWT (which can be up to 30 days stale) — a role
        // change or deactivation must take effect on the very next request,
        // not the next login. The proxy checks `active` and signs the user
        // out if it's false.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, active: true, accessProfile: { select: { permissions: true } } },
        });
        session.user.role = dbUser?.role ?? token.role as string;
        session.user.active = dbUser?.active ?? false;
        session.user.permissions = normalizeProfilePermissions(dbUser?.accessProfile?.permissions);
      }
      return session;
    },
  },
});
