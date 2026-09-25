/**
 * Creates exactly one ADMIN user and nothing else — no departments, no KPIs,
 * no fake measurements. This is what a fresh production database should run
 * instead of `db:seed` (which is fixture data for local development and is
 * destructive: it wipes the database first).
 *
 * Required env vars: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_NAME.
 * Idempotent: re-running it against an existing username updates the name
 * and password instead of failing, so it's safe to use for a password reset
 * too (e.g. after the first login, from a fresh shell with a new
 * ADMIN_PASSWORD).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`${name} is required. Set it in the environment before running this script.`);
  }
  return value;
}

async function main() {
  const username = requireEnv("ADMIN_USERNAME").trim().toLowerCase();
  const password = requireEnv("ADMIN_PASSWORD");
  const name = requireEnv("ADMIN_NAME").trim();

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    update: { name, passwordHash, role: "ADMIN", active: true },
    create: { username, name, passwordHash, role: "ADMIN", active: true },
  });

  console.log(`ADMIN user ready: ${user.username} (${user.name}).`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
