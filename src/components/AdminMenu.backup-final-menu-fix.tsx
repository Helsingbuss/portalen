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

  // IKON FIX (VIKTIG)
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

        {/* Ã–VERSIKT */}
        <Link href="/start" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#194C66] text-white text-[13px]">
          <Icon src="/overview_vit.png" />
          Ã–versikt
        </Link>

        {/* BESTÃ„LLNINGSTRAFIK */}
<div>
  <button onClick={() => toggleMenu("best")} className={groupBtn}>
    <span className={label}>
      <Icon src="/shop.svg" />
      BestÃ¤llningstrafik
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
      <Link href="/admin/offers/synergybus" className={subLink}>SynergyBus</Link>
      <Link href="/admin/prislistor/" className={subLink}>Prisregler</Link>

      {/* BOKNINGAR */}
      <div className="text-[10px] text-gray-400 mt-2">Bokningar</div>
      <Link href="/admin/bookings/new" className={subLink}>Skapa bokning</Link>
      <Link href="/admin/bookings" className={subLink}>Bokningslista</Link>
      <Link href="/admin/bookings/calendar" className={subLink}>Bokningskalender</Link>

      {/* KÃ–RORDER & KÃ–RNINGAR */}
      <div className="text-[10px] text-gray-400 mt-2">KÃ¶rorder & kÃ¶rningar</div>
      <Link href="/admin/orders/new" className={subLink}>Skapa kÃ¶rorder</Link>
      <Link href="/admin/orders" className={subLink}>Kommande kÃ¶rningar</Link>
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

      {/* AVGÃ…NGAR */}
      <div className="text-[10px] text-gray-400 mt-2">AvgÃ¥ngar</div>
      <Link href="/admin/sundra/avgangar" className={subLink}>Alla avgÃ¥ngar</Link>
      <Link href="/admin/sundra/avgangar/new" className={subLink}>Skapa avgÃ¥ng</Link>
      <Link href="/admin/sundra/avgangar/kapacitet" className={subLink}>Kapacitet / belÃ¤ggning</Link>
      <Link href="/admin/sundra/scanner" className={subLink}>SCANNER</Link>
      <Link href="/admin/sundra/scans" className={subLink}>Scanhistorik</Link>

      {/* NÃ„T & HÃ…LLPLATSER */}
      <div className="text-[10px] text-gray-400 mt-2">NÃ¤t & hÃ¥llplatser</div>
      <Link href="/admin/sundra/tidtabeller" className={subLink}>Tidtabeller</Link>
      <Link href="/admin/sundra/linjer" className={subLink}>Linjer</Link>
      <Link href="/admin/sundra/hallplatser" className={subLink}>HÃ¥llplatser</Link>

      {/* BILJETTER & KUNDER */}
      <div className="text-[10px] text-gray-400 mt-2">Biljetter & kunder</div>
      <Link href="/admin/sundra/bokningar" className={subLink}>Bokningar</Link>
      <Link href="/admin/sundra/biljetter" className={subLink}>Biljetter</Link>
      <Link href="/admin/sundra/passagerare" className={subLink}>Passagerare</Link>
      <Link href="/admin/sundra/aterbetalningar" className={subLink}>Ã…terbetalningar</Link>
      <Link href="/admin/sundra/avbokningar" className={subLink}>Avbokningar</Link>

      {/* Fordon & platskartor */}
      <div className="text-[10px] text-gray-400 mt-2">Fordon & platskartor</div>
      <Link href="/admin/sundra/busskartor" className={subLink}>Platskartor</Link>
      <Link href="/admin/sundra/fordon/new" className={subLink}>LÃ¤gg till fordon</Link>
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
      <Link href="/admin/shuttle/rutter/new" className={subLink}>Skapa rutt</Link>
      <Link href="/admin/shuttle/rutter" className={subLink}>Ruttlista</Link>

      {/* AVGÃ…NGAR */}
      <div className="text-[10px] text-gray-400 mt-2">AvgÃ¥ngar</div>
      <Link href="/admin/shuttle/avgangar" className={subLink}>Alla avgÃ¥ngar</Link>
      <Link href="/admin/shuttle/avgangar/new" className={subLink}>Skapa avgÃ¥ng</Link>
       <Link href="/admin/shuttle/kapacitet" className={subLink}>Kapacitet / belÃ¤ggning</Link>
      <Link href="/admin/shuttle/scanner" className={subLink}>SCANNER</Link>
      <Link href="/admin/shuttle/scanner/historik" className={subLink}>Scanhistorik</Link>

      {/* NÃ„T & HÃ…LLPLATSER */}
      <div className="text-[10px] text-gray-400 mt-2">NÃ¤t & hÃ¥llplatser</div>
      <Link href="/admin/shuttle/tidtabeller" className={subLink}>Tidtabeller</Link>
      <Link href="/admin/shuttle/linjer" className={subLink}>Linjer</Link>
      <Link href="/admin/shuttle/hallplatser" className={subLink}>HÃ¥llplatser</Link>

      {/* BILJETTER & KUNDER */}
      <div className="text-[10px] text-gray-400 mt-2">Biljetter & kunder</div>
      <Link href="/admin/shuttle/biljetter" className={subLink}>Biljetter</Link>
      <Link href="/admin/shuttle/passagerare" className={subLink}>Passagerare</Link>
      <Link href="/admin/shuttle/aterbetalningar" className={subLink}>Ã…terbetalningar</Link>
      <Link href="/admin/shuttle/avbokningar" className={subLink}>Avbokningar</Link>

      {/* Fordon & platskartor */}
      <div className="text-[10px] text-gray-400 mt-2">Fordon & platskartor</div>
      <Link href="/admin/shuttle/platskartor" className={subLink}>Platskartor</Link>
      <Link href="/admin/shuttle/fordon/new" className={subLink}>LÃ¤gg till fordon</Link>
      <Link href="/admin/shuttle/fordon" className={subLink}>Fordonslista</Link>

      {/* HEMSIDA & INNEHÃ…LL */}
      <div className="text-[10px] text-gray-400 mt-2">Hemsida & innehÃ¥ll</div>
      <Link href="/admin/shuttle/hemsida/hero" className={subLink}>Hero & sÃ¤songsbilder</Link>
      <Link href="/admin/shuttle/hemsida/highlights" className={subLink}>Bildkort / highlights</Link>
      <Link href="/admin/shuttle/hemsida/flygplatser" className={subLink}>PopulÃ¤ra flygplatser</Link>
      <Link href="/admin/shuttle/hemsida/faq" className={subLink}>Vanliga frÃ¥gor</Link>
      <Link href="/admin/shuttle/hemsida/nyhetsbrev" className={subLink}>Nyhetsbrev</Link>

      {/* KUNDINFO */}
      <div className="text-[10px] text-gray-400 mt-2">Kundinfo</div>
      <Link href="/admin/shuttle/bagage" className={subLink}>Bagage</Link>
      <Link href="/admin/shuttle/kundservice" className={subLink}>Kundservice</Link>
      <Link href="/admin/shuttle/app" className={subLink}>App & e-biljett</Link>
      {/* HEMSIDA & INNEHÅLL */}
      <div className="text-[10px] text-gray-400 mt-2">Hemsida & innehåll</div>
      <Link href="/admin/shuttle/hemsida/hero" className={subLink}>Hero & säsongsbilder</Link>
      <Link href="/admin/shuttle/hemsida/highlights" className={subLink}>Bildkort / highlights</Link>
      <Link href="/admin/shuttle/hemsida/flygplatser" className={subLink}>Populära flygplatser</Link>
      <Link href="/admin/shuttle/hemsida/faq" className={subLink}>Vanliga frågor</Link>
      <Link href="/admin/shuttle/hemsida/nyhetsbrev" className={subLink}>Nyhetsbrev</Link>

      {/* KUNDINFO */}
      <div className="text-[10px] text-gray-400 mt-2">Kundinfo</div>
      <Link href="/admin/shuttle/bagage" className={subLink}>Bagage</Link>
      <Link href="/admin/shuttle/kundservice" className={subLink}>Kundservice</Link>
      <Link href="/admin/shuttle/app" className={subLink}>App & e-biljett</Link>

      {/* KAMPANJER */}
      <div className="text-[10px] text-gray-400 mt-2">Kampanjer</div>
      <Link href="/admin/shuttle/kampanjer" className={subLink}>Kampanjer & rabatter</Link>

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
      <Link href="/admin/crm/avtal" className={subLink}>Avtal & kundpriser</Link>

      {/* SKAPA AVTAL */}
      <Link href="/admin/crm/avtal/skapa" className={subLink}>Skapa avtal</Link>

      {/* KONTAKTER */}
      <Link href="/admin/crm/kontakter" className={subLink}>Kontakter & noteringar</Link>

      {/* KOMMUNIKATION */}
      <Link href="/admin/crm/kommunikation" className={subLink}>Kommunikation (Mail/SMS-logg)</Link>

    </div>
  )}
</div>

        {/* OPERATÃ–RER & PARTNERS */}
<div>
  <button onClick={() => toggleMenu("operators")} className={groupBtn}>
    <span className={label}>
      <Icon src="/people-network-partner.svg" />
      OperatÃ¶rer & partners
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("operators") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("operators") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* OPERATÃ–RER */}
      <div className="text-[10px] text-gray-400 mt-1">OperatÃ¶rer</div>
      <Link href="/admin/partners/operatorer" className={subLink}>OperatÃ¶rsregister</Link>
      <Link href="/admin/partners/fordon" className={subLink}>Fordon per operatÃ¶r</Link>
      <Link href="/admin/partners/avtal" className={subLink}>Avtal & dokument</Link>
      <Link href="/admin/partners/kvalitet" className={subLink}>Kvalitet / uppfÃ¶ljning</Link>

      {/* Ã–VRIGA PARTNERS */}
      <div className="text-[10px] text-gray-400 mt-2">Ã–vriga partners</div>
      <Link href="/admin/partners/hotell" className={subLink}>Hotell & boenden</Link>
      <Link href="/admin/partners/leverantorer" className={subLink}>LeverantÃ¶rer</Link>
      <Link href="/admin/partners/samarbeten" className={subLink}>Samarbeten / partnerskap</Link>

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
      <Link href="/admin/fordon/flotta" className={subLink}>Flotta</Link>
      <Link href="/admin/fordon/status" className={subLink}>Fordonsstatus / checklistor</Link>

      {/* UNDERHÃ…LL */}
      <div className="text-[10px] text-gray-400 mt-2">UnderhÃ¥ll</div>
      <Link href="/admin/fordon/service" className={subLink}>Service & besiktning</Link>
      <Link href="/admin/fordon/skador" className={subLink}>Skador & incidenter</Link>

      {/* AVTAL */}
      <div className="text-[10px] text-gray-400 mt-2">Avtal</div>
      <Link href="/admin/fordon/avtal" className={subLink}>FÃ¶rsÃ¤kring & leasing</Link>

      {/* DOKUMENT */}
      <div className="text-[10px] text-gray-400 mt-2">Dokument</div>
      <Link href="/admin/fordon/dokument" className={subLink}>Dokument & tillstÃ¥nd</Link>

      {/* MILJÃ– & DRIFT */}
      <div className="text-[10px] text-gray-400 mt-2">MiljÃ¶ & drift</div>
      <Link href="/admin/fordon/miljo" className={subLink}>BrÃ¤nsle & miljÃ¶</Link>

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

      {/* ANSTÃ„LLDA */}
      <div className="text-[10px] text-gray-400 mt-1">AnstÃ¤llda</div>
      <Link href="/admin/personal/anstallda/skapa" className={subLink}>LÃ¤gg till anstÃ¤lld</Link>
      <Link href="/admin/personal/anstallda" className={subLink}>Lista Ã¶ver anstÃ¤llda</Link>
      <Link href="/admin/personal/chaufforer" className={subLink}>ChauffÃ¶rer</Link>

      {/* SCHEMA */}
      <div className="text-[10px] text-gray-400 mt-2">SchemalÃ¤ggning</div>
      <Link href="/admin/personal/schema" className={subLink}>Schema</Link>

      {/* TID */}
      <div className="text-[10px] text-gray-400 mt-2">Tid & rapportering</div>
      <Link href="/admin/personal/tidrapportering" className={subLink}>Tidrapportering</Link>

    </div>
  )}
</div>

       {/* LÃ–N */}
<div>
  <button onClick={() => toggleMenu("salary")} className={groupBtn}>
    <span className={label}>
      <Icon src="/payroll-calendar.svg"/>
      LÃ¶n
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("salary") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("salary") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* LÃ–NEKï¿½RNING */}
      <div className="text-[10px] text-gray-400 mt-1">LÃ¶nekï¿½rning</div>
      <Link href="/admin/lon/lonekoring/skapa" className={subLink}>Skapa lÃ¶nekÃ¶rning</Link>
      <Link href="/admin/lon/lonekoring" className={subLink}>PÃ¥gÃ¥ende lÃ¶ner</Link>
      <Link href="#" className={subLink}>Historik</Link>

      {/* TID */}
      <div className="text-[10px] text-gray-400 mt-2">Tid & underlag</div>
      <Link href="#" className={subLink}>Tidrapporter</Link>
      <Link href="/admin/lon/godkann-tider" className={subLink}>GodkÃ¤nn tider</Link>
            <Link href="/admin/lon/loneunderlag" className={subLink}>LÃ¶neunderlag</Link>
            <Link href="/admin/lon/behorighet" className={subLink}>BehÃ¶righet</Link>
      <Link href="/admin/lon/franvaro" className={subLink}>FrÃ¥nvaro</Link>

      {/* ERSÃ„TTNINGAR */}
      <div className="text-[10px] text-gray-400 mt-2">ErsÃ¤ttningar</div>
      <Link href="#" className={subLink}>OB / tillÃ¤gg</Link>
      <Link href="/admin/lon/traktamente" className={subLink}>Traktamente</Link>
      <Link href="/admin/lon/bonus-provision" className={subLink}>Bonus / provision</Link>

      {/* LÃ–NEUNDERLAG */}
      <div className="text-[10px] text-gray-400 mt-2">LÃ¶neunderlag</div>
      <Link href="/admin/lon/lonebesked" className={subLink}>LÃ¶nebesked</Link>
      <Link href="/admin/lon/export" className={subLink}>Export</Link>
            <Link href="/admin/lon/bankfil" className={subLink}>Bankfil / utbetalningsunderlag</Link>
            <Link href="/admin/lon/status" className={subLink}>Exportstatus / betalstatus</Link>
            <Link href="/admin/lon/historik" className={subLink}>Historik / arkiv</Link>
            <Link href="/admin/lon/bokforing" className={subLink}>BokfÃ¶ringsexport</Link>
            <Link href="/admin/lon/swedbank" className={subLink}>Swedbank / ISO 20022</Link>

      {/* INSTÃ„LLNINGAR */}
      <div className="text-[10px] text-gray-400 mt-2">InstÃ¤llningar</div>
      <Link href="/admin/lon/lonearter" className={subLink}>LÃ¶nearter</Link>
            <Link href="/admin/lon/ob-tillagg" className={subLink}>OB/TillÃ¤gg</Link>
      <Link href="/admin/lon/lonesatser" className={subLink}>TimlÃ¶n / mÃ¥nadslÃ¶n</Link>
            <Link href="/admin/lon/bankuppgifter" className={subLink}>Bankuppgifter</Link>
      <Link href="/admin/lon/regler" className={subLink}>Skatter & regler</Link>
            <Link href="/admin/lon/skatteprofiler" className={subLink}>Skatteprofiler</Link>
            <Link href="/admin/lon/skatt-netto" className={subLink}>Skatteavdrag / nettolÃ¶n</Link>

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

      {/* Ã–VERSIKT */}
            <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ã–versikt</div>
            <Link href="/admin/ekonomi/oversikt" className={subLink}>Ekonomisk Ã–versikt</Link>
            <Link href="/admin/ekonomi/resultat-uppdrag" className={subLink}>Resultat per uppdrag</Link>
            <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Fakturering</div>
            <Link href="/admin/ekonomi/fakturor" className={subLink}>Kundfakturor</Link>
            <Link href="/admin/ekonomi/leverantorsreskontra" className={subLink}>LeverantÃ¶rsreskontra</Link>
            <Link href="/admin/ekonomi/kunder" className={subLink}>Kundregister</Link>
            <Link href="/admin/ekonomi/leverantorer" className={subLink}>LeverantÃ¶rsregister</Link>
            <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Betalningar</div>
            <Link href="/admin/ekonomi/bank" className={subLink}>Bank & betalning</Link>
            <Link href="/admin/ekonomi/betalningskontroll" className={subLink}>Betalningskontroll</Link>
            <Link href="/admin/ekonomi/avprickning" className={subLink}>Manuell avprickning</Link>
            <Link href="/admin/ekonomi/bankhandelser" className={subLink}>BankhÃ¤ndelser / import</Link>
            <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">PÃ¥minnelser</div>
            <Link href="/admin/ekonomi/betalningspaminnelser" className={subLink}>PÃ¥minnelser & betalstatus</Link>
            <Link href="/admin/ekonomi/paminnelseko" className={subLink}>Automatisk pÃ¥minnelsekÃ¶</Link>
            <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Rapporter & underlag</div>
            <Link href="/admin/ekonomi/momsrapport" className={subLink}>Momsrapport</Link>
            <Link href="/admin/ekonomi/bokforingsunderlag" className={subLink}>BokfÃ¶ringsunderlag</Link>
            <Link href="/admin/ekonomi/manadsrapport" className={subLink}>MÃ¥nadsrapport</Link>
            <Link href="/admin/ekonomi/arsoversikt" className={subLink}>ï¿½rsÃ–versikt</Link>
            <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">AvstÃ¤mning</div>
            <Link href="/admin/ekonomi/lasta-perioder" className={subLink}>LÃ¥sta perioder</Link>
            <Link href="/admin/ekonomi/avstamning/sundra" className={subLink}>Sundra</Link>
            <Link href="/admin/ekonomi/avstamning/shuttle" className={subLink}>Shuttle</Link>
            <Link href="/admin/ekonomi/avstamning/bestallningstrafik" className={subLink}>BestÃ¤llningstrafik</Link>
            <div className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Grunddata & instÃ¤llningar</div>
            <Link href="/admin/ekonomi/artiklar" className={subLink}>Artiklar</Link>
            <Link href="/admin/ekonomi/intakter-utgifter" className={subLink}>IntÃ¤kter & utgifter</Link>
            <Link href="/admin/ekonomi/moms" className={subLink}>MomsinstÃ¤llningar</Link>
            <Link href="/admin/ekonomi/installningar" className={subLink}>EkonomiinstÃ¤llningar</Link>
      {/* AVSTÃ„MNING */}
      <div className="text-[10px] text-gray-400 mt-2">AvstÃ¤mning</div>
      <Link href="#" className={subLink}>Sundra</Link>
      <Link href="#" className={subLink}>Shuttle</Link>
      <Link href="#" className={subLink}>BestÃ¤llningstrafik</Link>

      {/* EXPORT */}
      <div className="text-[10px] text-gray-400 mt-2">Export & underlag</div>
      <Link href="#" className={subLink}>BokfÃ¶ring</Link>
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

      {/* FÃ–RSÃ„LJNING */}
      <div className="text-[10px] text-gray-400 mt-1">FÃ¶rsÃ¤ljning</div>
      <Link href="/admin/rapporter-analys" className={subLink}>Ã–versikt</Link>
      <Link href="/admin/rapporter-analys/salda-biljetter" className={subLink}>SÃ¥lda biljetter</Link>
      <Link href="/admin/rapporter-analys/intaktsrapport" className={subLink}>IntÃ¤ktsrapport</Link>

      {/* RAPPORTER */}
      <div className="text-[10px] text-gray-400 mt-2">Rapporter</div>
      <Link href="/admin/rapporter-analys/agentrapport" className={subLink}>Agentrapport</Link>
      <Link href="/admin/rapporter-analys/forarrapport" className={subLink}>FÃ¶rarrapport</Link>
      <Link href="/admin/rapporter-analys/operatorrapport" className={subLink}>OperatÃ¶rsrapport</Link>

      {/* DRIFT */}
      <div className="text-[10px] text-gray-400 mt-2">Drift</div>
      <Link href="/admin/rapporter-analys/belaggning-kapacitet" className={subLink}>BelÃ¤ggning & kapacitet</Link>

      {/* KUNDER */}
      <div className="text-[10px] text-gray-400 mt-2">Kunder</div>
      <Link href="/admin/rapporter-analys/kundanalys" className={subLink}>Kundanalys</Link>

      {/* SAMMANFATTNING */}
      <div className="text-[10px] text-gray-400 mt-2">Sammanfattning</div>
      <Link href="/admin/rapporter-analys/per-vecka" className={subLink}>Per vecka</Link>
      <Link href="/admin/rapporter-analys/per-manad" className={subLink}>Per mÃ¥nad</Link>
      <Link href="/admin/rapporter-analys/per-produkt" className={subLink}>Per produkt</Link>

    </div>
  )}
</div>

        {/* SYSTEM / INSTÃ„LLNINGAR */}
<div>
  <button onClick={() => toggleMenu("system")} className={groupBtn}>
    <span className={label}>
      <Icon src="/operating-system-upgrade.svg" />
      System / instÃ¤llningar
    </span>
    <ChevronDownIcon
      className={`h-4 w-4 transition ${
        isOpen("system") ? "rotate-180" : ""
      }`}
    />
  </button>

  {isOpen("system") && (
    <div className="ml-4 mt-1 space-y-1 border-l pl-2">

      {/* ANVÃ„NDARE */}
      <div className="text-[10px] text-gray-400 mt-1">AnvÃ¤ndare</div>
      <Link href="/admin/system/roller-behorigheter" className={subLink}>Roller & behÃ¶righeter</Link>

      {/* NOTISER */}
      <div className="text-[10px] text-gray-400 mt-2">Kommunikation</div>
      <Link href="/admin/system/notiser-mallar" className={subLink}>Notiser & mallar</Link>

      {/* INTEGRATIONER */}
      <div className="text-[10px] text-gray-400 mt-2">Integrationer</div>
      <Link href="#" className={subLink}>Betalning</Link>
      <Link href="#" className={subLink}>E-post</Link>
      <Link href="#" className={subLink}>BokfÃ¶ring</Link>
      <Link href="#" className={subLink}>Kartor</Link>

      {/* API */}
      <div className="text-[10px] text-gray-400 mt-2">API & utvecklare</div>
      <Link href="/admin/system/api-nycklar" className={subLink}>API-nycklar</Link>
      <Link href="/admin/system/webhookar" className={subLink}>Webhookar</Link>
      <Link href="/admin/system/dokumentation" className={subLink}>Dokumentation</Link>

      {/* SÃ„KERHET */}
      <div className="text-[10px] text-gray-400 mt-2">SÃ¤kerhet</div>
      <Link href="#" className={subLink}>Inloggningar & sessioner</Link>
      <Link href="#" className={subLink}>Ã…tkomstlogg</Link>

      {/* SYSTEM */}
      <div className="text-[10px] text-gray-400 mt-2">System</div>
      <Link href="/admin/system/systemstatus" className={subLink}>Systemstatus</Link>
      <Link href="#" className={subLink}>Auditlogg</Link>

      {/* DATA */}
      <div className="text-[10px] text-gray-400 mt-2">Data</div>
      <Link href="/admin/system/backup-aterstallning" className={subLink}>Backup & Ã¥terstÃ¤llning</Link>
      <Link href="/admin/system/export-import" className={subLink}>Export / import</Link>

    </div>
  )}
</div>

      
</nav>

      {/* FOOTER */}
      <div className="p-3 border-t">
        <Link href="#" className="flex items-center gap-2 text-[12px] text-gray-600 hover:text-[#194C66]">
          <Icon src="/H_icon.png" />
          Feedback och fÃ¶rslag
        </Link>
      </div>
    </aside>
  );
}





