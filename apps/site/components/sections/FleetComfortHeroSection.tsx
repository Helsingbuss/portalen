import Image from "next/image";

export default function FleetComfortHeroSection() {
  return (
    <section className="hb-fleet" aria-label="Flotta och komfort">
      <div className="hb-fleet__hero">
        <div className="hb-fleet__content">
          <h2 className="hb-fleet__title">Flotta &amp; Komfort</h2>

          <p className="hb-fleet__text">
            Med Helsingbuss ska resan kännas trygg och bekväm från första stoppet till sista.
            Även om varumärket är nytt bygger vi på branscherfarenhet och samarbetar med etablerade
            bussföretag  så att vi kan matcha rätt buss, rätt standard och rätt upplägg för just er resa.
            Du berättar vad ni behöver, vi löser helheten: fordon, förare och planering.
          </p>

          <div className="hb-fleet__usp" role="list">
            <div className="hb-fleet__uspItem" role="listitem">
              <span className="hb-fleet__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span>Säkerhet &amp; kvalitet i fokus</span>
            </div>

            <div className="hb-fleet__uspItem" role="listitem">
              <span className="hb-fleet__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span>Bekväm standard med smarta faciliteter</span>
            </div>

            <div className="hb-fleet__uspItem" role="listitem">
              <span className="hb-fleet__check" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span>Rätt buss för rätt resa  via våra partners</span>
            </div>
          </div>

          <a className="hb-fleet__btn" href="/offert">
            Skicka offertförfrågan
          </a>
        </div>
      </div>

      <div className="hb-fleet__logos" aria-label="Samarbetspartners">
        <div className="hb-fleet__logosInner">
          <Image
            src="/brand/bergkvara.png"
            alt="Bergkvara"
            width={170}
            height={46}
            className="hb-fleet__logo"
          />
          <Image
            src="/brand/helsingbuss.png"
            alt="Helsingbuss"
            width={170}
            height={46}
            className="hb-fleet__logo"
          />
          <Image
            src="/brand/norraskanebuss.png"
            alt="Norra Skåne Buss"
            width={170}
            height={46}
            className="hb-fleet__logo"
          />
        </div>
      </div>
    </section>
  );
}
