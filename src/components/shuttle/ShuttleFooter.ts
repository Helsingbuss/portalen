import React from "react";

export default function ShuttleFooter() {
  return React.createElement(
    "footer",
    { className: "mt-16 bg-[#194C66] px-6 py-8 text-center text-white" },
    React.createElement("p", { className: "font-semibold" }, "Helsingbuss Airport Shuttle"),
    React.createElement("p", { className: "mt-2 text-sm text-white/70" }, "Till flyget. Utan stress. Vi kör.")
  );
}
