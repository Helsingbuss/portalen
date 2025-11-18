// src/components/OffertLayout.tsx
import Image from "next/image";

interface OffertLayoutProps {
  children: React.ReactNode;
  title: string;
  welcomeText: string;
  status?: string; // âœ… LÃ¤gg till status hÃ¤r
}

export default function OffertLayout({
  children,
  title,
  welcomeText,
  status,
}: OffertLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <header className="bg-[#194C66] text-white p-4 flex justify-between items-center fixed top-0 w-full z-50">
        <Image src="/vit_logo.png" alt="Helsingbuss" width={222} height={40} />
        <span className="text-sm">{status}</span> {/* âœ… Status syns nu */}
      </header>

      {/* Content */}
      <main className="flex-1 pt-[80px] px-6">
        {/* Omslagsbild */}
        <div className="w-full h-[400px] relative mb-6">
          <Image
            src="/innebild.png"
            alt="Omslag"
            fill
            className="object-cover rounded-lg"
          />
        </div>

        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="mb-6 text-gray-700">{welcomeText}</p>

        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 text-center py-4 text-sm text-gray-600">
        Â© Helsingbuss â€¢ KundtjÃ¤nst: info@helsingbuss.se â€¢ +46 (0)10-405 38 38
      </footer>
    </div>
  );
}

