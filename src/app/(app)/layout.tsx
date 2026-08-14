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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isManager={isManager} isAdmin={isAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <Header user={session?.user}>
          <MobileSidebarToggle>
            <Sidebar isManager={isManager} isAdmin={isAdmin} className="flex" />
          </MobileSidebarToggle>
        </Header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
