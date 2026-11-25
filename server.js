
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "dist")));

async function askGemini(message) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Sasha's API key is not configured.");
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" +
    apiKey;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are Sasha AI, a friendly Jamaican female AI assistant. Speak naturally in clear English with gentle Jamaican expressions. Be warm, direct and helpful. Never use poetry, rhymes or dramatic roleplay."
            }]
          },
          contents: [{
            parts: [{ text: message }]
          }]
        })
      });

      const data = await response.json();

      if (response.ok) {
        return (
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I couldn't generate a reply. Please try again."
        );
      }

      const status = response.status;
      const errorMessage =
        data.error?.message || "Google AI is temporarily unavailable.";

      console.error("Gemini API error:", status, errorMessage);

      if (![429, 500, 502, 503, 504].includes(status)) {
        throw new Error(errorMessage);
      }

      if (attempt === 3) {
        throw new Error(
          "Google AI is busy right now. Please try again shortly."
        );
      }
    } catch (error) {
      if (attempt === 3) {
        if (error.name === "AbortError") {
          throw new Error("Sasha timed out waiting for Google. Please try again.");
        }
        throw error;
      }

      if (
        error.message &&
        !error.message.includes("fetch failed") &&
        error.name !== "AbortError" &&
        !error.message.includes("Google AI is busy")
      ) {
        throw error;
      }

      console.log("Retrying Gemini request:", attempt);
    } finally {
      clearTimeout(timeout);
    }

    await new Promise(resolve =>
      setTimeout(resolve, attempt * 1500)
    );
  }
}

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const reply = await askGemini(message);

    res.json({ reply });

  } catch (error) {
    console.error("Sasha server error:", error.message);

    res.status(503).json({
      error: error.message || "Sasha is temporarily unavailable."
    });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Sasha AI is running!");
});

