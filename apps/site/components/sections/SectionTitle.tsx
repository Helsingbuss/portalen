import React from "react";

type Props = {
  title?: string;
  subtitle?: string;
  align?: "left" | "center";
  showGoldLine?: boolean;
};

export default function SectionTitle({
  title = "Bekväma bussresor – skräddarsydda för dig",
  subtitle = "Trygg beställningstrafik för små och stora grupper, med paketresor som gör allt enklare.",
  align = "center",
  showGoldLine = true,
}: Props) {
  const isCenter = align === "center";

  return (
    <section className="hb-section-title">
      {showGoldLine ? <div className="hb-goldline" aria-hidden="true" /> : null}

      <h2 className={`hb-st__title ${isCenter ? "is-center" : ""}`}>{title}</h2>

      {subtitle ? (
        <p className={`hb-st__subtitle ${isCenter ? "is-center" : ""}`}>{subtitle}</p>
      ) : null}
    </section>
  );
}
