


const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));

// Gemini primary and backup models
const MODELS = [
  "gemini-3.8-flash",
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
        temperature: 0.8,
        maxOutputTokens: 2048
      }
    }),
    signal
  });
}

// Try primary model, then backup model
async function getGeminiStream(contents, signal) {
  let lastError = "";

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

      lastError = detail;

      if (
        [429, 500, 502, 503, 504].includes(response.status)
      ) {
        console.log(`Switching from ${model} to backup if available.`);
        continue;
      }

      throw new Error(
        `Gemini returned HTTP ${response.status}: ${detail}`
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

  throw new Error(
    `All Gemini models failed. ${lastError}`
  );
}

// Send text to the app in its expected SSE format
function sendText(res, text) {
  if (!res.destroyed && !res.writableEnded) {
    res.write(
      `data: ${JSON.stringify({ text })}\n\n`
    );
  }
}

// Process one Gemini SSE event
function processGeminiEvent(event, res) {
  const dataLines = event
    .split("\n")
    .filter(line => line.startsWith("data:"))
    .map(line => line.slice(5).trim());

  if (!dataLines.length) return 0;

  const rawData = dataLines.join("\n");

  if (!rawData || rawData === "[DONE]") return 0;

  let parsed;

  try {
    parsed = JSON.parse(rawData);
  } catch (error) {
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

  let textLength = 0;

  for (const part of parts) {
    if (typeof part.text === "string" && part.text.length > 0) {
      sendText(res, part.text);
      textLength += part.text.length;
    }
  }

  if (parsed.candidates?.[0]?.finishReason) {
    console.log(
      "Gemini finish reason:",
      parsed.candidates[0].finishReason
    );
  }

  return textLength;
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

    const reader = geminiResponse.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let totalTextLength = 0;

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      // Normalize Windows and Unix line endings
      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n/g, "\n");

      // Process complete SSE events
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        totalTextLength += processGeminiEvent(event, res);
      }
    }

    // Process any remaining data after the stream ends
    buffer += decoder.decode();
    buffer = buffer.replace(/\r\n/g, "\n");

    if (buffer.trim()) {
      totalTextLength += processGeminiEvent(buffer, res);
    }

    console.log(
      `Gemini response completed. Text characters: ${totalTextLength}`
    );

    if (totalTextLength === 0) {
      throw new Error(
        "Gemini connected but returned no text. Please try again."
      );
    }

    if (!res.writableEnded && !res.destroyed) {
      res.write("data: [DONE]\n\n");
      res.end();
    }

  } catch (error) {
    console.error("Chat error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || "Sasha could not get a response."
      });
    } else if (!res.writableEnded && !res.destroyed) {
      res.write(
        `data: ${JSON.stringify({
          error: error.message || "Sasha could not finish responding."
        })}\n\n`
      );
      res.end();
    }

  } finally {
    clearTimeout(timeout);
  }
});

// Fish Audio speech endpoint
app.post("/api/speech", async (req, res) => {
  if (!FISH_AUDIO_API_KEY || !FISH_AUDIO_VOICE_ID) {
    return res.status(500).json({
      error: "Fish Audio API key or voice ID is missing."
    });
  }

  const text = req.body.text;

  if (!text || typeof text !== "string") {
    return res.status(400).json({
      error: "Speech text is required."
    });
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 60000);

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

      return res.status(response.status).json({
        error: "Fish Audio could not generate speech.",
        details: detail
      });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");

    const reader = response.body.getReader();

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      if (!res.destroyed) {
        res.write(Buffer.from(value));
      } else {
        break;
      }
    }

    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }

  } catch (error) {
    console.error("Speech error:", error.message);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Sasha's voice service could not respond."
      });
    } else if (!res.destroyed) {
      res.end();
    }

  } finally {
    clearTimeout(timeout);
  }
});

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
