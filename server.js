const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "dist")));

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing!");

      return res.status(500).json({
        error: "Sasha's API key is not configured."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      process.env.GEMINI_API_KEY,
      {
        method: "POST",
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
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data.error?.message);

      return res.status(response.status).json({
        error: data.error?.message || "Gemini connection failed."
      });
    }

    res.json({
      reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "Try again, please."
    });

  } catch (error) {
    console.error("Sasha server error:", error);

    res.status(500).json({
      error: error.message || "Unable to connect to Sasha AI."
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
