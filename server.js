
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

async function askGemini(message) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Sasha's API key is not configured.");
  }

  for (const model of MODELS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: `You are Sasha AI, a smart, friendly Jamaican female AI assistant.
Speak naturally in clear English with gentle Jamaican expressions.
Be warm, intelligent, confident and conversational.
Give direct, accurate and useful answers.
Explain complicated technology simply.
Never use poetry, rhymes, dramatic roleplay or stage directions.
Never invent facts when uncertain.
Your name is Sasha AI.`
              }]
            },
            contents: [{
              role: "user",
              parts: [{ text: message }]
            }],
            generationConfig: {
              maxOutputTokens: 400
            }
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        const reply = data.candidates?.[0]?.content?.parts
          ?.map(part => part.text || "")
          .join("")
          .trim();

        if (reply) return reply;
        throw new Error("Google returned an empty response.");
      }

      console.error(
        `${model} error:`,
        response.status,
        data.error?.message
      );

      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(data.error?.message || "Gemini request failed.");
      }

    } catch (error) {
      console.error(`${model} failed:`, error.message);

      if (model === MODELS[MODELS.length - 1]) {
        throw new Error(
          "Sasha is temporarily unavailable. Please try again shortly."
        );
      }

    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Sasha is temporarily unavailable.");
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

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sasha AI is running on port ${PORT}`);
});
