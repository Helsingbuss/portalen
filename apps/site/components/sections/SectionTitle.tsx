import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  className?: string;
};

export default function SectionTitle({ title, subtitle, className }: Props) {
  return (
    <div className={"hb-st " + (className ?? "")}>
      <div className="hb-st__line" aria-hidden="true" />
      <h2 className="hb-st__title">{title}</h2>
      {subtitle ? <p className="hb-st__subtitle">{subtitle}</p> : null}

      <style>{`
        .hb-st{
          text-align:center;
          padding: 22px 12px 18px;
        }
        .hb-st__line{
          width: 64px;
          height: 2px;
          margin: 0 auto 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(0,0,0,0), #caa24a, rgba(0,0,0,0));
          opacity: 0.95;
        }
        .hb-st__title{
          margin: 0;
          font-weight: 900;
          letter-spacing: -0.02em;
          font-size: clamp(22px, 2.2vw, 36px);
          color: #0f172a;
        }
        .hb-st__subtitle{
          margin: 8px auto 0;
          max-width: 860px;
          line-height: 1.45;
          color: rgba(15, 23, 42, 0.72);
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}
