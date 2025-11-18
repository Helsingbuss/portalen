// src/components/dashboard/GreetingNews.tsx
import React from "react";
import { Newspaper, ArrowRight, ChevronRight } from "lucide-react";

type NewsItem = { title: string; href?: string };

export default function GreetingNews({
  name = "Andreas",
  role = "admin",
  items = [],
  heightClass = "h-[320px]",
}: {
  name?: string;
  role?: "admin" | "agent" | string;
  items?: NewsItem[];
  heightClass?: string; // t.ex. "h-[520px]" fÃ¶r att matcha diagramhÃ¶jden
}) {
  const now = new Date();
  const h = now.getHours();
  const greeting =
    h < 10 ? "God morgon" : h < 18 ? "God dag" : "God kvÃ¤ll";

  const roleText =
    role === "agent"
      ? "HÃ¤r kommer lite uppdateringar fÃ¶r dig som arbetar i portalen."
      : "HÃ¤r bjuder vi pÃ¥ lite nyheter";

  const news = items.length
    ? items
    : [
        { title: "Nya betalningsvillkor fÃ¶r privatpersoner", href: "#" },
        { title: "Ny hemsida lanserad", href: "#" },
        { title: "Nya resor ligger ute pÃ¥ hemsidan", href: "#" },
        { title: "VÃ¤lkommen till Helsingbuss Portal", href: "#" },
      ];

  return (
    <div
      className={`bg-white rounded-xl shadow p-5 flex flex-col ${heightClass}`}
    >
      {/* Rubrik */}
      <div className="mb-3">
        <div className="text-[#194C66] font-semibold text-lg">
          {greeting}, {name}!
        </div>
        <div className="text-[#194C66]/80 mt-1 text-[15px]">
          {roleText}
        </div>
      </div>

      {/* Lista med nyheter */}
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-100">
          {news.map((n, i) => (
            <li key={`${n.title}-${i}`}>
              <a
                href={n.href || "#"}
                className="flex items-center justify-between gap-3 py-3 group"
              >
                <span className="flex items-center gap-3">
                  <Newspaper
                    className="shrink-0"
                    size={18}
                    strokeWidth={2}
                    color="#194C66"
                  />
                  <span className="text-[#194C66] text-[15px] md:text-base">
                    {n.title}
                  </span>
                </span>

                <ChevronRight
                  size={18}
                  className="text-[#194C66]/60 transition-transform group-hover:translate-x-0.5"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* LÃ¤nk/CTA lÃ¤ngst ned */}
      <div className="pt-3">
        <a
          href="#"
          className="inline-flex items-center gap-2 text-[#194C66] text-[15px] md:text-base hover:underline"
        >
          <ArrowRight size={18} />
          Visa alla nyheter
        </a>
      </div>
    </div>
  );
}

