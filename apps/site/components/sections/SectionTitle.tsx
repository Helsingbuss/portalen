import React from "react";

export type SectionTitleProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export default function SectionTitle({ title, subtitle, className }: SectionTitleProps) {
  return (
    <section
      aria-label={title}
      className={className}
      style={{
        width: "100%",
        padding: "28px 0 10px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 18px", textAlign: "center" }}>
        <h2 style={{ margin: 0, fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 900 }}>
          {title}
        </h2>
        {subtitle ? (
          <p style={{ margin: "10px auto 0", maxWidth: 760, fontSize: "clamp(13px, 1.5vw, 16px)", opacity: 0.75, lineHeight: 1.6 }}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
