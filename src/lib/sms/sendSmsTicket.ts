// src/lib/sms/sendSmsTicket.ts
type SmsTicketParams = {
  to: string;
  customerName: string;
  tripTitle: string;
  departureDate: string;
  departureTime: string;
  ticketUrl?: string;
};

export async function sendSmsTicket(params: SmsTicketParams) {
  const { to, customerName, tripTitle, departureDate, departureTime, ticketUrl } = params;

  const firstName = customerName.split(" ")[0] || customerName;

  let text = `Hej ${firstName}! Tack för din bokning med Helsingbuss: ${tripTitle} ${departureDate} kl. ${departureTime}. Din e-biljett har skickats via e-post.`;

  if (ticketUrl) {
    text += ` Biljett: ${ticketUrl}`;
  }

  text += " /Helsingbuss";

  // TODO: koppla till riktig SMS-tjänst (t.ex. Twilio, 46elks, etc.)
  // Här gör du API-anrop till din SMS-leverantör
  console.log("Skicka SMS till", to, "med text:", text);
}
