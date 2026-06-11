export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GROQ_API_KEY2;
  if (!apiKey)
    return res.status(500).json({ error: "API key مش موجود على السيرفر" });

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    const contentType = req.headers["content-type"];

    const response = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": contentType,
        },
        body: rawBody,
      },
    );

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res
        .status(500)
        .json({ error: "Response مش JSON: " + text.substring(0, 200) });
    }

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data.error?.message || "خطأ من Groq" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "حصل خطأ في السيرفر: " + err.message });
  }
}
