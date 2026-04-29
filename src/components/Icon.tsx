// src/components/Icon.tsx

import React from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  size?: number;
};

export default function Icon({ src, size = 20, style, ...rest }: Props) {
  return (
    <img
      src={src}
      alt=""
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        ...style,
      }}
      {...rest}
    />
  );
}
