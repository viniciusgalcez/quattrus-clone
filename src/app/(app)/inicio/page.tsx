import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function StartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  redirect(session.user.startPage ?? "/");
}
