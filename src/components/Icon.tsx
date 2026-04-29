type Props = {
  src: string;
  size?: number;
};

export default function Icon({ src, size = 20 }: Props) {
  return (
    <img
      src={src}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      alt=""
    />
  );
}
