// lib/sendMail.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOfferMail(
  to: string,
  offerId: string,
  status: "new" | "answered" | "approved" | "canceled"
) {
  let subject = "";
  let html = "";

  switch (status) {
    case "new": // Mail 1 – Bekräftelse
      subject = `Tack – vi har mottagit er offertförfrågan (${offerId})`;
      html = `
        <p>Hej, Tack för er offertförfrågan!</p>
        <p>Ni kan när som helst se vad som har registrerats via länken nedan. Informationen uppdateras automatiskt i takt med att vi handlägger ärendet.</p>
        <p><a href="https://portal.helsingbuss.se/offert/${offerId}">Visa er förfrågan (${offerId})</a></p>
        <p>När er offert har prissatts får ni ett nytt meddelande.<br/>
        Välkommen att kontakta oss om ni har frågor eller synpunkter.</p>
        <p>Vänliga hälsningar,<br/>
        Helsingbuss Kundteam<br/>
        info@helsingbuss.se | +46 (0)10-405 38 38</p>
      `;
      break;

    case "answered": // Mail 2 – Offerten är prissatt
      subject = `Er offert från Helsingbuss är klar (${offerId})`;
      html = `
        <p>Hej,</p>
        <p>Nu är er offert prissatt. Ni hittar alla detaljer via länken nedan. Länken visar alltid den senaste, aktuella informationen.</p>
        <p><a href="https://portal.helsingbuss.se/offert/${offerId}">Visa er offert (${offerId})</a></p>
        <p>Hör gärna av er om ni vill justera något eller gå vidare med bokning.</p>
        <p>Vänliga hälsningar,<br/>
        Helsingbuss Kundteam<br/>
        info@helsingbuss.se | +46 (0)10-405 38 38</p>
      `;
      break;

    case "approved": // Mail 3 – Bokning klar
      subject = `Din bokning har uppdaterats (${offerId})`;
      html = `
        <p>Hej,</p>
        <p>Din bokning har uppdaterats i vårt system.<br/>
        Du kan enkelt se den senaste informationen via länken nedan:</p>
        <p><a href="https://portal.helsingbuss.se/offert/${offerId}">Visa din bokning (${offerId})</a></p>
        <p>Vi ber dig kontrollera att uppgifterna stämmer enligt dina önskemål.</p>
        <p>Har du frågor om din resa?<br/>
        Vårt Kundteam finns tillgängligt vardagar 08:00–17:00 på 010-405 38 38.<br/>
        Du kan också besvara detta mejl, så återkommer vi snarast.<br/>
        För akuta trafikärenden utanför kontorstid når du vår jour på 010-777 21 58</p>
        <p>Vänliga hälsningar,<br/>
        Helsingbuss Kundteam<br/>
        info@helsingbuss.se | +46 (0)10-405 38 38</p>
      `;
      break;

    case "canceled": // Mail 4 – Makulerad offert
      subject = `Er offertförfrågan är makulerad (${offerId})`;
      html = `
        <p>Hej,</p>
        <p>Er offertförfrågan är makulerad – vi hoppas få köra för dig vid ett annat tillfälle.</p>
        <p><a href="https://portal.helsingbuss.se/offert/${offerId}">Visa detaljer (${offerId})</a></p>
        <p>Vänliga hälsningar,<br/>
        Helsingbuss Kundteam<br/>
        info@helsingbuss.se | +46 (0)10-405 38 38</p>
      `;
      break;
  }

  return resend.emails.send({
    from: "noreply@helsingbuss.se",
    to,
    subject,
    html
  });
}
