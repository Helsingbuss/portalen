import HeroHeader from "../components/home/HeroHeader";
import SectionTitle from "../components/sections/SectionTitle";
import ServiceCards from "../components/sections/ServiceCards";
import UpcomingTripsSection from "@/components/sections/UpcomingTripsSection";

export default function Page() {
  return (
    <main>
      <HeroHeader />
      <SectionTitle />
      <ServiceCards />
          <UpcomingTripsSection />
    </main>
  );
}
