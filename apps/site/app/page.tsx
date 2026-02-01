import HeroHeader from "../components/home/HeroHeader";
import SectionTitle from "../components/sections/SectionTitle";
import ServiceCards from "../components/sections/ServiceCards";
import UpcomingTripsSection from "../components/sections/UpcomingTripsSection";
import TravelFeelingSection from "../components/sections/TravelFeelingSection";

export default function Page() {
  return (
    <main>
      <HeroHeader />
      <SectionTitle />
      <ServiceCards />
          <UpcomingTripsSection />
      <TravelFeelingSection />
    </main>
  );
}


