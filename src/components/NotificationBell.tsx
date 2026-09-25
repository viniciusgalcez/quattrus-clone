import Link from "next/link";
import { Bell } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function NotificationBell() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const unread = await prisma.notification.count({ where: { recipientId: userId, readAt: null } });
  return (
    <Link href="/notificacoes" title="Notificações" className="relative flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white">
      <Bell className="h-4 w-4" />
      {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}
