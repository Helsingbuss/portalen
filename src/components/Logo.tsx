import Image from "next/image";

export default function Logo() {
  return (
    <div className="mb-6 flex items-start">
      <Image
        src="/logo.png"
        alt="Helsingbuss Logo"
        width={300}   // större
        height={90}
        priority
      />
    </div>
  );
}
