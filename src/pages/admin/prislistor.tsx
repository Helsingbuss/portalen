// src/pages/admin/prislistor.tsx
import { useState } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

type CategoryKey = "bestallning" | "brollop" | "forening";
type BusTypeKey = "sprinter" | "turistbuss" | "helturistbuss" | "dubbeldackare";

type PriceFieldKey =
  | "grundavgift"
  | "tim_vardag"
  | "tim_kvall"
  | "tim_helg"
  | "km_0_25"
  | "km_26_100"
  | "km_101_250"
  | "km_251_plus";

type PriceState = {
  [category in CategoryKey]: {
    [bus in BusTypeKey]: {
      [field in PriceFieldKey]: string;
    };
  };
};

const CATEGORY_CONFIG: Record<
  CategoryKey,
  {
    label: string;
    badge: string;
    intro: string;
    generalTitle: string;
    generalRows?: { left: string; right: string }[];
  }
> = {
  bestallning: {
    label: "Prislista – Beställningstrafik",
    badge: "Standard",
    intro:
      "Här lägger du in grundpriser för beställningstrafik. Uppgifterna används i offertkalkylen och visas som stöd till bokningspersonalen.",
    generalTitle: "Gemensamma villkor – minsta debitering per uppdrag",
    generalRows: [
      { left: "0–25 km (enkel resa)", right: "Minst 2 timmar" },
      { left: "26–100 km (enkel resa)", right: "Minst 3 timmar" },
      { left: "101–250 km (enkel resa)", right: "Minst 4 timmar" },
      { left: "251+ km (enkel resa)", right: "Minst 6 timmar" },
    ],
  },
  brollop: {
    label: "Prislista – Bröllop",
    badge: "Bröllop",
    intro:
      "Priserna för bröllop bygger på samma tim- och kilometerpriser som beställningstrafiken, men används specifikt för vigsel, foto och festupplägg.",
    generalTitle: "Inriktning – bröllopsresor",
    generalRows: [
      { left: "Område", right: "Utgår normalt från Helsingborg med omnejd" },
      { left: "Innehåll", right: "Vigsel, fotografering, transport till fest" },
      { left: "Priser", right: "Samtliga priser exkl. moms" },
      { left: "Avvikelser", right: "Längre avstånd prissätts separat" },
    ],
  },
  forening: {
    label: "Prislista – Föreningar & supporterklubbar",
    badge: "Förening",
    intro:
      "Här ligger särskilda priser för ideella föreningar, supporterklubbar och återkommande gruppresor. Kan kopplas mot kundprofiler och kampanjer.",
    generalTitle: "Villkor – föreningspriser",
    generalRows: [
      { left: "Målgrupp", right: "Föreningar & supporterklubbar" },
      { left: "Fördel", right: "Justeringar vid fler återkommande resor" },
      { left: "Giltighet", right: "Gäller enligt överenskommen avtalsperiod" },
      { left: "Övrigt", right: "Priser exkl. moms – kan uppdateras vid behov" },
    ],
  },
};

const BUS_CONFIG: {
  key: BusTypeKey;
  title: string;
  capacity: string;
  description: string;
}[] = [
  {
    key: "sprinter",
    title: "Sprinter – upp till 19 passagerare",
    capacity: "Sprinter / minibuss",
    description: "Mindre grupper, shuttle och kortare uppdrag.",
  },
  {
    key: "turistbuss",
    title: "Turistbuss – upp till 39 passagerare",
    capacity: "Mellanstor turistbuss",
    description: "Mindre föreningar, skolor och transferresor.",
  },
  {
    key: "helturistbuss",
    title: "Helturistbuss – upp till 57 passagerare",
    capacity: "Fullstor turistbuss",
    description: "Standardbuss för de flesta gruppresor.",
  },
  {
    key: "dubbeldackare",
    title: "Dubbeldäckare – upp till 81 passagerare",
    capacity: "Dubbeldäckare",
    description: "Större grupper, cuper och evenemang.",
  },
];

const EMPTY_FIELD = "";

const EMPTY_CATEGORY: {
  [bus in BusTypeKey]: { [field in PriceFieldKey]: string };
} = {
  sprinter: {
    grundavgift: EMPTY_FIELD,
    tim_vardag: EMPTY_FIELD,
    tim_kvall: EMPTY_FIELD,
    tim_helg: EMPTY_FIELD,
    km_0_25: EMPTY_FIELD,
    km_26_100: EMPTY_FIELD,
    km_101_250: EMPTY_FIELD,
    km_251_plus: EMPTY_FIELD,
  },
  turistbuss: {
    grundavgift: EMPTY_FIELD,
    tim_vardag: EMPTY_FIELD,
    tim_kvall: EMPTY_FIELD,
    tim_helg: EMPTY_FIELD,
    km_0_25: EMPTY_FIELD,
    km_26_100: EMPTY_FIELD,
    km_101_250: EMPTY_FIELD,
    km_251_plus: EMPTY_FIELD,
  },
  helturistbuss: {
    grundavgift: EMPTY_FIELD,
    tim_vardag: EMPTY_FIELD,
    tim_kvall: EMPTY_FIELD,
    tim_helg: EMPTY_FIELD,
    km_0_25: EMPTY_FIELD,
    km_26_100: EMPTY_FIELD,
    km_101_250: EMPTY_FIELD,
    km_251_plus: EMPTY_FIELD,
  },
  dubbeldackare: {
    grundavgift: EMPTY_FIELD,
    tim_vardag: EMPTY_FIELD,
    tim_kvall: EMPTY_FIELD,
    tim_helg: EMPTY_FIELD,
    km_0_25: EMPTY_FIELD,
    km_26_100: EMPTY_FIELD,
    km_101_250: EMPTY_FIELD,
    km_251_plus: EMPTY_FIELD,
  },
};

const INITIAL_STATE: PriceState = {
  bestallning: { ...EMPTY_CATEGORY },
  brollop: { ...EMPTY_CATEGORY },
  forening: { ...EMPTY_CATEGORY },
};

export default function PrislistorPage() {
  const [activeCategory, setActiveCategory] =
    useState<CategoryKey>("bestallning");
  const [prices, setPrices] = useState<PriceState>(INITIAL_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const cfg = CATEGORY_CONFIG[activeCategory];

  function handleChange(
    category: CategoryKey,
    bus: BusTypeKey,
    field: PriceFieldKey,
    value: string
  ) {
    setPrices((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [bus]: {
          ...prev[category][bus],
          [field]: value,
        },
      },
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/admin/prislistor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
      });

      if (!res.ok) {
        console.error("Spara prislistor – felstatus:", res.status);
        setSaveMessage(
          `Kunde inte spara prislistorna (status ${res.status}). Kontrollera att /api/admin/prislistor/save finns och fungerar.`
        );
        return;
      }

      setSaveMessage("Alla prislistor sparades.");
    } catch (err) {
      console.error("Spara prislistor – fel:", err);
      setSaveMessage(
        "Kunde inte spara prislistorna. Kontrollera uppkopplingen eller försök igen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      {/* Vänstermeny ligger fixed – vi lägger allt innehåll i en kolumn med vänster-marginal på desktop */}
      <AdminMenu />

      <div className="flex min-h-screen flex-col bg-[#f5f4f0] lg:ml-64 xl:ml-72">
        <Header />

        <main className="px-4 pb-10 pt-6 sm:px-6 lg:px-10">
          {/* Sidhuvud */}
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Helsingbuss Portal
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              Prislistor & grundpriser
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Lägg in grundpriser för beställningstrafik, bröllop och
              föreningar. Dessa används som underlag i offert- och
              kalkylfunktionen.
            </p>
          </div>

          {/* Flikar */}
          <div className="mt-2 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {(
              [
                ["bestallning", "Prislista – Beställningstrafik"],
                ["brollop", "Prislista – Bröllop"],
                ["forening", "Prislista – Föreningar & supporterklubbar"],
              ] as [CategoryKey, string][]
            ).map(([key, label]) => {
              const active = key === activeCategory;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCategory(key)}
                  className={[
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-white text-slate-900 shadow-sm border border-emerald-500/70"
                      : "bg-transparent text-slate-600 hover:text-slate-900 border border-transparent hover:bg-white/60",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Överkort med gemensam info */}
          <section className="mt-5 rounded-3xl border border-slate-900/40 bg-[#020617] text-slate-50 shadow-lg">
            <div className="flex flex-col gap-3 border-b border-white/5 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                  {cfg.label}
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {cfg.generalTitle}
                </h2>
              </div>
              <span className="inline-flex items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                {cfg.badge}
              </span>
            </div>

            <div className="grid gap-4 px-6 pb-5 pt-4 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <p className="text-slate-200">{cfg.intro}</p>

              {cfg.generalRows && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="grid grid-cols-2 gap-y-1 text-xs font-medium text-slate-300">
                    <span className="text-slate-400">Sträcka / villkor</span>
                    <span className="text-right text-slate-400">
                      Minimi-debitering / info
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    {cfg.generalRows.map((row) => (
                      <div
                        key={row.left + row.right}
                        className="grid grid-cols-2 items-baseline gap-y-0.5"
                      >
                        <span className="truncate pr-2">{row.left}</span>
                        <span className="text-right font-semibold text-emerald-100">
                          {row.right}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Pris-kort för vald kategori */}
          <section className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Grundpriser – {cfg.label.replace("Prislista – ", "")}
              </h2>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-400"
              >
                {isSaving ? "Sparar..." : "Spara alla prislistor"}
              </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {BUS_CONFIG.map((bus) => {
                const busPrices = prices[activeCategory][bus.key];

                return (
                  <article
                    key={bus.key}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white/80 shadow-sm"
                  >
                    <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {bus.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {bus.description}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                        {bus.capacity}
                      </span>
                    </header>

                    <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
                      {/* Grundavgift */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Grundavgift
                        </p>
                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                          <span className="text-slate-600">Per uppdrag</span>
                          <div className="ml-auto flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              className="w-24 border-0 bg-transparent text-right text-sm text-slate-900 outline-none focus:ring-0"
                              placeholder="0"
                              value={busPrices.grundavgift}
                              onChange={(e) =>
                                handleChange(
                                  activeCategory,
                                  bus.key,
                                  "grundavgift",
                                  e.target.value
                                )
                              }
                            />
                            <span className="text-xs text-slate-500">
                              kr / uppdrag
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Timpriser */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Timpriser
                        </p>
                        <div className="space-y-1.5">
                          <PriceInputRow
                            label="Vardag dag (mån–fre 06.00–18.00)"
                            suffix="kr / tim"
                            value={busPrices.tim_vardag}
                            onChange={(v) =>
                              handleChange(
                                activeCategory,
                                bus.key,
                                "tim_vardag",
                                v
                              )
                            }
                          />
                          <PriceInputRow
                            label="Vardag kväll (mån–tors 18.00–22.00, fre 06.00–18.00)"
                            suffix="kr / tim"
                            value={busPrices.tim_kvall}
                            onChange={(v) =>
                              handleChange(
                                activeCategory,
                                bus.key,
                                "tim_kvall",
                                v
                              )
                            }
                          />
                          <PriceInputRow
                            label="Helg & röd dag (fre 18.00 – sön 24.00, röda dagar)"
                            suffix="kr / tim"
                            value={busPrices.tim_helg}
                            onChange={(v) =>
                              handleChange(
                                activeCategory,
                                bus.key,
                                "tim_helg",
                                v
                              )
                            }
                          />
                        </div>
                      </div>

                      {/* Kilometerpriser */}
                      <div className="space-y-2 sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Kilometerpriser
                        </p>
                        <div className="grid gap-2 sm:grid-cols-4">
                          <KmField
                            label="0–25 km"
                            value={busPrices.km_0_25}
                            onChange={(v) =>
                              handleChange(
                                activeCategory,
                                bus.key,
                                "km_0_25",
                                v
                              )
                            }
                          />
                          <KmField
                            label="26–100 km"
                            value={busPrices.km_26_100}
                            onChange={(v) =>
                              handleChange(
                                activeCategory,
                                bus.key,
                                "km_26_100",
                                v
                              )
                            }
                          />
                          <KmField
                            label="101–250 km"
                            value={busPrices.km_101_250}
                            onChange={(v) =>
                              handleChange(
                                activeCategory,
                                bus.key,
                                "km_101_250",
                                v
                              )
                            }
                          />
                          <KmField
                            label="251+ km"
                            value={busPrices.km_251_plus}
                            onChange={(v) =>
                              handleChange(
                                activeCategory,
                                bus.key,
                                "km_251_plus",
                                v
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {saveMessage && (
              <p className="text-sm text-slate-700">{saveMessage}</p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

type PriceInputRowProps = {
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
};

function PriceInputRow({ label, suffix, value, onChange }: PriceInputRowProps) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-[13px]">
      <span className="max-w-[60%] flex-1 text-slate-600">{label}</span>
      <div className="ml-auto flex items-center gap-1">
        <input
          type="number"
          min={0}
          className="w-20 border-0 bg-transparent text-right text-sm text-slate-900 outline-none focus:ring-0"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="text-[11px] text-slate-500">{suffix}</span>
      </div>
    </label>
  );
}

type KmFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function KmField({ label, value, onChange }: KmFieldProps) {
  return (
    <label className="flex flex-col rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
      <span className="mb-1 text-slate-600">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          className="w-full border-0 bg-transparent text-right text-sm text-slate-900 outline-none focus:ring-0"
          placeholder="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="whitespace-nowrap text-[11px] text-slate-500">
          kr / km
        </span>
      </div>
    </label>
  );
}
