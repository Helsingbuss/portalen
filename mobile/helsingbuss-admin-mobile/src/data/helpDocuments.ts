export type HelpDocument = {
  id: string;
  title: string;
  text: string;
  priority: "Hög" | "Medel" | "Senare";
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
      },
      {
        id: "kundbemotande",
        title: "Kundbemötande",
        text: "Hur vi pratar med kunder i mejl, telefon, chatt och SMS.",
        priority: "Hög",
      },
      {
        id: "sekretess",
        title: "Sekretess & kunduppgifter",
        text: "Hur kunddata ska hanteras och vad som aldrig får delas eller sparas privat.",
        priority: "Hög",
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
      },
      {
        id: "bokningsmanual",
        title: "Så skapar du en bokning",
        text: "Från accepterad offert till bekräftad bokning med rätt kontrollpunkter.",
        priority: "Hög",
      },
      {
        id: "andringar",
        title: "Ändringar i bokning",
        text: "Hur ändrade tider, extra stopp och nya uppgifter ska dokumenteras.",
        priority: "Medel",
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
      },
      {
        id: "prisfraga",
        title: "Kund som vill ha lägre pris",
        text: "Färdiga svar när kund tycker priset är högt.",
        priority: "Medel",
      },
      {
        id: "fordonsfraga",
        title: "Kund som frågar om fordon",
        text: "Hur vi förklarar turistbuss, regionbuss, minibuss och partnerfordon.",
        priority: "Medel",
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
      },
      {
        id: "airport-shuttle-guide",
        title: "Airport Shuttle-guide",
        text: "Hur flygbussbiljetter, QR-koder, avgångar och kundfrågor hanteras.",
        priority: "Medel",
      },
      {
        id: "resevillkor",
        title: "Resevillkor",
        text: "Avbokning, ändring, missad avgång, försening och återbetalning.",
        priority: "Medel",
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
      },
      {
        id: "operator-regler",
        title: "Krav på operatörer",
        text: "Fordon, tillstånd, försäkring, säkerhet, service och bemötande.",
        priority: "Medel",
      },
      {
        id: "chaufforsguide",
        title: "Chaufförsguide",
        text: "Körorder, passagerarlista, scanning och rapportering.",
        priority: "Senare",
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
      },
      {
        id: "systemguider",
        title: "Systemmanualer",
        text: "Så använder man dashboard, offerter, bokningar, biljetter och appar.",
        priority: "Medel",
      },
      {
        id: "faq",
        title: "Vanliga frågor",
        text: "Samlad FAQ för kunder, agenter, partners och chaufförer.",
        priority: "Medel",
      },
    ],
  },
];
