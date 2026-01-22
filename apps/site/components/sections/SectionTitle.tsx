import React from "react";

type SectionTitleProps = {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

export default function SectionTitle({
  title,
  subtitle,
  align = "center",
}: SectionTitleProps) {
  return (
    <section
      style={{
        padding: "clamp(3rem, 6vw, 6rem) 1rem",
        textAlign: align,
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: align === "center" ? "0 auto" : "0",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: "0.75rem",
            color: "#1f2937",
          }}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            style={{
              fontSize: "clamp(1rem, 1.6vw, 1.15rem)",
              lineHeight: 1.6,
              color: "#4b5563",
              maxWidth: 720,
              margin: align === "center" ? "0 auto" : "0",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
