
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "dist")));

const MODEL = "gemini-3.8-flash";

const SASHA_INSTRUCTIONS = `
You are Sasha AI, a smart, friendly Jamaican female AI assistant.

PERSONALITY:
- Warm, natural, confident and intelligent.
- Speak clear English with gentle Jamaican expressions.
- Sound like a helpful real conversational assistant.
- Use Jamaican expressions naturally, not excessively.
- Never use poetry, rhymes, dramatic roleplay or stage directions.

INTELLIGENCE:
- Understand the full conversation and remember its context.
- Answer the actual question directly.
- Give accurate, useful and well-explained answers.
- Explain complicated technology in simple language.
- Break complicated tasks into practical steps.
- Do not repeat the same generic answer.
- If a question is unclear, ask one useful clarification.
- Never invent facts, sources, capabilities or actions.
- Be honest when you do not know something.

Keep ordinary answers concise, but give detail when it is needed.
Your name is Sasha AI.
`;

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Sasha's Gemini API key is not configured."
    });
  }

  const incoming = req.body?.messages;

  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({
      error: "Please send a conversation."
    });
  }

  const contents = incoming
    .filter(item =>
      item &&
      ["user", "assistant"].includes(item.role) &&
      typeof item.text === "string" &&
      item.text.trim()
    )
    .slice(-20)
    .map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text.trim().slice(0, 6000) }]
    }));

  if (!contents.length || contents[contents.length - 1].role !== "user") {
    return res.status(400).json({
      error: "Your latest message is missing."
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  req.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SASHA_INSTRUCTIONS }]
        },
        contents,
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini error:", response.status, detail);

      if (!res.headersSent) {
        return res.status(response.status).json({
          error: response.status === 429
            ? "Sasha is receiving too many requests. Please wait a moment and try again."
            : "Sasha couldn't get an answer from Gemini. Please try again."
        });
      }

      sendEvent(res, "error", {
        error: "Sasha couldn't finish generating her answer."
      });
      return res.end();
    }

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let fullReply = "";

    function processSSELine(line) {
      const trimmed = line.trim();

      if (!trimmed.startsWith("data:")) return;

      const raw = trimmed.slice(5).trim();

      if (!raw || raw === "[DONE]") return;

      try {
        const chunk = JSON.parse(raw);
        const parts = chunk.candidates?.[0]?.content?.parts || "";

        const text = Array.isArray(parts)
          ? parts.map(part => part.text || "").join("")
          : "";

        if (text) {
          fullReply += text;
          sendEvent(res, "token", { text });
        }
      } catch (error) {
        console.error("Gemini stream parsing error:", error.message);
      }
    }

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        processSSELine(line);
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      processSSELine(buffer);
    }

    if (!fullReply.trim()) {
      sendEvent(res, "error", {
        error: "Gemini returned an empty answer. Please try again."
      });
    } else {
      sendEvent(res, "done", {
        reply: fullReply.trim()
      });
    }

    res.end();

  } catch (error) {
    console.error("Gemini request failed:", error.message);

    if (!res.headersSent) {
      res.status(503).json({
        error: error.name === "AbortError"
          ? "Sasha's response took too long. Please try again."
          : "Sasha couldn't connect to Gemini. Please try again."
      });
    } else if (!res.writableEnded) {
      sendEvent(res, "error", {
        error: "Sasha lost connection while answering."
      });
      res.end();
    }
  } finally {
    clearTimeout(timeout);
  }
});

// Fish Audio: stream audio bytes directly to the browser.
app.get("/api/speech", async (req, res) => {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  const voiceId = process.env.FISH_AUDIO_VOICE_ID;
  const text = req.query?.text;

  if (!apiKey || !voiceId) {
    return res.status(500).send("Sasha's voice settings are not configured.");
  }

  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).send("No speech text was provided.");
  }

  if (text.length > 4000) {
    return res.status(400).send("The speech text is too long.");
  }

  const controller = new AbortController();

  req.on("close", () => controller.abort());

  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "model": "s2.1-pro-free"
      },
      body: JSON.stringify({
        text: text.trim(),
        reference_id: voiceId,
        format: "mp3",
        latency: "balanced"
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("Fish Audio error:", response.status, detail);

      if (!res.headersSent) {
        return res.status(502).send(
          "Sasha's voice service could not generate speech."
        );
      }

      return res.end();
    }

    res.status(200);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = response.body.getReader();

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      if (!res.write(Buffer.from(value))) {
        await new Promise(resolve => res.once("drain", resolve));
      }
    }

    res.end();

  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Fish Audio speech error:", error.message);

      if (!res.headersSent) {
        res.status(503).send(
          "Sasha could not speak just now. Please try again."
        );
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sasha AI is running on port ${PORT}`);
});

