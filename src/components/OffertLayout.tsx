import Image from "next/image";

interface OffertLayoutProps {
  children: React.ReactNode;
  title: string;
  welcomeText?: string;
  status?: string; // ✅ vi använder detta till badge
}

export default function OffertLayout({ children, title, welcomeText, status }: OffertLayoutProps) {
  // ✅ välj färg beroende på status
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "inkommen":
        return "bg-blue-100 text-blue-800";
      case "besvarad":
        return "bg-yellow-100 text-yellow-800";
      case "godkänd":
        return "bg-green-100 text-green-800";
      case "makulerad":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#194C66] h-[60px] flex items-center px-6 shadow z-50">
        <Image src="/vit_logo.png" alt="Helsingbuss" width={222} height={40} />
      </header>

      {/* Content */}
      <main className="flex-1 pt-[60px]">
        {/* Omslagsbild */}
        <div className="relative w-full h-[300px]">
          <Image
            src="/innebild.png"
            alt="Offert"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Content box */}
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">{title}</h1>
            {status && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyles(
                  status
                )}`}
              >
                {status}
              </span>
            )}
          </div>

          {welcomeText && (
            <p className="text-lg text-gray-700 mb-8">{welcomeText}</p>
          )}

          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#194C66] text-white text-center py-4">
        © {new Date().getFullYear()} Helsingbuss AB. Alla rättigheter förbehållna.
      </footer>
    </div>
  );
}
