import Sidebar from "@/components/sidebar";
import Providers from "@/components/providers";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-6 pt-20 md:pt-8 md:p-8 max-w-5xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </Providers>
  );
}
