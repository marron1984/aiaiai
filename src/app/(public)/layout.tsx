import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MobileNav } from "@/components/MobileNav";
import { ensureSeedData } from "@/lib/ensure-seed";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureSeedData();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-20 md:pb-8">
        {children}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
