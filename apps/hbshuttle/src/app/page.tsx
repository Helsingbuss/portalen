import AirportRoutesSection from "@/components/shuttle/AirportRoutesSection";
import AppPromoSection from "@/components/shuttle/AppPromoSection";
import ShuttleBenefitsSection from "@/components/shuttle/ShuttleBenefitsSection";
import ShuttleFooter from "@/components/shuttle/ShuttleFooter";
import ShuttleHero from "@/components/shuttle/ShuttleHero";
import ShuttleNavbar from "@/components/shuttle/ShuttleNavbar";
import ShuttleTrustStats from "@/components/shuttle/ShuttleTrustStats";

export default function HomePage() {
  return (
    <>
      <ShuttleNavbar />

      <main className="shuttle-page">
        <ShuttleHero />
        <AirportRoutesSection />
        <ShuttleBenefitsSection />
        <AppPromoSection />
        <ShuttleTrustStats />
      </main>

      <ShuttleFooter />
    </>
  );
}
