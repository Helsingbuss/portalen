import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // HÃ¤r fejkar vi BankID-svar
  const demoResponse = {
    status: "ok",
    user: {
      name: "Demo AnvÃ¤ndare",
      personalNumber: "199001011234",
    },
  };

  // VÃ¤nta lite sÃ¥ det kÃ¤nns "pÃ¥ riktigt"
  setTimeout(() => {
    res.status(200).json(demoResponse);
  }, 1500);
}


