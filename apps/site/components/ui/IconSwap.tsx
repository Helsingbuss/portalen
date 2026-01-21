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
  size = 22,
  href,
  onClick,
  className,
  title,
}: Props) {
  const [hover, setHover] = React.useState(false);

  const img = (
    <Image
      src={hover ? colorSrc : whiteSrc}
      alt={alt}
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );

  const common = {
    className,
    title,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setHover(true),
    onBlur: () => setHover(false),
    "aria-label": alt,
  } as const;

  if (href) {
    return (
      <Link href={href} {...common}>
        {img}
      </Link>
    );
  }

  return (
    <button
      type="button"
      {...common}
      onClick={onClick}
      style={{
        background: "transparent",
        border: 0,
        padding: 0,
        cursor: "pointer",
        lineHeight: 0,
      }}
    >
      {img}
    </button>
  );
}
