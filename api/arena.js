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

    const models = ["gemini-3.8-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
    let lastError = null;
    let lastStatus = 500;

    for (const model of models) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timer);

        const data = await response.json();
        if (response.ok) {
          const text =
            data?.candidates?.[0]?.content?.parts
              ?.map((p) => p.text || "")
              .join("")
              .trim() || "";
          return res.status(200).json({ text, model });
        }

        lastStatus = response.status;
        lastError = JSON.stringify(data);
      } catch (e) {
        clearTimeout(timer);
        lastStatus = 504;
        lastError = e.name === "AbortError" ? `${model} timeout` : e.message;
      }
    }

    return res.status(lastStatus).json({ error: lastError || "All models failed" });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
