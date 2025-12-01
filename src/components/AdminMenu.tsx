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
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

export default function AdminMenu() {
  const [open, setOpen] = useState<string | null>("booking");
  const toggleMenu = (menu: string) => setOpen(open === menu ? null : menu);

  // gemensam klass för snyggare underlänkar
  const subLink =
    "block px-3 py-2 rounded-md leading-[1.45] text-[13px] text-gray-700 hover:bg-[#e5eef3] hover:text-[#194C66] transition";

  const groupButtonBase =
    "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-[#f2f6f9] hover:text-[#194C66] transition";

  const groupLabelBase = "flex items-center gap-3";

  return (
    <aside className="fixed top-[60px] left-0 w-60 md:w-64 h-[calc(100vh-60px)] bg-white border-r border-gray-200 shadow-sm flex flex-col">
      {/* liten topp-del */}
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400 mb-1">
          Helsingbuss Portal
        </p>
        <p className="text-sm font-semibold text-[#194C66]">
          Administrationsmeny
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Översikt (utan pil) */}
        <Link
          href="/start"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#194C66] text-white shadow-sm text-sm font-medium hover:bg-[#153a4c] transition"
        >
          <HomeIcon className="h-5 w-5" />
          <span>Översikt</span>
        </Link>

        {/* Offert & Bokning */}
        <div className="mt-2">
          <button
            onClick={() => toggleMenu("booking")}
            className={`${groupButtonBase} ${
              open === "booking" ? "bg-[#f2f6f9] text-[#194C66]" : ""
            }`}
          >
            <span className={groupLabelBase}>
              <DocumentDuplicateIcon className="h-5 w-5" />
              <span>Offert &amp; Bokning</span>
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${
                open === "booking" ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === "booking" && (
            <ul className="mt-2 ml-3 border-l border-gray-100 pl-3 space-y-1">
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
            className={`${groupButtonBase} ${
              open === "trips" ? "bg-[#f2f6f9] text-[#194C66]" : ""
            }`}
          >
            <span className={groupLabelBase}>
              <TicketIcon className="h-5 w-5" />
              <span>Resor &amp; Biljetter</span>
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${
                open === "trips" ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === "trips" && (
            <ul className="mt-2 ml-3 border-l border-gray-100 pl-3 space-y-1">
              <li>
                <Link href="/admin/trips/new" className={subLink}>
                  Lägg upp resa
                </Link>
              </li>
              <li>
                <Link href="/admin/tickets/book" className={subLink}>
                  Boka biljett
                </Link>
              </li>
               <li>
                <Link href="/admin/ticket-types" className={subLink}>
                  Biljettyper
                </Link>
              </li>
               <li>
                <Link href="/admin/pricing" className={subLink}>
                  Prissättning
                </Link>
              </li>
                <li>
                <Link href="/admin/tickets/passengers" className={subLink}>
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
            className={`${groupButtonBase} ${
              open === "staff" ? "bg-[#f2f6f9] text-[#194C66]" : ""
            }`}
          >
            <span className={groupLabelBase}>
              <UserGroupIcon className="h-5 w-5" />
              <span>Personal</span>
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${
                open === "staff" ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === "staff" && (
            <ul className="mt-2 ml-3 border-l border-gray-100 pl-3 space-y-1">
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
            className={`${groupButtonBase} ${
              open === "fleet" ? "bg-[#f2f6f9] text-[#194C66]" : ""
            }`}
          >
            <span className={groupLabelBase}>
              <TruckIcon className="h-5 w-5" />
              <span>Fordonsflotta</span>
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${
                open === "fleet" ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === "fleet" && (
            <ul className="mt-2 ml-3 border-l border-gray-100 pl-3 space-y-1">
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
                  Service &amp; besiktning
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Dokument &amp; tillstånd
                </Link>
              </li>
            </ul>
          )}
        </div>

        {/* Ekonomi */}
        <div>
          <button
            onClick={() => toggleMenu("economy")}
            className={`${groupButtonBase} ${
              open === "economy" ? "bg-[#f2f6f9] text-[#194C66]" : ""
            }`}
          >
            <span className={groupLabelBase}>
              <BanknotesIcon className="h-5 w-5" />
              <span>Ekonomi</span>
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${
                open === "economy" ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === "economy" && (
            <ul className="mt-2 ml-3 border-l border-gray-100 pl-3 space-y-1">
              <li>
                <Link href="#" className={subLink}>
                  Intäkter &amp; utgifter
                </Link>
              </li>
              <li>
                <Link href="#" className={subLink}>
                  Priser &amp; rabatter
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
            className={`${groupButtonBase} ${
              open === "status" ? "bg-[#f2f6f9] text-[#194C66]" : ""
            }`}
          >
            <span className={groupLabelBase}>
              <ChartBarIcon className="h-5 w-5" />
              <span>Överblick &amp; Status</span>
            </span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform ${
                open === "status" ? "rotate-180" : ""
              }`}
            />
          </button>
          {open === "status" && (
            <ul className="mt-2 ml-3 border-l border-gray-100 pl-3 space-y-1">
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
      <div className="p-4 border-t border-gray-100">
        <Link
          href="#"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#194C66] transition"
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
          <span>Feedback och förslag</span>
        </Link>
      </div>
    </aside>
  );
}
