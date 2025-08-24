import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Här fejkar vi BankID-svar
  const demoResponse = {
    status: "ok",
    user: {
      name: "Demo Användare",
      personalNumber: "199001011234",
    },
  };

  // Vänta lite så det känns "på riktigt"
  setTimeout(() => {
    res.status(200).json(demoResponse);
  }, 1500);
}
