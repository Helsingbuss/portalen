// src/components/AdminMenu.tsx
import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import Icon from "./Icon";

type Props = {
  active?: string;
};

export default function AdminMenu({ active }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const isOpen = (menu: string) => openMenu === menu;

  const groupBtn =
    "flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-[#f2f6f9] hover:text-[#194C66] transition";

  const subLink =
    "block px-2 py-1.5 text-[12.5px] text-gray-700 hover:bg-[#e5eef3] hover:text-[#194C66] rounded";

  const label = "flex items-center gap-2";

  // 🔥 IKON FIX (VIKTIG)
  const Icon = ({ src }: { src: string }) => (
    <img
      src={src}
      alt=""
      className="w-[18px] h-[18px]"
      style={{ filter: "brightness(0) saturate(100%) invert(20%)" }}
    />
  );

  return (
    <aside className="fixed top-[60px] left-0 w-[260px] h-[calc(100vh-60px)] bg-white border-r border-gray-200 flex flex-col overflow-hidden">

      <nav className="flex-1 overflow-y-auto p-3 pr-2 space-y-1">

        {/* ÖVERSIKT */}
        <Link href="/start" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#194C66] text-white text-[13px]">
          <Icon src="/overview_vit.png" />
          Översikt
        </Link>

        {/* BESTÄLLNINGSTRAFIK */}
<div>
  <button onClick={() => toggleMenu("best")} className={groupBtn}>
    <span className={label}>
      <Icon src="/shop.svg" />
      Beställningstrafik
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("best") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("best") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* OFFERTER */}
      <div className="text-[10px] text-gray-400 mt-1">Offerter</div>
      <Link href="/admin/offers/new" className={subLink}>Skapa offert</Link>
      <Link href="/admin/offers" className={subLink}>Offertlista</Link>
      <Link href="/admin/offers/calender" className={subLink}>Offertkalender</Link>
      <Link href="/admin/prislistor/" className={subLink}>Prisregler</Link>

      {/* BOKNINGAR */}
      <div className="text-[10px] text-gray-400 mt-2">Bokningar</div>
      <Link href="/admin/bookings/new" className={subLink}>Skapa bokning</Link>
      <Link href="/admin/bookings" className={subLink}>Bokningslista</Link>
      <Link href="/admin/bookings/calendar" className={subLink}>Bokningskalender</Link>

      {/* KÖRORDER & KÖRNINGAR */}
      <div className="text-[10px] text-gray-400 mt-2">Körorder & körningar</div>
      <Link href="/admin/orders/new" className={subLink}>Skapa körorder</Link>
      <Link href="/admin/orders" className={subLink}>Kommande körningar</Link>
      <Link href="/admin/avvikelser" className={subLink}>Avvikelser</Link>

    </div>
  )}
</div>

        {/* RESOR - SUNDRA */}
<div>
  <button onClick={() => toggleMenu("resor")} className={groupBtn}>
    <span className={label}>
      <Icon src="/sundra_icon.svg" />
      Resor - Sundra
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("resor") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("resor") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* RESOR */}
      <div className="text-[10px] text-gray-400 mt-1">Resor</div>
      <Link href="/admin/sundra/resor/new" className={subLink}>Skapa resa</Link>
      <Link href="/admin/sundra/resor" className={subLink}>Reselista</Link>

      {/* AVGÅNGAR */}
      <div className="text-[10px] text-gray-400 mt-2">Avgångar</div>
      <Link href="/admin/sundra/avgangar" className={subLink}>Alla avgångar</Link>
      <Link href="/admin/sundra/avgangar/new" className={subLink}>Skapa avgång</Link>
      <Link href="/admin/sundra/avgangar/kapacitet" className={subLink}>Kapacitet / beläggning</Link>
      <Link href="/admin/sundra/scanner" className={subLink}>SCANNER</Link>
      <Link href="/admin/sundra/scans" className={subLink}>Scanhistorik</Link>

      {/* NÄT & HÅLLPLATSER */}
      <div className="text-[10px] text-gray-400 mt-2">Nät & hållplatser</div>
      <Link href="/admin/sundra/tidtabeller" className={subLink}>Tidtabeller</Link>
      <Link href="/admin/sundra/linjer" className={subLink}>Linjer</Link>
      <Link href="/admin/sundra/hallplatser" className={subLink}>Hållplatser</Link>

      {/* BILJETTER & KUNDER */}
      <div className="text-[10px] text-gray-400 mt-2">Biljetter & kunder</div>
      <Link href="/admin/sundra/biljetter" className={subLink}>Biljetter</Link>
      <Link href="/admin/sundra/passagerare" className={subLink}>Passagerare</Link>
      <Link href="/admin/sundra/aterbetalningar" className={subLink}>Återbetalningar</Link>
      <Link href="/admin/sundra/avbokningar" className={subLink}>Avbokningar</Link>

      {/* Fordon & platskartor */}
      <div className="text-[10px] text-gray-400 mt-2">Fordon & platskartor</div>
      <Link href="/admin/sundra/busskartor" className={subLink}>Platskartor</Link>
      <Link href="/admin/sundra/fordon/new" className={subLink}>Lägg till fordon</Link>
      <Link href="/admin/sundra/fordon" className={subLink}>Fordonslista</Link>

      {/* KAMPANJER */}
      <div className="text-[10px] text-gray-400 mt-2">Kampanjer</div>
      <Link href="/admin/sundra/kampanjer" className={subLink}>Kampanjer & rabatter</Link>

    </div>
  )}
</div>

        {/* BUTIK */}
        <Link href="/admin/store" className={groupBtn}>
          <span className={label}>
            <Icon src="/shop.svg" />
            Butik / kassa
            <span className="ml-1 text-[9px] bg-[#194C66] text-white px-1.5 py-0.5 rounded">
              BUTIK
            </span>
          </span>
        </Link>

        {/* FLYGBUSS - AIRPORT SHUTTLE */}
<div>
  <button onClick={() => toggleMenu("flygbuss")} className={groupBtn}>
    <span className={label}>
      <Icon src="/H_icon.png" />
      Flygbuss - Airport Shuttle
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("flygbuss") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("flygbuss") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* RUTTER */}
      <div className="text-[10px] text-gray-400 mt-1">Rutter</div>
      <Link href="#" className={subLink}>Skapa rutt</Link>
      <Link href="#" className={subLink}>Ruttlista</Link>

      {/* AVGÅNGAR */}
      <div className="text-[10px] text-gray-400 mt-2">Avgångar</div>
      <Link href="#" className={subLink}>Alla avgångar</Link>
      <Link href="#" className={subLink}>Skapa avgång</Link>

      {/* NÄT & HÅLLPLATSER */}
      <div className="text-[10px] text-gray-400 mt-2">Nät & hållplatser</div>
      <Link href="#" className={subLink}>Tidtabeller</Link>
      <Link href="#" className={subLink}>Linjer</Link>
      <Link href="#" className={subLink}>Hållplatser</Link>

      {/* BILJETTER & KUNDER */}
      <div className="text-[10px] text-gray-400 mt-2">Biljetter & kunder</div>
      <Link href="#" className={subLink}>Biljetter</Link>
      <Link href="#" className={subLink}>Passagerare</Link>
      <Link href="#" className={subLink}>Återbetalningar</Link>
      <Link href="#" className={subLink}>Avbokningar</Link>

      {/* KAMPANJER */}
      <div className="text-[10px] text-gray-400 mt-2">Kampanjer</div>
      <Link href="#" className={subLink}>Kampanjer & rabatter</Link>

    </div>
  )}
</div>
       {/* KUNDER (CRM) */}
<div>
  <button onClick={() => toggleMenu("crm")} className={groupBtn}>
    <span className={label}>
      <Icon src="/users-alt.svg" />
      Kunder (CRM)
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("crm") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("crm") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* KUNDREGISTER */}
      <Link href="/admin/customers" className={subLink}>
        Kundregister
      </Link>

      {/* AVTAL */}
      <Link href="#" className={subLink}>Avtal & kundpriser</Link>

      {/* KONTAKTER */}
      <Link href="#" className={subLink}>Kontakter & noteringar</Link>

      {/* KOMMUNIKATION */}
      <Link href="#" className={subLink}>Kommunikation (Mail/SMS-logg)</Link>

    </div>
  )}
</div>

        {/* OPERATÖRER & PARTNERS */}
<div>
  <button onClick={() => toggleMenu("operators")} className={groupBtn}>
    <span className={label}>
      <Icon src="/people-network-partner.svg" />
      Operatörer & partners
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("operators") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("operators") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* OPERATÖRER */}
      <div className="text-[10px] text-gray-400 mt-1">Operatörer</div>
      <Link href="#" className={subLink}>Operatörsregister</Link>
      <Link href="#" className={subLink}>Fordon per operatör</Link>
      <Link href="#" className={subLink}>Avtal & dokument</Link>
      <Link href="#" className={subLink}>Kvalitet / uppföljning</Link>

      {/* ÖVRIGA PARTNERS */}
      <div className="text-[10px] text-gray-400 mt-2">Övriga partners</div>
      <Link href="#" className={subLink}>Hotell & boenden</Link>
      <Link href="#" className={subLink}>Leverantörer</Link>
      <Link href="#" className={subLink}>Samarbeten / partnerskap</Link>

    </div>
  )}
</div>

        {/* FORDON & DOKUMENT */}
<div>
  <button onClick={() => toggleMenu("fleet")} className={groupBtn}>
    <span className={label}>
      <Icon src="/car-bus.svg" />
      Fordon & dokument
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("fleet") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("fleet") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* FORDON */}
      <div className="text-[10px] text-gray-400 mt-1">Fordon</div>
      <Link href="#" className={subLink}>Flotta</Link>
      <Link href="#" className={subLink}>Fordonsstatus / checklistor</Link>

      {/* UNDERHÅLL */}
      <div className="text-[10px] text-gray-400 mt-2">Underhåll</div>
      <Link href="#" className={subLink}>Service & besiktning</Link>
      <Link href="#" className={subLink}>Skador & incidenter</Link>

      {/* AVTAL */}
      <div className="text-[10px] text-gray-400 mt-2">Avtal</div>
      <Link href="#" className={subLink}>Försäkring & leasing</Link>

      {/* DOKUMENT */}
      <div className="text-[10px] text-gray-400 mt-2">Dokument</div>
      <Link href="#" className={subLink}>Dokument & tillstånd</Link>

      {/* MILJÖ & DRIFT */}
      <div className="text-[10px] text-gray-400 mt-2">Miljö & drift</div>
      <Link href="#" className={subLink}>Bränsle & miljö</Link>

    </div>
  )}
</div>

        {/* PERSONAL */}
<div>
  <button onClick={() => toggleMenu("staff")} className={groupBtn}>
    <span className={label}>
      <Icon src="/users-alt.svg"/>
      Personal
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("staff") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("staff") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* ANSTÄLLDA */}
      <div className="text-[10px] text-gray-400 mt-1">Anställda</div>
      <Link href="#" className={subLink}>Lägg till anställd</Link>
      <Link href="#" className={subLink}>Lista över anställda</Link>
      <Link href="#" className={subLink}>Chaufförer</Link>

      {/* SCHEMA */}
      <div className="text-[10px] text-gray-400 mt-2">Schemaläggning</div>
      <Link href="#" className={subLink}>Schema</Link>

      {/* TID */}
      <div className="text-[10px] text-gray-400 mt-2">Tid & rapportering</div>
      <Link href="#" className={subLink}>Tidrapportering</Link>

    </div>
  )}
</div>

       {/* LÖN */}
<div>
  <button onClick={() => toggleMenu("salary")} className={groupBtn}>
    <span className={label}>
      <Icon src="/payroll-calendar.svg"/>
      Lön
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("salary") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("salary") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* LÖNEKÖRNING */}
      <div className="text-[10px] text-gray-400 mt-1">Lönekörning</div>
      <Link href="#" className={subLink}>Skapa lönekörning</Link>
      <Link href="#" className={subLink}>Pågående löner</Link>
      <Link href="#" className={subLink}>Historik</Link>

      {/* TID */}
      <div className="text-[10px] text-gray-400 mt-2">Tid & underlag</div>
      <Link href="#" className={subLink}>Tidrapporter</Link>
      <Link href="#" className={subLink}>Godkänn tider</Link>
      <Link href="#" className={subLink}>Frånvaro</Link>

      {/* ERSÄTTNINGAR */}
      <div className="text-[10px] text-gray-400 mt-2">Ersättningar</div>
      <Link href="#" className={subLink}>OB / tillägg</Link>
      <Link href="#" className={subLink}>Traktamente</Link>
      <Link href="#" className={subLink}>Bonus / provision</Link>

      {/* LÖNEUNDERLAG */}
      <div className="text-[10px] text-gray-400 mt-2">Löneunderlag</div>
      <Link href="#" className={subLink}>Lönebesked</Link>
      <Link href="#" className={subLink}>Export till bokföring</Link>

      {/* INSTÄLLNINGAR */}
      <div className="text-[10px] text-gray-400 mt-2">Inställningar</div>
      <Link href="#" className={subLink}>Lönearter</Link>
      <Link href="#" className={subLink}>Timlön / månadslön</Link>
      <Link href="#" className={subLink}>Skatter & regler</Link>

    </div>
  )}
</div>

        {/* EKONOMI */}
<div>
  <button onClick={() => toggleMenu("economy")} className={groupBtn}>
    <span className={label}>
      <Icon src="/refund-alt.svg"/>
      Ekonomi
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("economy") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("economy") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* ÖVERSIKT */}
      <div className="text-[10px] text-gray-400 mt-1">Översikt</div>
      <Link href="#" className={subLink}>Ekonomiöversikt</Link>
      <Link href="#" className={subLink}>Resultat & nyckeltal</Link>

      {/* INTÄKTER */}
      <div className="text-[10px] text-gray-400 mt-2">Intäkter & utgifter</div>
      <Link href="#" className={subLink}>Intäkter & utgifter</Link>
      <Link href="#" className={subLink}>Budget & prognos</Link>

      {/* FAKTURERING */}
      <div className="text-[10px] text-gray-400 mt-2">Fakturering</div>
      <Link href="#" className={subLink}>Fakturor</Link>
      <Link href="#" className={subLink}>Krediteringar</Link>
      <Link href="#" className={subLink}>Påminnelser</Link>

      {/* BETALNINGAR */}
      <div className="text-[10px] text-gray-400 mt-2">Betalningar</div>
      <Link href="#" className={subLink}>Utbetalningar</Link>
      <Link href="#" className={subLink}>Avräkning</Link>

      {/* RESKONTRA */}
      <div className="text-[10px] text-gray-400 mt-2">Reskontra</div>
      <Link href="#" className={subLink}>Kundreskontra</Link>
      <Link href="#" className={subLink}>Leverantörsreskontra</Link>

      {/* AVSTÄMNING */}
      <div className="text-[10px] text-gray-400 mt-2">Avstämning</div>
      <Link href="#" className={subLink}>Sundra</Link>
      <Link href="#" className={subLink}>Shuttle</Link>
      <Link href="#" className={subLink}>Beställningstrafik</Link>

      {/* EXPORT */}
      <div className="text-[10px] text-gray-400 mt-2">Export & underlag</div>
      <Link href="#" className={subLink}>Bokföring</Link>
      <Link href="#" className={subLink}>Moms</Link>

    </div>
  )}
</div>

        {/* RAPPORTER & ANALYS */}
<div>
  <button onClick={() => toggleMenu("reports")} className={groupBtn}>
    <span className={label}>
      <Icon src="/financial-analysis.svg"/>
      Rapporter & analys
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("reports") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("reports") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* FÖRSÄLJNING */}
      <div className="text-[10px] text-gray-400 mt-1">Försäljning</div>
      <Link href="#" className={subLink}>Sålda biljetter</Link>
      <Link href="#" className={subLink}>Intäktsrapport</Link>

      {/* RAPPORTER */}
      <div className="text-[10px] text-gray-400 mt-2">Rapporter</div>
      <Link href="#" className={subLink}>Agentrapport</Link>
      <Link href="#" className={subLink}>Förarrapport</Link>
      <Link href="#" className={subLink}>Operatörsrapport</Link>

      {/* DRIFT */}
      <div className="text-[10px] text-gray-400 mt-2">Drift</div>
      <Link href="#" className={subLink}>Beläggning & kapacitet</Link>

      {/* KUNDER */}
      <div className="text-[10px] text-gray-400 mt-2">Kunder</div>
      <Link href="#" className={subLink}>Kundanalys</Link>

      {/* SAMMANFATTNING */}
      <div className="text-[10px] text-gray-400 mt-2">Sammanfattning</div>
      <Link href="#" className={subLink}>Per vecka</Link>
      <Link href="#" className={subLink}>Per månad</Link>
      <Link href="#" className={subLink}>Per produkt</Link>

    </div>
  )}
</div>

        {/* SYSTEM / INSTÄLLNINGAR */}
<div>
  <button onClick={() => toggleMenu("system")} className={groupBtn}>
    <span className={label}>
      <Icon src="/operating-system-upgrade.svg" />
      System / inställningar
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("system") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("system") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* ANVÄNDARE */}
      <div className="text-[10px] text-gray-400 mt-1">Användare</div>
      <Link href="#" className={subLink}>Roller & behörigheter</Link>

      {/* NOTISER */}
      <div className="text-[10px] text-gray-400 mt-2">Kommunikation</div>
      <Link href="#" className={subLink}>Notiser & mallar</Link>

      {/* INTEGRATIONER */}
      <div className="text-[10px] text-gray-400 mt-2">Integrationer</div>
      <Link href="#" className={subLink}>Betalning</Link>
      <Link href="#" className={subLink}>E-post</Link>
      <Link href="#" className={subLink}>Bokföring</Link>
      <Link href="#" className={subLink}>Kartor</Link>

      {/* API */}
      <div className="text-[10px] text-gray-400 mt-2">API & utvecklare</div>
      <Link href="#" className={subLink}>API-nycklar</Link>
      <Link href="#" className={subLink}>Webhookar</Link>
      <Link href="#" className={subLink}>Dokumentation</Link>

      {/* SÄKERHET */}
      <div className="text-[10px] text-gray-400 mt-2">Säkerhet</div>
      <Link href="#" className={subLink}>Inloggningar & sessioner</Link>
      <Link href="#" className={subLink}>Åtkomstlogg</Link>

      {/* SYSTEM */}
      <div className="text-[10px] text-gray-400 mt-2">System</div>
      <Link href="#" className={subLink}>Systemstatus</Link>
      <Link href="#" className={subLink}>Auditlogg</Link>

      {/* DATA */}
      <div className="text-[10px] text-gray-400 mt-2">Data</div>
      <Link href="#" className={subLink}>Backup & återställning</Link>
      <Link href="#" className={subLink}>Export / import</Link>

    </div>
  )}
</div>

      </nav>

      {/* FOOTER */}
      <div className="p-3 border-t">
        <Link href="#" className="flex items-center gap-2 text-[12px] text-gray-600 hover:text-[#194C66]">
          <Icon src="/H_icon.png" />
          Feedback och förslag
        </Link>
      </div>
    </aside>
  );
}
