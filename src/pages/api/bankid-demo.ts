import type { NextApiRequest, NextApiResponse } from "next";




export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // HÃƒÂ¤r fejkar vi BankID-svar
  const demoResponse = {
    status: "ok",
    user: {
      name: "Demo AnvÃƒÂ¤ndare",
      personalNumber: "199001011234",
    },
  };

  // VÃƒÂ¤nta lite sÃƒÂ¥ det kÃƒÂ¤nns "pÃƒÂ¥ riktigt"
  setTimeout(() => {
    res.status(200).json(demoResponse);
  }, 1500);
}



