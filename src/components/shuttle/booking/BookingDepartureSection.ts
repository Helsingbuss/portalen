import React from "react";

export default function BookingDepartureSection() {
  return React.createElement(
    "section",
    { className: "rounded-3xl bg-white p-6 shadow" },
    React.createElement(
      "h2",
      { className: "text-2xl font-bold text-[#194C66]" },
      "Välj avgång"
    ),
    React.createElement(
      "p",
      { className: "mt-2 text-sm text-gray-600" },
      "Här kommer sökning och val av avgång för Helsingbuss Airport Shuttle."
    )
  );
}
