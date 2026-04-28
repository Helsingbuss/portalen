export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { id } = req.query;

  try {
    await db.offer.update({
      where: { id },
      data: { status: "arkiverad" },
    });

    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Kunde inte arkivera" });
  }
}
