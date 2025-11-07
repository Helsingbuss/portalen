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

  // gemensam klass fÃ¶r snyggare underlÃ¤nkar
  const subLink =
    "block px-3 py-2 rounded-md leading-[1.45] hover:bg-[#e5eef3] hover:text-[#194C66] transition";

  return (
    <aside className="fixed top-[60px] left-0 w-64 h-[calc(100vh-60px)] bg-white shadow-md flex flex-col">
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Ã–versikt (utan pil) */}
        <Link
          href="/start"
          className="flex items-center gap-3 p-3 rounded-lg transition bg-[#194C66] text-white shadow"
        >
          <HomeIcon className="h-5 w-5" />
          Ã–versikt
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
            <span aria-hidden>{open === "booking" ? "â–²" : "â–¼"}</span>
          </button>
          {open === "booking" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              {/* KOPPLAD: ny tvÃ¥stegssida fÃ¶r manuell offert */}
              <li>
                <Link href="/admin/offers/new" className={subLink}>
                  Skapa ny offert
                </Link>
              </li>
              <li>
              <Link href="/admin/bookings/new"className={subLink}>
              Skapa bokning</Link>
              </li>
              <li>
                <Link href="/admin/orders/new" className={subLink}>
                  Skapa kÃ¶rorder
                </Link>
              </li>
              <li>
                <Link href="/admin/orders"  className={subLink}>
                  Alla kÃ¶rorder
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
                  Kommande kÃ¶rningar
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
            <span aria-hidden>{open === "trips" ? "â–²" : "â–¼"}</span>
          </button>
          {open === "trips" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="/admin/trips/new" className={subLink}>
                  LÃ¤gg upp resa
                </Link>
              </li>
              <li>
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
                  Lista Ã¶ver resor
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
            <span aria-hidden>{open === "staff" ? "â–²" : "â–¼"}</span>
          </button>
          {open === "staff" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="/admin/drivers/new" className={subLink}>
                  LÃ¤gg till chauffÃ¶r
                </Link>
              </li>
              <li>
                <Link href="/admin/employees/new" className={subLink}>
                  LÃ¤gg till personal
                </Link>
              </li>
              <li>
                <Link href="/admin/drivers"className={subLink}>
                ChauffÃ¶rlista</Link>
              </li>
              <li>
                <Link href="/admin/employees" className={subLink}>
                  Lista pÃ¥ anstÃ¤llda
                </Link>
              </li>
              <li>
                <Link href="/admin/schedule" className={subLink}>
                  SchemalÃ¤ggning
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
            <span aria-hidden>{open === "fleet" ? "â–²" : "â–¼"}</span>
          </button>
          {open === "fleet" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="#" className={subLink}>
                  LÃ¤gg till fordon
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  FordonsÃ¶versikt
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Service & besiktning
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Dokument & tillstÃ¥nd
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
            <span aria-hidden>{open === "economy" ? "â–²" : "â–¼"}</span>
          </button>
          {open === "economy" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="#" className={subLink}>
                  IntÃ¤kter & utgifter
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Priser & rabatter
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Export / bokfÃ¶ring
                </Link>
              </li>
            </ul>
          )}
        </div>

        {/* Ã–verblick & Status */}
        <div>
          <button
            onClick={() => toggleMenu("status")}
            className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-[#194C66] hover:text-white transition"
          >
            <span className="flex items-center gap-3">
              <ChartBarIcon className="h-5 w-5" />
              Ã–verblick & Status
            </span>
            <span aria-hidden>{open === "status" ? "â–²" : "â–¼"}</span>
          </button>
          {open === "status" && (
            <ul className="ml-8 mt-2 space-y-1 text-sm text-gray-700">
              <li>
                <Link href="#" className={subLink}>
                  Dagens kÃ¶rningar
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Fordonsstatus
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  ChauffÃ¶rsstatus
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

      {/* Feedback lÃ¤ngst ner */}
      <div className="p-4 border-t">
        <Link
          href="#"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#194C66]"
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
          Feedback och fÃ¶rslag
        </Link>
      </div>
    </aside>
  );
}

