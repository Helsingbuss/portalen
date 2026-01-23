import SectionTitle from "../components/sections/SectionTitle";
import ServiceCards from "../components/sections/ServiceCards";

﻿import HeroHeader from "../components/home/HeroHeader";

export default function HomePage() {
  return (
    <main className="hb-page">
      <HeroHeader />
      <SectionTitle
  title="Bekväma bussresor  skräddarsydda för dig"
  subtitle="Trygg beställningstrafik för små och stora grupper, med paketresor som gör allt enklare."
/>
      <ServiceCards />
</main>
  );
}





