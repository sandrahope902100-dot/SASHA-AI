
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

const MODEL = "gemini-3.1-flash-lite";

async function askGemini(message) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Sasha's API key is not configured.");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are Sasha AI, a friendly Jamaican female AI assistant. Speak naturally in clear English with gentle Jamaican expressions. Be warm, direct, helpful and conversational. Explain technology simply. Never use poetry, rhymes, dramatic roleplay or stage directions."
            }]
          },
          contents: [{
            role: "user",
            parts: [{ text: message }]
          }],
          generationConfig: {
            maxOutputTokens: 700
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        const reply =
          data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        if (reply) return reply;
        throw new Error("Google returned an empty response.");
      }

      const detail =
        data.error?.message || "Google AI is unavailable.";

      console.error("Gemini API error:", response.status, detail);

      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(detail);
      }

      if (attempt === 2) {
        throw new Error("Google AI is busy. Please try Sasha again shortly.");
      }

    } catch (error) {
      if (attempt === 2) {
        if (error.name === "AbortError") {
          throw new Error("Google took too long to respond. Please try again.");
        }
        if (
          error.cause?.code === "UND_ERR_HEADERS_TIMEOUT" ||
          error.message === "fetch failed"
        ) {
          throw new Error("Sasha could not reach Google. Please try again shortly.");
        }
        throw error;
      }

      if (
        error.name !== "AbortError" &&
        error.message !== "fetch failed" &&
        error.cause?.code !== "UND_ERR_HEADERS_TIMEOUT" &&
        !error.message.includes("Google AI is busy")
      ) {
        throw error;
      }

      console.log("Retrying Google connection...");
    } finally {
      clearTimeout(timeout);
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const reply = await askGemini(message.trim());
    res.json({ reply });

  } catch (error) {
    console.error("Sasha server error:", error.message);
    res.status(503).json({
      error: error.message || "Sasha is temporarily unavailable."
    });
  }
});

// Fish Audio voice endpoint
app.post("/api/speech", async (req, res) => {
  try {
    const apiKey = process.env.FISH_AUDIO_API_KEY;
    const voiceId = process.env.FISH_AUDIO_VOICE_ID;
    const text = req.body?.text;

    if (!apiKey || !voiceId) {
      return res.status(500).json({
        error: "Sasha's voice settings are not configured."
      });
    }

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        error: "No speech text was provided."
      });
    }

    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "model": "s2.1-pro-free"
      },
      body: JSON.stringify({
        text: text.trim(),
        reference_id: voiceId,
        format: "mp3"
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Fish Audio error:", response.status, detail);

      return res.status(502).json({
        error: "Sasha's voice service could not generate speech."
      });
    }

    const audio = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(audio);

  } catch (error) {
    console.error("Fish Audio speech error:", error.message);

    res.status(503).json({
      error: "Sasha could not speak just now. Please try again."
    });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Sasha AI is running on port ${PORT}`);
});

