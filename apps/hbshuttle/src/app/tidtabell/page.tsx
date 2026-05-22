import ShuttleNavbar from "@/components/shuttle/ShuttleNavbar";
import ShuttleFooter from "@/components/shuttle/ShuttleFooter";
import TimetableSchedule from "@/components/shuttle/timetable/TimetableSchedule";
import TimetableKnowBefore from "@/components/shuttle/timetable/TimetableKnowBefore";
import TimetableHelpCTA from "@/components/shuttle/timetable/TimetableHelpCTA";

export default function TidtabellPage() {
  return (
    <>
      <ShuttleNavbar />

      <main className="timetable-page-simple">
        <TimetableSchedule />
        <TimetableKnowBefore />
        <TimetableHelpCTA />
      </main>

      <ShuttleFooter />
    </>
  );
}
