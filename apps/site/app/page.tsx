import HeroHeader from "../components/home/HeroHeader";
import SectionTitle from "../components/sections/SectionTitle";
import ServiceCards from "../components/sections/ServiceCards";

export default function HomePage() {
  return (
    <main style={{ width: "100%" }}>
      <HeroHeader />
      <SectionTitle />
      <ServiceCards />
    </main>
  );
}
