// src/components/Layout.tsx
import { ReactNode, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  UsersIcon,
  ChartBarIcon,
  TicketIcon,
} from "@heroicons/react/24/solid";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

interface LayoutProps {
  children: ReactNode;
  active: string;
}

export default function Layout({ children, active }: LayoutProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/"); // Skickar till login (index.tsx)
};

  return (
    <div className="min-h-screen bg-[#F5F4F0] flex flex-col">
      {/* Header */}
      <header className="bg-[#194C66] text-white px-6 py-3 flex justify-between items-center shadow fixed top-0 left-0 right-0 z-50">
        {/* Logo */}
        <Image src="/vit_logo.png" alt="Helsingbuss" width={160} height={45} />

        {/* Right side */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 focus:outline-none"
          >
            {/* Hjälp-ikon */}
            <div className="flex items-center justify-center w-7 h-7 rounded-full border border-white">
              <span className="text-lg font-semibold">?</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Andreas Ekelöf</span>
              <span className="text-sm text-gray-200">Helsingbuss</span>
            </div>
            <span className="ml-1">⌄</span>
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white text-black rounded shadow-lg z-50">
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Logga ut
              </button>
              <button
                onClick={() => alert("Byta språk kommer snart!")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Byt språk
              </button>
              <button
                onClick={() => alert("Hjälp kommer snart!")}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Hjälp
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 pt-[57px]">
        {/* Sidebar (klistrad meny) */}
        <aside className="fixed top-[57px] left-0 w-[303px] h-[calc(100vh-57px)] bg-white shadow-md p-4 space-y-2 overflow-y-auto">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 p-3 rounded-lg transition ${
              active === "dashboard"
                ? "bg-[#194C66] text-white shadow"
                : "hover:bg-[#194C66] hover:text-white"
            }`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5" />
            Hem
          </Link>

          <Link
            href="/profile"
            className={`flex items-center gap-3 p-3 rounded-lg transition ${
              active === "profile"
                ? "bg-[#194C66] text-white shadow"
                : "hover:bg-[#194C66] hover:text-white"
            }`}
          >
            <UsersIcon className="h-5 w-5" />
            Min användarprofil
          </Link>

          <Link
            href="/company"
            className={`flex items-center gap-3 p-3 rounded-lg transition ${
              active === "company"
                ? "bg-[#194C66] text-white shadow"
                : "hover:bg-[#194C66] hover:text-white"
            }`}
          >
            <BanknotesIcon className="h-5 w-5" />
            Företagsinställningar
          </Link>

          <Link
            href="/users"
            className={`flex items-center gap-3 p-3 rounded-lg transition ${
              active === "users"
                ? "bg-[#194C66] text-white shadow"
                : "hover:bg-[#194C66] hover:text-white"
            }`}
          >
            <ChartBarIcon className="h-5 w-5" />
            Hantera användare
          </Link>

          <Link
            href="/tickets"
            className={`flex items-center gap-3 p-3 rounded-lg transition ${
              active === "tickets"
                ? "bg-[#194C66] text-white shadow"
                : "hover:bg-[#194C66] hover:text-white"
            }`}
          >
            <TicketIcon className="h-5 w-5" />
            Paketresor
          </Link>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-[303px] py-10 px-6">{children}</main>
      </div>
    </div>
  );
}
