import { AdminSidebar } from "@/components/AdminSidebar";
import { ensureSeedData } from "@/lib/ensure-seed";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureSeedData();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
