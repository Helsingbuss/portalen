// src/components/Header.tsx
import React, { useState, ReactNode, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronDownIcon, PlusIcon } from "@heroicons/react/24/outline";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import Link from "next/link";

type HeaderProps = {
  profile?: {
    full_name?: string | null;
    company_name?: string | null;
    title?: string | null;
    employee_number?: string | null;
  };
};

export default function Header({ profile }: HeaderProps) {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const router = useRouter();

  const dropdownRef = useRef<HTMLDivElement>(null);

  const userName = profile?.full_name ?? "Andreas Ekelöf";
  const companyName = profile?.title ?? profile?.company_name ?? "Helsingbuss";
  const employeeNumber = profile?.employee_number ?? "—";

  const togglePanel = (panel: string) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // 🔥 CLICK OUTSIDE
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setCreateMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      {/* TOPBAR */}
      <header className="bg-white border-b border-gray-200 px-6 h-[60px] flex justify-between items-center fixed top-0 left-0 right-0 z-50">

        {/* LOGO */}
        <div className="flex items-center">
          <Image src="/mork_logo.png" alt="Helsingbuss" width={200} height={100} />
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">

          {/* Butik */}
          <button className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-gray-50 hover:bg-gray-100">
            Butik/kassa
          </button>

          {/* 🔥 SNABBVAL */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setCreateMenuOpen(!createMenuOpen)}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Snabbval
            </button>

            {/* 🔥 ANIMERAD DROPDOWN */}
            <div
              className={`absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-xl border z-50 py-2 transform transition-all duration-200 ease-out ${
                createMenuOpen
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
              }`}
            >

              {/* SÄLJ */}
              <div className="text-[10px] text-gray-400 px-4 mb-1">Sälj</div>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa offert</Link>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa bokning</Link>

              {/* RESOR */}
              <div className="text-[10px] text-gray-400 px-4 mt-2 mb-1">Resor</div>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa resa</Link>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Boka biljett</Link>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa avgång</Link>

              {/* DRIFT */}
              <div className="text-[10px] text-gray-400 px-4 mt-2 mb-1">Drift</div>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Skapa körorder</Link>

              {/* CRM */}
              <div className="text-[10px] text-gray-400 px-4 mt-2 mb-1">Kunder</div>
              <Link href="#" className="block px-4 py-2 text-sm hover:bg-gray-50">Lägg till kund</Link>

            </div>
          </div>

          {/* IKONER */}
          <div className="flex items-center gap-2 ml-2">
            <TopIcon src="/data-report.svg" onClick={() => togglePanel("reports")} />
            <TopIcon src="/note-sticky.svg" onClick={() => togglePanel("notes")} />
            <TopIcon src="/bell.svg" onClick={() => togglePanel("notifications")} />
            <TopIcon src="/Comment-info.svg" onClick={() => togglePanel("help")} />
          </div>

          {/* PROFIL */}
          <button
            onClick={() => togglePanel("account")}
            className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-200"
          >
            <img src="/User.svg" className="w-[18px] h-[18px] opacity-80" />

            <div className="text-right leading-tight">
              <div className="text-sm font-medium text-gray-800">{userName}</div>
              <div className="text-xs text-gray-500">{companyName}</div>
            </div>

            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </header>

      {/* PANELER */}
      {activePanel && (
        <div className="fixed top-[60px] right-0 bottom-0 w-full max-w-sm bg-white shadow-xl border-l z-40">

          {activePanel === "reports" && (
            <Panel title="Rapporter" onClose={() => setActivePanel(null)} />
          )}

          {activePanel === "notes" && (
            <Panel title="Anteckningar" onClose={() => setActivePanel(null)} />
          )}

          {activePanel === "notifications" && (
            <Panel title="Notifieringar" onClose={() => setActivePanel(null)} />
          )}

          {activePanel === "account" && (
            <AccountPanel
              onClose={() => setActivePanel(null)}
              userName={userName}
              companyName={companyName}
              employeeNumber={employeeNumber}
              onLogout={handleLogout}
            />
          )}
        </div>
      )}
    </>
  );
}

/* ---------- ICON ---------- */
function TopIcon({ src, onClick }: { src: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
    >
      <img src={src} className="w-[18px] h-[18px] opacity-80" />
    </button>
  );
}

/* ---------- PANEL ---------- */
function Panel({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between">
        <span className="font-semibold text-sm">{title}</span>
        <button onClick={onClose} className="text-xs text-gray-500">
          Stäng
        </button>
      </div>

      <div className="p-4 text-sm text-gray-500">
        Innehåll kommer här...
      </div>
    </div>
  );
}

/* ---------- ACCOUNT PANEL ---------- */
function AccountPanel({
  onClose,
  userName,
  companyName,
  employeeNumber,
  onLogout,
}: {
  onClose: () => void;
  userName: string;
  companyName: string;
  employeeNumber: string;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between">
        <span className="font-semibold text-sm">{userName}</span>
        <button onClick={onClose} className="text-xs text-gray-500">
          Stäng
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm text-gray-800">
        <div>
          <p className="font-medium">{userName}</p>
          <p className="text-xs text-gray-500">{companyName}</p>

          <p className="mt-1 text-xs text-gray-500">
            Anställningsnr: {employeeNumber}
          </p>
        </div>

        <button
          onClick={onLogout}
          className="w-full mt-3 px-3 py-2 text-xs border border-red-300 text-red-600 rounded-md hover:bg-red-50"
        >
          Logga ut
        </button>
      </div>
    </div>
  );
}
