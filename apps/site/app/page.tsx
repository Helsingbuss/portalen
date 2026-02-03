import HeroHeader from "../components/home/HeroHeader";
import SectionTitle from "../components/sections/SectionTitle";
import ServiceCards from "../components/sections/ServiceCards";
import UpcomingTripsSection from "../components/sections/UpcomingTripsSection";
import TravelFeelingSection from "../components/sections/TravelFeelingSection";
import FleetComfortHeroSection from "../components/sections/FleetComfortHeroSection";

export default function Page() {
  return (
    <main>
  <HeroHeader />
  <SectionTitle />

  {/* ✅ HÄR får alla sektioner samma avstånd via .section */}
  <section className="section section--medium">
    <ServiceCards />
  </section>

  <section className="section section--medium">
    <UpcomingTripsSection />
  </section>

  <section className="section section--medium">
    <TravelFeelingSection />
  </section>

  {/* HERO (kant till kant) */}
  <section className="section section--hero">
    <FleetComfortHeroSection />
  </section>

  {/* Lägg kommande sektioner här senare:
  <section className="section section--medium">
    <AppSection />
  </section>
  */}
</main>
  );
}




