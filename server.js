



const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));

// Gemini primary and backup models
const MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite"
];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;
const FISH_AUDIO_VOICE_ID = process.env.FISH_AUDIO_VOICE_ID;

// Sasha AI personality
const SYSTEM_INSTRUCTION = `
You are Sasha AI, a smart, friendly Jamaican female AI assistant.

Your personality:
- Warm, natural and friendly Jamaican personality.
- Speak clear, natural English with occasional gentle Jamaican expressions.
- Be intelligent, helpful, conversational and practical.
- Give direct answers in plain English.
- Understand context from previous messages.
- Explain technology and complicated topics simply.
- Be confident but honest when you do not know something.
- Keep answers relevant and avoid unnecessary repetition.
- Think carefully and give useful, accurate answers.

Never:
- Write poems or rhymes.
- Use roleplay narration or stage directions.
- Describe actions in brackets.
- Make every answer sound like a performance.
- Invent facts or pretend to have completed actions.

You are Sasha AI. Speak naturally, like a helpful person having a conversation.
`;

// Prepare conversation history
function prepareContents(messages) {
  return messages
    .filter(message =>
      message &&
      typeof message.text === "string" &&
      message.text.trim()
    )
    .slice(-30)
    .map(message => ({
      role:
        message.role === "assistant" || message.role === "model"
          ? "model"
          : "user",
      parts: [{ text: message.text }]
    }));
}

// Request a Gemini model
async function requestGemini(model, contents, signal) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    }),
    signal
  });
}

// Try primary model, then backup model
async function getGeminiStream(contents, signal) {
  let lastError = "No Gemini model was available.";

  for (const model of MODELS) {
    console.log(`Trying Gemini model: ${model}`);

    try {
      const response = await requestGemini(
        model,
        contents,
        signal
      );

      if (response.ok) {
        console.log(`Gemini connected successfully: ${model}`);
        return response;
      }

      const detail = await response.text();

      console.error(
        `Gemini ${model} error:`,
        response.status,
        detail
      );

      lastError = detail || `HTTP ${response.status}`;

      if ([429, 500, 502, 503, 504].includes(response.status)) {
        console.log(`Trying the next Gemini model.`);
        continue;
      }

      throw new Error(
        `Gemini returned HTTP ${response.status}: ${lastError}`
      );

    } catch (error) {
      if (signal.aborted) {
        throw error;
      }

      if (error.message.startsWith("Gemini returned HTTP")) {
        throw error;
      }

      lastError = error.message;
      console.error(`Gemini connection error: ${error.message}`);
    }
  }

  throw new Error(`All Gemini models failed. ${lastError}`);
}

// Send an event in the format expected by App.jsx
function sendEvent(res, eventName, data) {
  if (!res.destroyed && !res.writableEnded) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// Process one Gemini SSE event
function processGeminiEvent(event, res) {
  const dataLines = event
    .split("\n")
    .filter(line => line.startsWith("data:"))
    .map(line => line.slice(5).trim());

  if (!dataLines.length) return "";

  const rawData = dataLines.join("\n");

  if (!rawData || rawData === "[DONE]") return "";

  let parsed;

  try {
    parsed = JSON.parse(rawData);
  } catch {
    console.error("Gemini event parsing error:", rawData);
    throw new Error("Gemini returned an unreadable response.");
  }

  if (parsed.error) {
    throw new Error(
      parsed.error.message || "Gemini stream error."
    );
  }

  const parts =
    parsed.candidates?.[0]?.content?.parts || [];

  let combinedText = "";

  for (const part of parts) {
    if (typeof part.text === "string" && part.text.length > 0) {
      combinedText += part.text;
    }
  }

  if (parsed.candidates?.[0]?.finishReason) {
    console.log(
      "Gemini finish reason:",
      parsed.candidates[0].finishReason
    );
  }

  if (combinedText) {
    sendEvent(res, "token", { text: combinedText });
  }

  return combinedText;
}

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing in Render."
    });
  }

  const messages = req.body.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: "Please send a message."
    });
  }

  const contents = prepareContents(messages);

  if (!contents.length) {
    return res.status(400).json({
      error: "No valid messages were received."
    });
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    console.error("Gemini request timed out.");
    controller.abort();
  }, 90000);

  res.on("close", () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  try {
    const geminiResponse = await getGeminiStream(
      contents,
      controller.signal
    );

    if (!geminiResponse.body) {
      throw new Error("Gemini returned an empty response stream.");
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let reply = "";
    let buffer = "";

    const reader = geminiResponse.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        reply += processGeminiEvent(event, res);
      }
    }

    buffer += decoder.decode();
    buffer = buffer.replace(/\r\n/g, "\n");

    if (buffer.trim()) {
      reply += processGeminiEvent(buffer, res);
    }

    console.log(
      `Gemini response completed. Text characters: ${reply.length}`
    );

    if (!reply.trim()) {
      throw new Error(
        "Gemini connected but returned no text. Please try again."
      );
    }

    sendEvent(res, "done", { reply });

    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }

  } catch (error) {
    console.error("Chat error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || "Sasha could not get a response."
      });
    } else if (!res.writableEnded && !res.destroyed) {
      sendEvent(res, "error", {
        error: error.message || "Sasha could not finish responding."
      });
      res.end();
    }

  } finally {
    clearTimeout(timeout);
  }
});

// Fish Audio speech endpoint
// Supports both GET (used by App.jsx) and POST.
async function generateSpeech(req, res) {
  if (!FISH_AUDIO_API_KEY || !FISH_AUDIO_VOICE_ID) {
    return res.status(500).json({
      error: "Fish Audio API key or voice ID is missing."
    });
  }

  const text = req.method === "GET"
    ? req.query.text
    : req.body?.text;

  if (!text || typeof text !== "string") {
    return res.status(400).json({
      error: "Speech text is required."
    });
  }

  if (text.length > 3000) {
    return res.status(400).json({
      error: "Speech text is too long."
    });
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 60000);

  res.on("close", () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
        "Content-Type": "application/json",
        "model": "s2.1-pro-free"
      },
      body: JSON.stringify({
        text,
        reference_id: FISH_AUDIO_VOICE_ID,
        format: "mp3",
        latency: "balanced"
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const detail = await response.text();

      console.error("Fish Audio error:", response.status, detail);

      if (!res.headersSent) {
        return res.status(response.status).json({
          error: "Fish Audio could not generate speech.",
          details: detail
        });
      }

      return;
    }

    const audioBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    if (!res.destroyed && !res.writableEnded) {
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "no-cache");
      res.send(audioBuffer);
    }

  } catch (error) {
    console.error("Speech error:", error.message);

    if (!res.headersSent && !res.destroyed) {
      res.status(500).json({
        error: "Sasha's voice service could not respond."
      });
    }

  } finally {
    clearTimeout(timeout);
  }
}

app.get("/api/speech", generateSpeech);
app.post("/api/speech", generateSpeech);

// Serve React application
app.use(express.static(path.join(__dirname, "dist")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sasha AI running on port ${PORT}`);
  console.log(`Primary model: ${MODELS[0]}`);
  console.log(`Backup model: ${MODELS[1]}`);
});
