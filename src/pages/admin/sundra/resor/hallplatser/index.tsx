// src/pages/admin/sundra/resor/hallplatser/index.tsx
import React from "react";
import { Topbar } from "@/components/sundra/Topbar";
import { Sidebar } from "@/components/sundra/Sidebar";

export default function AdminHallplatserPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:pl-[18rem]">
          <div className="mx-auto max-w-[1100px]">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-xl font-semibold text-gray-900">Hållplatser (Register)</div>
              <div className="mt-2 text-sm text-gray-600">
                Här kommer du kunna lägga in upphämtningsorter/hållplatser som används i sökmodulen och vid bokning.
              </div>

              <div className="mt-6 rounded-2xl border bg-gray-50 p-4 text-sm text-gray-700">
                Kommer snart ✅ (Nu är routen rätt så den inte hamnar i “Redigera resa”.)
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


