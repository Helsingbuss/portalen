import { useState } from "react";
import Image from "next/image";
import QuickActionsMenu from "./QuickActionsMenu";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-[#194C66] text-white px-6 py-3 flex justify-between items-center shadow fixed top-0 left-0 right-0 z-50 h-[60px]">
      {/* Logo */}
      <div className="flex items-center">
        <Image src="/vit_logo.png" alt="Helsingbuss" width={160} height={45} />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 relative">
        {/* Guida mig */}
        <button className="border border-white rounded px-3 py-1 text-sm hover:bg-white hover:text-[#194C66] transition">
          Guida mig
        </button>

        {/* Skapa ny */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="bg-white text-[#194C66] font-semibold rounded px-3 py-1 text-sm hover:bg-gray-200 transition"
          >
            + Skapa ny
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white text-black rounded-lg shadow-lg z-50">
              <QuickActionsMenu />
            </div>
          )}
        </div>

        {/* Profil */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="flex items-center justify-center w-7 h-7 rounded-full border border-white">
            ?
          </div>
          <div className="flex flex-col items-start">
            <span className="font-medium text-sm">Andreas Ekelöf</span>
            <span className="text-xs text-gray-200">Helsingbuss</span>
          </div>
          <span className="ml-1">⌄</span>
        </div>
      </div>
    </header>
  );
}
