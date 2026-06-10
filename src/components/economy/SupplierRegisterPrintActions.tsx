"use client";

type SupplierRegisterPrintActionsProps = {
  title?: string;
};

export default function SupplierRegisterPrintActions({
  title = "Leverantörsregister",
}: SupplierRegisterPrintActionsProps) {
  const today = new Date().toLocaleDateString("sv-SE");

  function handlePrint() {
    window.print();
  }

  return (
    <div className="hb-print-toolbar hb-print-hide no-print">
      <div>
        <p className="hb-print-kicker">Ekonomi</p>
        <h2>{title}</h2>
        <p>Utskrift / PDF skapad {today}</p>
      </div>

      <div className="hb-print-buttons">
        <button type="button" onClick={handlePrint}>
          Skriv ut
        </button>

        <button type="button" onClick={handlePrint}>
          Spara som PDF
        </button>
      </div>
    </div>
  );
}
