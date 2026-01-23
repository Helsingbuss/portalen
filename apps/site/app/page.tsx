import SectionTitle from "../components/sections/SectionTitle";
import ServiceCards from "../components/sections/ServiceCards";

import HeroHeader from "../components/home/HeroHeader";

export default function HomePage() {
  return (
    <main className="hb-page">
      <HeroHeader />
      <SectionTitle
  title="Bekväma bussresor  skräddarsydda fÄ¶r dig"
  subtitle="Trygg beställningstrafik fÄ¶r små¥ och stora grupper, med paketresor som gÄ¶r allt enklare."
/>
      <ServiceCards />
</main>
  );
}








