import Image from "next/image";
import Link from "next/link";
import React from "react";

type Props = {
  alt: string;
  whiteSrc: string; // *_vit.png
  colorSrc: string; // *_farg.png
  size?: number;
  href?: string;
  onClick?: () => void;
  className?: string;
  title?: string;
};

export default function IconSwap({
  alt,
  whiteSrc,
  colorSrc,
  size = 24,
  href,
  onClick,
  className,
  title,
}: Props) {
  const [hover, setHover] = React.useState(false);

  const content = (
    <span
      className={className}
      title={title}
      aria-label={alt}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        lineHeight: 0,
        userSelect: "none",
      }}
    >
      <Image
        src={hover ? colorSrc : whiteSrc}
        alt={alt}
        width={size}
        height={size}
        style={{ display: "block" }}
      />
    </span>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
