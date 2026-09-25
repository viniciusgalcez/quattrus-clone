import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { auth } from "@/lib/auth";
import { MobileSidebarToggle } from "@/components/layout/MobileSidebarToggle";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isManager = session?.user.role === "GESTOR" || session?.user.role === "ADMIN";
  const isAdmin = session?.user.role === "ADMIN";
  const [preference, account] = session?.user.id
    ? await Promise.all([
      prisma.userPreference.findUnique({ where: { userId: session.user.id }, select: { theme: true, density: true } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUpdatedAt: true } }),
    ])
    : [null, null];
  const theme = preference?.theme === "light" ? "light" : "dark";
  const density = preference?.density === "compact" ? "compact" : "comfortable";

  return (
    <div data-theme={theme} data-density={density} className="app-theme flex h-dvh min-h-dvh overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink-900)]">
      <Sidebar isManager={isManager} isAdmin={isAdmin} permissions={session?.user.permissions ?? []} />
      {/* min-w-0 overrides the flex-item default (min-width: auto), which
          otherwise lets a wide child (table, chart) force this column — and
          the whole page — to overflow horizontally instead of scrolling
          internally. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header user={session?.user ? { ...session.user, avatarUpdatedAt: account?.avatarUpdatedAt } : undefined}>
          <MobileSidebarToggle>
            <Sidebar isManager={isManager} isAdmin={isAdmin} permissions={session?.user.permissions ?? []} className="flex" />
          </MobileSidebarToggle>
        </Header>
        <main className="app-main min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
