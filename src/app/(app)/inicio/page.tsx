import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const START_PAGES = new Set(["/", "/metas", "/farol", "/agenda"]);

export default async function StartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const preference = await prisma.userPreference.findUnique({
    where: { userId: session.user.id },
    select: { startPage: true },
  });
  const startPage = preference?.startPage;
  redirect(startPage && START_PAGES.has(startPage) ? startPage : "/");
}
