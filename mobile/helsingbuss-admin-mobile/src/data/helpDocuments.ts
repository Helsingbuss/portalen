export type HelpDocumentSection = {
  heading: string;
  body: string;
  bullets?: string[];
};

export type HelpDocument = {
  id: string;
  title: string;
  text: string;
  priority: "Hög" | "Medel" | "Senare";
  sections: HelpDocumentSection[];
};

export type HelpCategory = {
  id: string;
  title: string;
  description: string;
  documents: HelpDocument[];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "agent-customer",
    title: "Agent & kundarbete",
    description:
      "Rutiner för bokningsagenter, kundbemötande, rabatter, sekretess och professionell kundkontakt.",
    documents: [
      {
        id: "rabattregler",
        title: "Rabattregler",
        text: "Hur rabatter, kampanjkoder och specialpriser får användas utan att missbrukas.",
        priority: "Hög",
        sections: [
          {
            heading: "Syfte",
            body:
              "Rabatter ska användas för att skapa tydliga kampanjer och bra kundrelationer, inte för att pressa priser utan kontroll. Alla rabatter ska vara godkända, spårbara och följa Helsingbuss/Sundras regler.",
          },
          {
            heading: "Det agenten får göra",
            body:
              "Agenten får använda rabatter som finns godkända i systemet eller som är tydligt beslutade av Helsingbuss.",
            bullets: [
              "Använda aktiv kampanjkod enligt kampanjens villkor.",
              "Informera kunden om kampanjer som Helsingbuss har godkänt.",
              "Dokumentera varför rabatt används.",
              "Skicka vidare ärendet om kunden vill ha specialpris.",
            ],
          },
          {
            heading: "Det agenten inte får göra",
            body:
              "Agenten får aldrig använda rabatter för egen vinning eller skapa egna prisregler.",
            bullets: [
              "Ge privat rabatt utan godkännande.",
              "Dela interna rabattkoder offentligt.",
              "Lägga kundens bokning i eget namn.",
              "Manipulera priset för att få fler bokningar.",
              "Använda agentrabatt åt kunden utan godkännande.",
            ],
          },
          {
            heading: "Vid misstanke om fel användning",
            body:
              "Om rabatt används fel ska ärendet pausas och skickas vidare till ansvarig person. Missbruk kan leda till pausad behörighet, stoppad provision eller avslutat samarbete.",
          },
        ],
      },
      {
        id: "kundbemotande",
        title: "Kundbemötande",
        text: "Hur vi pratar med kunder i mejl, telefon, chatt och SMS.",
        priority: "Hög",
        sections: [
          {
            heading: "Grundprincip",
            body:
              "Kunden ska alltid känna sig sedd, lyssnad på och professionellt bemött. Helsingbuss ska upplevas tryggt, tydligt och serviceinriktat oavsett om kunden bokar resa, ställer frågor eller är missnöjd.",
          },
          {
            heading: "Tonläge",
            body:
              "Skriv och prata lugnt, varmt och tydligt. Undvik stressat språk, interna förkortningar och löften som inte är bekräftade.",
            bullets: [
              "Var vänlig och personlig utan att bli oprofessionell.",
              "Bekräfta att du har förstått kundens fråga.",
              "Svara hellre tydligt än snabbt om något behöver kontrolleras.",
              "Skicka vidare svåra ärenden istället för att gissa.",
            ],
          },
          {
            heading: "När kunden är stressad eller missnöjd",
            body:
              "Lyssna först. Bekräfta situationen. Be om nödvändiga uppgifter och dokumentera ärendet. Lova inte ersättning, rabatt eller återbetalning utan godkännande.",
          },
        ],
      },
      {
        id: "sekretess",
        title: "Sekretess & kunduppgifter",
        text: "Hur kunddata ska hanteras och vad som aldrig får delas eller sparas privat.",
        priority: "Hög",
        sections: [
          {
            heading: "Kunduppgifter är förtroende",
            body:
              "Agenten får tillgång till information om privatpersoner, företag, föreningar och resor. Uppgifterna får endast användas för att hantera kundens offert, bokning, betalning eller resa.",
          },
          {
            heading: "Tillåten användning",
            body:
              "Kunduppgifter får användas i Helsingbuss system och i kontakt som rör kundens ärende.",
            bullets: [
              "Skapa offert eller bokning.",
              "Skicka bekräftelse, betalningslänk eller reseinformation.",
              "Kontakta kunden om ändringar eller frågor.",
              "Ge relevant information till operatör/chaufför när det behövs för körningen.",
            ],
          },
          {
            heading: "Förbjuden användning",
            body:
              "Agenten får inte använda kunduppgifter utanför uppdraget.",
            bullets: [
              "Spara kunduppgifter privat.",
              "Dela uppgifter med obehöriga.",
              "Kontakta kunden privat för egna tjänster.",
              "Styra kunden till annat bolag utan godkännande.",
              "Ladda ner eller kopiera uppgifter utan arbetsmässigt behov.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "offers-bookings",
    title: "Offerter & bokningar",
    description:
      "Guider för att skapa offerter, följa upp kunder och omvandla offert till bokning.",
    documents: [
      {
        id: "offertmanual",
        title: "Så skapar du en offert",
        text: "Steg-för-steg för offert, prisförslag, datum, tider, resenärer och villkor.",
        priority: "Hög",
        sections: [
          {
            heading: "Målet med en offert",
            body:
              "En offert ska ge kunden ett tydligt prisförslag och samtidigt ge Helsingbuss rätt information för att kunna planera körningen.",
          },
          {
            heading: "Uppgifter som alltid ska finnas",
            body:
              "En offert ska inte skickas vidare om viktiga uppgifter saknas.",
            bullets: [
              "Kundnamn och kontaktuppgifter.",
              "Datum och tider för resa och eventuell hemresa.",
              "Upphämtningsplats och destination.",
              "Antal resenärer.",
              "Typ av resa: enkel, tur och retur, heldag, transfer eller paketresa.",
              "Eventuella stopp, väntetid, bagage eller särskilda önskemål.",
              "Pris, moms, giltighetstid och villkor.",
            ],
          },
          {
            heading: "Prisförslag",
            body:
              "Agenten ska använda kalkylen och de låsta prisreglerna. Km-pris, timpris, minimipris och moms ska inte ändras manuellt av agenten.",
          },
          {
            heading: "När offerten ska skickas vidare internt",
            body:
              "Skicka vidare ärendet om det gäller större grupper, flera fordon, utlandsresa, specialfordon, oklar körning, lång väntetid eller om kunden kräver specialpris.",
          },
        ],
      },
      {
        id: "bokningsmanual",
        title: "Så skapar du en bokning",
        text: "Från accepterad offert till bekräftad bokning med rätt kontrollpunkter.",
        priority: "Hög",
        sections: [
          {
            heading: "När blir en bokning bekräftad?",
            body:
              "En bokning är inte bekräftad förrän rätt rutiner är uppfyllda. Det kan handla om godkänd offert, korrekt kundinformation, operatör/fordon, betalningsstatus och intern kontroll.",
          },
          {
            heading: "Kontroll före bekräftelse",
            body:
              "Innan kunden får besked ska agenten kontrollera alla viktiga detaljer.",
            bullets: [
              "Rätt datum och tider.",
              "Rätt upphämtningsplats och destination.",
              "Rätt antal resenärer.",
              "Rätt pris och betalningsvillkor.",
              "Operatör/fordon om det behövs.",
              "Eventuella extra stopp eller väntetid.",
            ],
          },
          {
            heading: "Ändringar",
            body:
              "Om kunden ändrar tid, plats, antal resenärer eller destination ska agenten kontrollera om pris, fordon eller tillgänglighet påverkas. Ändringen ska dokumenteras.",
          },
        ],
      },
      {
        id: "andringar",
        title: "Ändringar i bokning",
        text: "Hur ändrade tider, extra stopp och nya uppgifter ska dokumenteras.",
        priority: "Medel",
        sections: [
          {
            heading: "Grundregel",
            body:
              "Alla ändringar ska dokumenteras i systemet så att admin, agent, partner och chaufför kan se vad som gäller.",
          },
          {
            heading: "Vanliga ändringar",
            body:
              "Ändringar kan påverka pris, körplan, fordon och tillgänglighet.",
            bullets: [
              "Ny avgångstid.",
              "Extra stopp.",
              "Ändrad destination.",
              "Fler eller färre resenärer.",
              "Ändrad hemresetid.",
            ],
          },
        ],
      },
    ],
  },
  {
    id: "customer-service",
    title: "Kundservice",
    description:
      "Stöd för vanliga kundfrågor, missnöjda kunder, prisfrågor och fordonsfrågor.",
    documents: [
      {
        id: "missnojd-kund",
        title: "Missnöjd kund",
        text: "Hur vi bemöter klagomål lugnt och professionellt utan att lova fel saker.",
        priority: "Medel",
        sections: [
          {
            heading: "Så hanterar vi klagomål",
            body:
              "Var lugn, lyssna och dokumentera. Kunden ska känna att ärendet tas på allvar. Agenten ska inte lova ersättning eller återbetalning utan godkännande.",
          },
          {
            heading: "Samla in information",
            body:
              "Be om resa, datum, bokningsnummer, kontaktuppgifter och kort beskrivning av vad som hänt.",
          },
        ],
      },
      {
        id: "prisfraga",
        title: "Kund som vill ha lägre pris",
        text: "Färdiga svar när kund tycker priset är högt.",
        priority: "Medel",
        sections: [
          {
            heading: "Svarston",
            body:
              "Bekräfta kundens fråga, förklara vad priset bygger på och erbjud att kontrollera alternativ om det är möjligt.",
          },
          {
            heading: "Viktigt",
            body:
              "Ge inte rabatt utan godkännande. Säg inte att priset kan sänkas om det inte finns stöd för det.",
          },
        ],
      },
      {
        id: "fordonsfraga",
        title: "Kund som frågar om fordon",
        text: "Hur vi förklarar turistbuss, regionbuss, minibuss och partnerfordon.",
        priority: "Medel",
        sections: [
          {
            heading: "Var tydlig med vad som är bekräftat",
            body:
              "Om fordonstyp inte är helt bekräftad ska agenten inte lova specifik modell. Förklara att Helsingbuss eller partner väljer fordon utifrån resans behov och tillgänglighet.",
          },
        ],
      },
    ],
  },
  {
    id: "sundra-shuttle",
    title: "Resor & biljetter",
    description:
      "Hjälp för Sundra Resor, Airport Shuttle, biljetter, QR-koder, hållplatser och avgångar.",
    documents: [
      {
        id: "sundra-guide",
        title: "Sundra Resor-guide",
        text: "Hur Sundra-resor säljs, bokas och hanteras i appen.",
        priority: "Medel",
        sections: [
          {
            heading: "Vad är Sundra Resor?",
            body:
              "Sundra är reseverksamheten för paketresor, shoppingresor, evenemang och andra planerade avgångar.",
          },
          {
            heading: "Bokningsflöde",
            body:
              "Agenten väljer resa, avgång, upphämtningsplats, antal resenärer och eventuellt sätestillval. Priset ska hämtas från resan/avgången.",
          },
        ],
      },
      {
        id: "airport-shuttle-guide",
        title: "Airport Shuttle-guide",
        text: "Hur flygbussbiljetter, QR-koder, avgångar och kundfrågor hanteras.",
        priority: "Medel",
        sections: [
          {
            heading: "Biljetter",
            body:
              "Flygbussbiljetter ska vara tydliga för kunden och kunna visas digitalt, exempelvis med QR-kod när den funktionen är kopplad.",
          },
          {
            heading: "Flexibilitet",
            body:
              "Om biljetten gäller valfri avgång samma dag ska detta framgå tydligt för kunden.",
          },
        ],
      },
      {
        id: "resevillkor",
        title: "Resevillkor",
        text: "Avbokning, ändring, missad avgång, försening och återbetalning.",
        priority: "Medel",
        sections: [
          {
            heading: "Grundregel",
            body:
              "Agenten ska följa de villkor som gäller för aktuell resa eller biljett. Vid osäkerhet ska ärendet skickas vidare.",
          },
        ],
      },
    ],
  },
  {
    id: "partners-drivers",
    title: "Partners & chaufförer",
    description:
      "Instruktioner för operatörer, partneruppdrag, körorder, avvikelser och chaufförsappen.",
    documents: [
      {
        id: "partnerguide",
        title: "Partnerguide",
        text: "Hur partner lämnar pris, accepterar uppdrag och ser körinformation.",
        priority: "Medel",
        sections: [
          {
            heading: "Partneruppdrag",
            body:
              "Partner ska bara få den information som behövs för att lämna pris eller utföra körningen. Kunduppgifter ska hanteras försiktigt.",
          },
        ],
      },
      {
        id: "operator-regler",
        title: "Krav på operatörer",
        text: "Fordon, tillstånd, försäkring, säkerhet, service och bemötande.",
        priority: "Medel",
        sections: [
          {
            heading: "Krav",
            body:
              "Operatörer ska ha rätt tillstånd, försäkring, säkra fordon och god service. Avvikelser ska rapporteras.",
          },
        ],
      },
      {
        id: "chaufforsguide",
        title: "Chaufförsguide",
        text: "Körorder, passagerarlista, scanning och rapportering.",
        priority: "Senare",
        sections: [
          {
            heading: "Kommande guide",
            body:
              "Denna guide byggs ut när chaufförsappen och körorderflödet är färdigt.",
          },
        ],
      },
    ],
  },
  {
    id: "templates-system",
    title: "Mallar & systemguider",
    description:
      "Färdiga texter, SMS, mejl, chattmallar och guider för portalen och apparna.",
    documents: [
      {
        id: "mallar",
        title: "Färdiga mejl, SMS och chattmeddelanden",
        text: "Mallar för offertuppföljning, påminnelse, tack efter resa och klagomål.",
        priority: "Medel",
        sections: [
          {
            heading: "Syfte",
            body:
              "Mallar hjälper agenten att svara snabbt, professionellt och enhetligt.",
          },
          {
            heading: "Exempel på mallar",
            body:
              "Här kan vi senare lägga in färdiga texter för offertuppföljning, bokningsbekräftelse, påminnelse inför resa, tack efter resa och klagomål.",
          },
        ],
      },
      {
        id: "systemguider",
        title: "Systemmanualer",
        text: "Så använder man dashboard, offerter, bokningar, biljetter och appar.",
        priority: "Medel",
        sections: [
          {
            heading: "Systemstöd",
            body:
              "Här samlas steg-för-steg-guider för adminappen, agentappen, partnerportal och chaufförsapp.",
          },
        ],
      },
      {
        id: "faq",
        title: "Vanliga frågor",
        text: "Samlad FAQ för kunder, agenter, partners och chaufförer.",
        priority: "Medel",
        sections: [
          {
            heading: "FAQ",
            body:
              "Här bygger vi vidare med vanliga frågor och rekommenderade svar för kundservice.",
          },
        ],
      },
    ],
  },
];

export function getAllHelpDocuments() {
  return HELP_CATEGORIES.flatMap((category) =>
    category.documents.map((document) => ({
      ...document,
      categoryId: category.id,
      categoryTitle: category.title,
    }))
  );
}

export function getHelpDocumentById(id: string) {
  return getAllHelpDocuments().find((document) => document.id === id) || null;
}