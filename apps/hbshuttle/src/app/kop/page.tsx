import BookingDepartureSection from "@/components/shuttle/booking/BookingDepartureSection";
import ShuttleFooter from "@/components/shuttle/ShuttleFooter";
import ShuttleNavbar from "@/components/shuttle/ShuttleNavbar";

export default function KopPage() {
  return (
    <>
      <ShuttleNavbar />

      <main className="booking-page">
        <BookingDepartureSection />
      </main>

      <ShuttleFooter />
    </>
  );
}
