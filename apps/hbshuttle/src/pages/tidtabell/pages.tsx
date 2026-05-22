import ShuttleFooter from "@/components/shuttle/ShuttleFooter";
import ShuttleNavbar from "@/components/shuttle/ShuttleNavbar";
import TimetableHero from "@/components/shuttle/timetable/TimetableHero";

export default function TidtabellPage() {
  return (
    <>
      <ShuttleNavbar />

      <main className="timetable-page">
        <TimetableHero />

        <section className="timetable-next-placeholder">
          <div>
            <p>Nästa sektion</p>
            <h2>Här bygger vi linjeval och avgångstabell.</h2>
          </div>
        </section>
      </main>

      <ShuttleFooter />
    </>
  );
}
