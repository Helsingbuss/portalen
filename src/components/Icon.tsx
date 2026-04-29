type Props = {
  src: string;
  size?: number;
};

export default function Icon({ src, size = 20 }: Props) {
  return (
    <img
      src={src}
      alt=""
      style={{
        width: size,
        height: size,
        objectFit: "contain",
      }}
    />
  );
}
