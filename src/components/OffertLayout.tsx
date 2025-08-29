import Image from "next/image";
import Link from "next/link";

interface OffertLayoutProps {
  children: React.ReactNode;
  title: string; // Ex. "Tack för din offertförfrågan..."
  breadcrumbs: string[]; // Ex. ["Inkommen Offert", "Offert Besvarad", "Offert Godkänd"]
}

export default function OffertLayout({ children, title, breadcrumbs }: OffertLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f5f4f0] flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-[60px] bg-[#194C66] flex items-center justify-between px-6 shadow z-50">
        {/* Logo */}
        <div className="flex items-center">
          <Image
            src="/vit_logo.png"
            alt="Helsingbuss"
            width={222}
            height={40}
            priority
          />
        </div>
        {/* Stäng-knapp (om man vill lägga till i framtiden) */}
        <button className="text-white text-sm border border-white px-3 py-1 rounded hover:bg-white hover:text-[#194C66] transition">
          Stäng
        </button>
      </header>

      {/* Content wrapper */}
      <main className="flex-1 pt-[80px] pb-12">
        {/* Cover Image */}
        <div className="relative max-w-5xl h-[360px] mb-8 mx-auto rounded-xl overflow-hidden shadow">
          <Image
            src="/innebild.png" // omslagsbild
            alt="Omslagsbild"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Breadcrumbs */}
        <div className="max-w-5xl mx-auto mb-4 text-sm text-gray-600 flex gap-2 justify-center">
          {breadcrumbs.map((step, index) => (
            <span key={index} className="flex items-center">
              {step}
              {index < breadcrumbs.length - 1 && (
                <span className="mx-2 text-gray-400">»</span>
              )}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-center text-lg font-semibold text-[#194C66] mb-6">
          {title}
        </h1>

        {/* Page content */}
        <div className="max-w-5xl mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-gray-600 px-4 py-6 space-y-2">
        <div>
          Genom att acceptera denna offert bekräftar ni samtidigt att ni tagit del
          av våra resevillkor. Observera att vi reserverar oss för att det aktuella
          datumet kan vara fullbokat. Slutlig kapacitet kontrolleras vid
          bokningstillfället och bekräftas först genom en skriftlig
          bokningsbekräftelse från oss.
        </div>
        <div>
          Vill du boka resan eller har du frågor och synpunkter? Kontakta oss –
          vi hjälper dig gärna. Våra ordinarie öppettider är vardagar 08:00–17:00.
          För akuta ärenden med kortare varsel än två arbetsdagar ring vår jour på 010-777 21 58.
        </div>
        <div className="flex justify-center gap-4 text-[#194C66] font-medium">
          <Link href="#">Resevillkor</Link>
          <Link href="#">Busstyper</Link>
          <Link href="#">FAQ</Link>
          <Link href="#">Integritetspolicy</Link>
        </div>
      </footer>
    </div>
  );
}
