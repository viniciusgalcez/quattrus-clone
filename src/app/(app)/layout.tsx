import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { auth } from "@/lib/auth";
import { MobileSidebarToggle } from "@/components/layout/MobileSidebarToggle";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isManager = session?.user.role === "GESTOR" || session?.user.role === "ADMIN";
  const isAdmin = session?.user.role === "ADMIN";
  const theme = session?.user.theme ?? "dark";
  const density = session?.user.density ?? "comfortable";

  return (
    <div data-theme={theme} data-density={density} className="app-theme flex h-dvh min-h-dvh overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink-900)]">
      <Sidebar isManager={isManager} isAdmin={isAdmin} permissions={session?.user.permissions ?? []} />
      {/* min-w-0 overrides the flex-item default (min-width: auto), which
          otherwise lets a wide child (table, chart) force this column — and
          the whole page — to overflow horizontally instead of scrolling
          internally. */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header user={session?.user}>
          <MobileSidebarToggle>
            <Sidebar isManager={isManager} isAdmin={isAdmin} permissions={session?.user.permissions ?? []} className="flex" />
          </MobileSidebarToggle>
        </Header>
        <main className="app-main min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
