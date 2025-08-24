import Image from "next/image";

interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Helsingbuss"
      width={350}
      height={50}
      className={className}
    />
  );
}
