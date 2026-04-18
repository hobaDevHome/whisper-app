import formidable from "formidable";
import fs from "fs";
import FormData from "form-data";

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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return res.status(500).json({ error: "API key مش موجود على السيرفر" });

  try {
    // parse الـ multipart form data
    const form = formidable({ keepExtensions: true });
    const [fields, files] = await form.parse(req);

    const audioFile = files.file?.[0];
    const model = fields.model?.[0] || "gpt-4o-mini-transcribe";
    const language = fields.language?.[0] || "ar";
    const prompt = fields.prompt?.[0] || "";

    if (!audioFile) {
      return res.status(400).json({ error: "مفيش ملف صوتي" });
    }

    // بنبني FormData جديد نبعته لـ OpenAI
    const formData = new FormData();
    formData.append("file", fs.createReadStream(audioFile.filepath), {
      filename: audioFile.originalFilename || "audio.webm",
      contentType: audioFile.mimetype || "audio/webm",
    });
    formData.append("model", model);
    formData.append("language", language);
    if (prompt) formData.append("prompt", prompt);

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...formData.getHeaders(),
        },
        body: formData,
      },
    );

    const data = await response.json();

    // cleanup temp file
    fs.unlink(audioFile.filepath, () => {});

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: data.error?.message || "خطأ من OpenAI" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "حصل خطأ في السيرفر: " + err.message });
  }
}
