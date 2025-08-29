import { useState } from "react";
import Link from "next/link";
import {
  HomeIcon,
  DocumentDuplicateIcon,
  TicketIcon,
  UserGroupIcon,
  TruckIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

export default function AdminMenu() {
  const [open, setOpen] = useState<string | null>(null);

  const toggleMenu = (menu: string) => {
    setOpen(open === menu ? null : menu);
  };

  return (
    <aside className="fixed top-[60px] left-0 w-64 h-[calc(100vh-60px)] bg-white shadow-md flex flex-col">
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Översikt (utan pil) */}
        <Link
          href="/start"
          className="flex items-center gap-3 p-3 rounded-lg transition bg-[#194C66] text-white shadow"
        >
          <HomeIcon className="h-5 w-5" />
          Översikt
        </Link>

        {/* Offert & Bokning */}
        <div>
          <button
            onClick={() => toggleMenu("booking")}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-[#194C66] hover:text-white transition"
          >
            <span className="flex items-center gap-3">
              <DocumentDuplicateIcon className="h-5 w-5" />
              Offert & Bokning
            </span>
            <span>{open === "booking" ? "▲" : "▼"}</span>
          </button>
          {open === "booking" && (
            <div className="ml-8 mt-2 space-y-2 text-sm text-gray-700">
              <Link href="#">Skapa ny offert</Link>
              <Link href="#">Skapa bokning</Link>
              <Link href="#">Skapa körorder</Link>
              <Link href="#">Hantera offertförfrågningar</Link>
              <Link href="#">Hantera bokningsförfrågningar</Link>
              <Link href="#">Alla bokningar</Link>
              <Link href="#">Kommande körningar</Link>
            </div>
          )}
        </div>

        {/* Resor & Biljetter */}
        <div>
          <button
            onClick={() => toggleMenu("trips")}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-[#194C66] hover:text-white transition"
          >
            <span className="flex items-center gap-3">
              <TicketIcon className="h-5 w-5" />
              Resor & Biljetter
            </span>
            <span>{open === "trips" ? "▲" : "▼"}</span>
          </button>
          {open === "trips" && (
            <div className="ml-8 mt-2 space-y-2 text-sm text-gray-700">
              <Link href="#">Lägg upp resa</Link>
              <Link href="#">Boka biljett</Link>
              <Link href="#">Passagerarlista</Link>
              <Link href="#">Lista över resor</Link>
            </div>
          )}
        </div>

        {/* Personal */}
        <div>
          <button
            onClick={() => toggleMenu("staff")}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-[#194C66] hover:text-white transition"
          >
            <span className="flex items-center gap-3">
              <UserGroupIcon className="h-5 w-5" />
              Personal
            </span>
            <span>{open === "staff" ? "▲" : "▼"}</span>
          </button>
          {open === "staff" && (
            <div className="ml-8 mt-2 space-y-2 text-sm text-gray-700">
              <Link href="#">Lägg till chaufför</Link>
              <Link href="#">Lägg till personal</Link>
              <Link href="#">Chaufförslista</Link>
              <Link href="#">Lista på anställda</Link>
              <Link href="#">Schemaläggning</Link>
            </div>
          )}
        </div>

        {/* Fordonsflotta */}
        <div>
          <button
            onClick={() => toggleMenu("fleet")}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-[#194C66] hover:text-white transition"
          >
            <span className="flex items-center gap-3">
              <TruckIcon className="h-5 w-5" />
              Fordonsflotta
            </span>
            <span>{open === "fleet" ? "▲" : "▼"}</span>
          </button>
          {open === "fleet" && (
            <div className="ml-8 mt-2 space-y-2 text-sm text-gray-700">
              <Link href="#">Lägg till fordon</Link>
              <Link href="#">Fordonsöversikt</Link>
              <Link href="#">Service & besiktning</Link>
              <Link href="#">Dokument & tillstånd</Link>
            </div>
          )}
        </div>

        {/* Ekonomi */}
        <div>
          <button
            onClick={() => toggleMenu("economy")}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-[#194C66] hover:text-white transition"
          >
            <span className="flex items-center gap-3">
              <BanknotesIcon className="h-5 w-5" />
              Ekonomi
            </span>
            <span>{open === "economy" ? "▲" : "▼"}</span>
          </button>
          {open === "economy" && (
            <div className="ml-8 mt-2 space-y-2 text-sm text-gray-700">
              <Link href="#">Intäkter & utgifter</Link>
              <Link href="#">Priser & rabatter</Link>
              <Link href="#">Export / bokföring</Link>
            </div>
          )}
        </div>

        {/* Överblick & Status */}
        <div>
          <button
            onClick={() => toggleMenu("status")}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-[#194C66] hover:text-white transition"
          >
            <span className="flex items-center gap-3">
              <ChartBarIcon className="h-5 w-5" />
              Överblick & Status
            </span>
            <span>{open === "status" ? "▲" : "▼"}</span>
          </button>
          {open === "status" && (
            <div className="ml-8 mt-2 space-y-2 text-sm text-gray-700">
              <Link href="#">Dagens körningar</Link>
              <Link href="#">Fordonsstatus</Link>
              <Link href="#">Chaufförsstatus</Link>
              <Link href="#">Senaste aktiviteter</Link>
            </div>
          )}
        </div>
      </nav>

      {/* Feedback längst ner */}
      <div className="p-4 border-t">
        <Link
          href="#"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#194C66]"
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
          Feedback och förslag
        </Link>
      </div>
    </aside>
  );
}
