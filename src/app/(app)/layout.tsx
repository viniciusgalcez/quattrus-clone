import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { auth } from "@/lib/auth";
import { MobileSidebarToggle } from "@/components/layout/MobileSidebarToggle";
import { ScrollToTop } from "@/components/ScrollToTop";

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
    <div
      data-theme={theme}
      data-density={density}
      // `h-dvh` (not `h-screen`/implicit 100vh) so the shell tracks the
      // *visual* viewport on mobile browsers: `fixed inset-0` alone sizes to
      // the layout viewport, which stays at the browser-chrome-collapsed
      // height even while the address bar is showing, pushing the header
      // above the visible fold — mobile users then land on a page with no
      // way back to the sidebar.
      className="app-theme fixed inset-0 z-0 flex h-dvh min-h-0 overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink-900)]"
    >
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
        <ScrollToTop />
        <main className="app-main min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
