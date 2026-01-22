import React from "react";

export type SectionTitleProps = {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
};

export default function SectionTitle({
  title,
  subtitle,
  align = "center",
  className,
}: SectionTitleProps) {
  const isCenter = align === "center";

  return (
    <section className={`hb-section hb-section--tight ${className ?? ""}`}>
      <div className={`hb-wrap hb-st ${isCenter ? "hb-st--center" : ""}`}>
        <div className="hb-st__line" aria-hidden="true" />
        <h2 className="hb-st__title">{title}</h2>
        {subtitle ? <p className="hb-st__sub">{subtitle}</p> : null}
      </div>
    </section>
  );
}
