import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans" dir="rtl">
      <Header />

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto px-6 py-12 w-full animate-in fade-in duration-700">
        {children}
      </main>

    </div>
  );
}
