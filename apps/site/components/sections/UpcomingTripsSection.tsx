import React from "react";

export default function UpcomingTripsSection() {
  return (
    <section className="hb-upcoming" aria-label="Kommande resor">
      <div className="hb-upcoming__inner">
        <div className="hb-upcoming__head">
          <span className="hb-upcoming__goldline" aria-hidden="true" />

          <h2 className="hb-upcoming__title">Kommande resor</h2>

          <div className="hb-upcoming__subrow">
            <p className="hb-upcoming__subtitle">
              Våra paketresor / resor bokas via Sundra – fler datum släpps löpande.
            </p>

            {/* Info-ikon efter "släpps löpande" + hover tooltip */}
            <span className="hb-upcoming__infoWrap">
              <button
                className="hb-upcoming__infoBtn"
                type="button"
                aria-label="Info om bokning"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 10v7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 7h.01"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <span className="hb-upcoming__tooltip" role="tooltip">
                Du slutför bokning och betalning i Sundra, som är Helsingbuss egen reseportal.
              </span>
            </span>
          </div>
        </div>

        {/* Här kommer korten/karusellen sen */}
        <div className="hb-upcoming__body"></div>
      </div>
    </section>
  );
}
