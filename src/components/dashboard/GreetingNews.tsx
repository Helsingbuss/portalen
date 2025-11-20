// src/components/dashboard/GreetingNews.tsx
import React from "react";
import Image from "next/image";
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
  heightClass?: string; // t.ex. "h-[520px]" för att matcha diagramhöjden
}) {
  const now = new Date();
  const h = now.getHours();
  const greeting =
    h < 10 ? "God morgon" : h < 18 ? "God dag" : "God kväll";

  const roleText =
    role === "agent"
      ? "Här kommer lite uppdateringar för dig som arbetar i portalen."
      : "Här bjuder vi på lite nyheter och roligheter.";

  const news = items.length
    ? items
    : [
        { title: "Välkommen till Helsingbuss Portal!", href: "#" },
        { title: "Helsingbuss.se är nu relanserad", href: "#" },
        { title: "Nya resor ligger ute på hemsidan", href: "#" },
        { title: "Nya betalningsvillkor för privatpersoner", href: "#" },
      ];

  return (
    <div
      className={`bg-white rounded-xl shadow px-5 py-4 flex flex-col ${heightClass}`}
    >
      {/* Rubrik + Busie uppe till höger */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-[#111827] font-semibold text-lg">
            {greeting}, {name}!
          </div>
          <div className="text-[#4B5563] mt-1 text-[14px]">
            {roleText}
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F3F4F6]">
          <Image
            src="/busie.png"
            alt="Helsingbuss maskot"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
      </div>

      {/* Lista med nyheter */}
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-100">
          {news.map((n, i) => (
            <li key={`${n.title}-${i}`}>
              <a
                href={n.href || "#"}
                className="flex items-center justify-between gap-3 py-2.5 group"
              >
                <span className="flex items-center gap-3">
                  {/* Liten "ikonbricka" – anpassad känsla */}
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#194C66]">
                    <Newspaper size={16} strokeWidth={2} />
                  </span>

                  <span className="text-[#111827] text-[14px] md:text-[15px] group-hover:underline">
                    {n.title}
                  </span>
                </span>

                <ChevronRight
                  size={16}
                  className="text-[#9CA3AF] transition-transform group-hover:translate-x-0.5"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Länk/CTA längst ned – som en liten knapp */}
      <div className="pt-4">
        <a
          href="#"
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F3F4F6]">
            <ArrowRight size={14} className="text-[#111827]" />
          </span>
          Visa alla nyheter
        </a>
      </div>
    </div>
  );
}

function NewsIcon() {
  // Om du senare vill ha olika ikoner per rad kan du bygga ut denna.
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F3F4F6] text-[#194C66]">
      <Newspaper size={16} strokeWidth={2} />
    </span>
  );
}
