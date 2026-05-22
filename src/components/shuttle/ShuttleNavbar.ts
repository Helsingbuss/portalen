import React from "react";

export default function ShuttleNavbar() {
  return React.createElement(
    "header",
    { className: "sticky top-0 z-50 border-b bg-white/90 px-6 py-4 backdrop-blur" },
    React.createElement(
      "div",
      { className: "mx-auto flex max-w-6xl items-center justify-between" },
      React.createElement("div", { className: "font-bold text-[#194C66]" }, "Helsingbuss Airport Shuttle"),
      React.createElement("nav", { className: "text-sm font-semibold text-[#194C66]" }, "Köp biljett")
    )
  );
}
