// src/pages/example.tsx
import Image from "next/image";

export default function Example() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-[#194C66] h-[60px] flex items-center px-6 shadow z-50">
        <Image
          src="/vit_logo.png"
          alt="Helsingbuss"
          width={222}
          height={40}
          priority
        />
      </header>

      {/* Content */}
      <main className="flex-1 pt-[60px]">
        {/* Omslagsbild */}
        <div className="max-w-5xl mx-auto px-6 mt-6">
          <div className="relative w-full h-[280px] rounded-lg overflow-hidden shadow">
            <Image
              src="/innebild.png"
              alt="Omslagsbild"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
          {/* Brödsmulor */}
          <nav className="text-sm text-gray-500">
            Offert Besvarad » <span className="font-medium">HB25007</span>
          </nav>

          {/* Titel */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-[#0f172a]">
              Offertförfrågan (HB25007)
            </h1>
            <p className="text-blue-700 font-medium">Status: Besvarad</p>
          </div>

          {/* Välkomsttext */}
          <h2 className="text-lg font-semibold text-center text-[#194C66]">
            Vi har rattat ihop ditt erbjudande – dags att titta på färdplanen.
          </h2>

          {/* Kort: Offert- & kundinformation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Offertinformation */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-semibold text-lg mb-4">Offertinformation</h2>
              <p><strong>Offertnummer:</strong> HB25007</p>
              <p><strong>Offertdatum:</strong> 2025-01-25</p>
              <p><strong>Er referens:</strong> Förnamn Efternamn</p>
              <p><strong>Vår referens:</strong> Helsingbuss</p>
              <p><strong>Fakturareferens:</strong> -</p>
              <p>
                <strong>Betalningsvillkor:</strong>{" "}
                <a href="#" className="underline text-[#194C66]">Klicka här</a>
              </p>
            </div>

            {/* Kundinformation */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-semibold text-lg mb-4">Kundinformation</h2>
              <p><strong>Kundnummer:</strong> 123456</p>
              <p><strong>Kund:</strong> Förnamn Efternamn</p>
              <p><strong>Adress:</strong> Testadress 21B, 123 45 Teststad</p>
              <p><strong>Telefon:</strong> 010-405 38 38</p>
            </div>
          </div>

          {/* Resekort */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-semibold text-lg mb-4">Din reseinformation</h2>
            <p><strong>Bussresa inom Sverige</strong></p>
            <p>45 Passagerare</p>
            <p>Avgång: 2025-02-10, kl 08:00</p>
            <p>Från: Helsingborg</p>
            <p>Till: Stockholm</p>
            <p className="mt-4"><strong>Övrigt:</strong> Kunden önskar plats för extra bagage.</p>
          </div>

          {/* Resans kostnad */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h2 className="font-semibold text-lg mb-4">Resans kostnad</h2>
            <p>1 st á: X XXX kr</p>
            <p>Pris exkl. moms: X XXX kr</p>
            <p>Moms: X XXX kr</p>
            <p className="font-bold mt-2">Totalt: X XXX kr</p>
          </div>

          {/* Call to actions */}
          <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
            <button className="bg-[#194C66] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#163b4d]">
              Boka
            </button>
            <button className="bg-yellow-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-600">
              Ändra din offert
            </button>
            <button className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700">
              Avböj
            </button>
          </div>

          {/* Footer */}
          <div className="text-center space-y-6 mt-10">
            <div className="flex flex-col items-center">
              <Image src="/print_icon.png" alt="Skriv ut" width={40} height={40} />
              <p className="mt-2 text-sm text-gray-700">Visa i utskriftsformat</p>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Genom att acceptera denna offert bekräftar ni samtidigt att ni tagit del av våra resevillkor...
            </p>

            <div className="text-sm text-gray-700 space-x-2">
              <a href="#" className="underline">Resevillkor</a> |
              <a href="#" className="underline"> Busstyper</a> |
              <a href="#" className="underline"> FAQ</a> |
              <a href="#" className="underline"> Integritetspolicy</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
