export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
  }

  try {
    const { prompt, systemInstruction, responseMimeType } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (responseMimeType) {
      body.generationConfig = {
        responseMimeType
      };
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: JSON.stringify(data)
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("")
        .trim() || "";

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
