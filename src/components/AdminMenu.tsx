// src/components/AdminMenu.tsx
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
  const toggleMenu = (menu: string) => setOpen(open === menu ? null : menu);

  // gemensam klass för snyggare underlänkar
  const subLink =
    "block px-3 py-2 rounded-md leading-[1.45] hover:bg-[#e5eef3] hover:text-[#194C66] transition";

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
            <span aria-hidden>{open === "booking" ? "▲" : "▼"}</span>
          </button>
          {open === "booking" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              {/* KOPPLAD: ny tvåstegssida för manuell offert */}
              <li>
                <Link href="/admin/offers/new" className={subLink}>
                  Skapa ny offert
                </Link>
              </li>
              <li>
                <Link href="/admin/bookings/new" className={subLink}>
                  Skapa bokning
                </Link>
              </li>
              <li>
                <Link href="/admin/orders/new" className={subLink}>
                  Skapa körorder
                </Link>
              </li>
              <li>
                <Link href="/admin/orders" className={subLink}>
                  Alla körorder
                </Link>
              </li>
              <li>
                <Link href="/admin/offers" className={subLink}>
                  Alla offerter
                </Link>
              </li>
              <li>
                <Link href="/admin/bookings" className={subLink}>
                  Alla bokningar
                </Link>
              </li>
              <li>
                <Link href="/admin/orders?scope=upcoming" className={subLink}>
                  Kommande körningar
                </Link>
              </li>
            </ul>
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
            <span aria-hidden>{open === "trips" ? "▲" : "▼"}</span>
          </button>
          {open === "trips" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="/admin/trips/new" className={subLink}>
                  Lägg upp resa
                </Link>
              </li>
              <li>
                {/* Länkar som inte är bekräftade behåller vi som # tills sidorna finns */}
                <Link href="#" className={subLink}>
                  Boka biljett
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Passagerarlista
                </Link>
              </li>
              <li>
                <Link href="/admin/trips" className={subLink}>
                  Lista över resor
                </Link>
              </li>
            </ul>
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
            <span aria-hidden>{open === "staff" ? "▲" : "▼"}</span>
          </button>
          {open === "staff" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="/admin/drivers/new" className={subLink}>
                  Lägg till chaufför
                </Link>
              </li>
              <li>
                <Link href="/admin/employees/new" className={subLink}>
                  Lägg till personal
                </Link>
              </li>
              <li>
                <Link href="/admin/drivers" className={subLink}>
                  Chaufförlista
                </Link>
              </li>
              <li>
                <Link href="/admin/employees" className={subLink}>
                  Lista på anställda
                </Link>
              </li>
              <li>
                <Link href="/admin/schedule" className={subLink}>
                  Schemaläggning
                </Link>
              </li>
            </ul>
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
            <span aria-hidden>{open === "fleet" ? "▲" : "▼"}</span>
          </button>
          {open === "fleet" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="#" className={subLink}>
                  Lägg till fordon
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Fordonsöversikt
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Service & besiktning
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Dokument & tillstånd
                </Link>
              </li>
            </ul>
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
            <span aria-hidden>{open === "economy" ? "▲" : "▼"}</span>
          </button>
          {open === "economy" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="#" className={subLink}>
                  Intäkter & utgifter
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Priser & rabatter
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Export / bokföring
                </Link>
              </li>
            </ul>
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
            <span aria-hidden>{open === "status" ? "▲" : "▼"}</span>
          </button>
          {open === "status" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="#" className={subLink}>
                  Dagens körningar
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Fordonsstatus
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Chaufförsstatus
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Senaste aktiviteter
                </Link>
              </li>
            </ul>
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
