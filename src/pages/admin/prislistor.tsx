// src/pages/admin/prislistor.tsx
import { useState, useEffect } from "react";
import AdminMenu from "@/components/AdminMenu";
import Header from "@/components/Header";

/* ===== TYPES ===== */
type CategoryKey = "bestallning" | "brollop" | "forening";
type BusTypeKey =
  | "sprinter"
  | "turistbuss"
  | "helturistbuss"
  | "dubbeldackare";

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

/* ===== LABELS ===== */
const CATEGORY_LABELS: Record<CategoryKey, string> = {
  bestallning: "Beställning",
  brollop: "Bröllop",
  forening: "Förening",
};

const BUS_LABELS: Record<BusTypeKey, string> = {
  sprinter: "Sprinter",
  turistbuss: "Turistbuss",
  helturistbuss: "Helturistbuss",
  dubbeldackare: "Dubbeldäckare",
};

/* ===== BASPRISER ===== */
const BASE = {
  sprinter: {
    grundavgift: 1950,
    tim_vardag: 460,
    tim_kvall: 515,
    tim_helg: 595,
    km_0_25: 15,
    km_26_100: 14,
    km_101_250: 13,
    km_251_plus: 12,
  },
  turistbuss: {
    grundavgift: 2150,
    tim_vardag: 480,
    tim_kvall: 535,
    tim_helg: 610,
    km_0_25: 16,
    km_26_100: 15,
    km_101_250: 14,
    km_251_plus: 13,
  },
  helturistbuss: {
    grundavgift: 2350,
    tim_vardag: 495,
    tim_kvall: 550,
    tim_helg: 630,
    km_0_25: 16,
    km_26_100: 15,
    km_101_250: 14,
    km_251_plus: 13,
  },
  dubbeldackare: {
    grundavgift: 2950,
    tim_vardag: 520,
    tim_kvall: 575,
    tim_helg: 660,
    km_0_25: 17,
    km_26_100: 16,
    km_101_250: 15,
    km_251_plus: 14,
  },
};

function generate(multiplier: number) {
  const result: any = {};

  for (const bus in BASE) {
    result[bus] = {};

    for (const key in BASE[bus as BusTypeKey]) {
      result[bus][key] = Math.round(
        BASE[bus as BusTypeKey][key as PriceFieldKey] * multiplier
      ).toString();
    }
  }

  return result;
}

/* ===== INITIAL ===== */
const INITIAL_STATE: PriceState = {
  bestallning: generate(1),
  brollop: generate(1.15),
  forening: generate(0.9),
};

export default function PrislistorPage() {
  const [activeCategory, setActiveCategory] =
    useState<CategoryKey>("bestallning");

  const [prices, setPrices] = useState<PriceState>(INITIAL_STATE);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [dieselPrice, setDieselPrice] = useState(22);
  const [autoAdjust, setAutoAdjust] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/prislistor");
        const data = await res.json();

        if (data?.ok && data?.prices) {
          setPrices(data.prices);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

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

  function getAdjusted(field: PriceFieldKey, val: string) {
    const base = Number(val || 0);
    if (!autoAdjust || !field.startsWith("km")) return val;

    const diff = dieselPrice - 20;
    return Math.round(base + diff * 0.35).toString();
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Fel vid sparning");
      }

      setSaveMessage("Sparat ✔");
    } catch (e: any) {
      console.error(e);
      setSaveMessage(e?.message || "Fel vid sparning");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <AdminMenu />
      <div className="min-h-screen bg-[#f5f4f0] lg:pl-64">
        <Header />

        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-[#194C66]">
              Prislistor
            </h1>
          </div>

          <div className="bg-white p-4 rounded-xl shadow flex items-center gap-6">
            <div>
              <label className="text-sm text-[#194C66]/70">
                Dieselpris (kr/l)
              </label>
              <input
                type="number"
                value={dieselPrice}
                onChange={(e) => setDieselPrice(Number(e.target.value))}
                className="border rounded px-2 py-1 ml-2 w-24"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoAdjust}
                onChange={() => setAutoAdjust(!autoAdjust)}
              />
              Auto-justera km-priser
            </label>
          </div>

          <div className="flex gap-2">
            {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-4 py-2 rounded-full text-sm ${
                  activeCategory === c
                    ? "bg-[#194C66] text-white"
                    : "bg-white border"
                }`}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {(Object.keys(prices[activeCategory]) as BusTypeKey[]).map(
              (bus) => {
                const data = prices[activeCategory][bus];

                return (
                  <div key={bus} className="bg-white rounded-xl p-4 shadow">
                    <h3 className="font-semibold mb-3 text-[#194C66]">
                      {BUS_LABELS[bus]}
                    </h3>

                    <Input
                      label="Grundavgift"
                      value={data.grundavgift}
                      onChange={(v: string) =>
                        handleChange(activeCategory, bus, "grundavgift", v)
                      }
                    />

                    <Input
                      label="Tim vardag"
                      value={data.tim_vardag}
                      onChange={(v: string) =>
                        handleChange(activeCategory, bus, "tim_vardag", v)
                      }
                    />

                    <Input
                      label="Tim kväll"
                      value={data.tim_kvall}
                      onChange={(v: string) =>
                        handleChange(activeCategory, bus, "tim_kvall", v)
                      }
                    />

                    <Input
                      label="Tim helg"
                      value={data.tim_helg}
                      onChange={(v: string) =>
                        handleChange(activeCategory, bus, "tim_helg", v)
                      }
                    />

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Input
                        label="0–25 km"
                        value={getAdjusted("km_0_25", data.km_0_25)}
                        onChange={(v: string) =>
                          handleChange(activeCategory, bus, "km_0_25", v)
                        }
                      />

                      <Input
                        label="26–100 km"
                        value={getAdjusted("km_26_100", data.km_26_100)}
                        onChange={(v: string) =>
                          handleChange(activeCategory, bus, "km_26_100", v)
                        }
                      />

                      <Input
                        label="101–250 km"
                        value={getAdjusted("km_101_250", data.km_101_250)}
                        onChange={(v: string) =>
                          handleChange(activeCategory, bus, "km_101_250", v)
                        }
                      />

                      <Input
                        label="251+ km"
                        value={getAdjusted("km_251_plus", data.km_251_plus)}
                        onChange={(v: string) =>
                          handleChange(activeCategory, bus, "km_251_plus", v)
                        }
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="bg-[#194C66] text-white px-6 py-2 rounded-full"
            >
              {isSaving ? "Sparar..." : "Spara"}
            </button>
          </div>

          {saveMessage && (
            <div
              className={`text-sm ${
                saveMessage.includes("Fel")
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {saveMessage}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

/* INPUT */
function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-[#194C66]">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="border rounded px-2 py-1 w-24 text-right"
      />
    </div>
  );
}
