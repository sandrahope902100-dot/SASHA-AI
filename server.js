

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));

const MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite"
];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;
const FISH_AUDIO_VOICE_ID = process.env.FISH_AUDIO_VOICE_ID;

const SYSTEM_INSTRUCTION = `
You are Sasha AI, a smart, friendly Jamaican female AI assistant.

PERSONALITY:
- Warm, natural and friendly.
- Speak clear, natural English with occasional gentle Jamaican expressions.
- Be intelligent, helpful, conversational and practical.
- Give direct answers in plain English.
- Remember and use the conversation context provided.
- Explain complicated topics simply.
- Be confident but honest when you do not know something.
- Keep answers relevant and avoid unnecessary repetition.
- Give useful, accurate answers.

NEVER:
- Write poems or rhymes unless specifically requested.
- Use roleplay narration or stage directions.
- Describe actions in brackets.
- Make every answer sound like a performance.
- Invent facts or pretend to have completed actions.
- Claim to access accounts, websites or devices unless a connected tool actually allows it.

You are Sasha AI. Speak naturally, like a helpful person having a conversation.
`;

function prepareContents(messages) {
  const valid = messages
    .filter(message =>
      message &&
      typeof message.text === "string" &&
      message.text.trim()
    )
    .slice(-30);

  // Gemini conversations should begin with a user message.
  const firstUserIndex = valid.findIndex(
    message => message.role !== "assistant" &&
               message.role !== "model"
  );

  if (firstUserIndex === -1) return [];

  return valid.slice(firstUserIndex).map(message => ({
    role:
      message.role === "assistant" || message.role === "model"
        ? "model"
        : "user",
    parts: [{ text: message.text.trim() }]
  }));
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
        temperature: 0.65,
        maxOutputTokens: 2048
      }
    }),
    signal
  });
}

async function getGeminiStream(contents, signal) {
  let lastError = "No Gemini model was available.";

  for (const model of MODELS) {
    console.log(`Trying Gemini model: ${model}`);

    // Retry temporary server/network failures once.
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (signal.aborted) {
        throw new Error("The request was cancelled.");
      }

      try {
        const response = await requestGemini(
          model,
          contents,
          signal
        );

        if (response.ok) {
          console.log(`Gemini connected: ${model}`);
          return response;
        }

        const detail = await response.text();
        lastError = detail || `HTTP ${response.status}`;

        console.error(
          `Gemini ${model} returned ${response.status}:`,
          detail
        );

        // A 429 usually means quota/rate limits.
        // Move to the backup model instead of repeatedly waiting.
        if (response.status === 429) {
          break;
        }

        const temporaryError = [
          500, 502, 503, 504
        ].includes(response.status);

        if (temporaryError && attempt === 1) {
          await wait(700);
          continue;
        }

        break;

      } catch (error) {
        if (signal.aborted) throw error;

        lastError = error.message || "Network error.";

        console.error(
          `Gemini connection issue (${model}):`,
          lastError
        );

        if (attempt === 1) {
          await wait(700);
        }
      }
    }
  }

  throw new Error(
    `Sasha could not reach Gemini. ${lastError}`
  );
}

function sendEvent(res, eventName, data) {
  if (!res.destroyed && !res.writableEnded) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

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
    console.error("Could not parse Gemini event:", rawData);
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
    if (typeof part.text === "string") {
      combinedText += part.text;
    }
  }

  if (combinedText) {
    sendEvent(res, "token", { text: combinedText });
  }

  return combinedText;
}

app.post("/api/chat", async (req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is missing in Render environment variables."
    });
  }

  const messages = req.body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: "Please send a message."
    });
  }

  const contents = prepareContents(messages);

  if (!contents.length) {
    return res.status(400).json({
      error: "No valid user message was received."
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

    res.status(200);
    res.setHeader(
      "Content-Type",
      "text/event-stream; charset=utf-8"
    );
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

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

    if (!reply.trim()) {
      throw new Error(
        "Gemini connected but returned no text. Please try again."
      );
    }

    console.log(
      `Gemini response completed: ${reply.length} characters.`
    );

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

// Fish Audio speech endpoint.
// Streams audio chunks to the browser as they arrive.
async function generateSpeech(req, res) {
  if (!FISH_AUDIO_API_KEY || !FISH_AUDIO_VOICE_ID) {
    return res.status(500).json({
      error: "Fish Audio API key or voice ID is missing in Render."
    });
  }

  const text = req.method === "GET"
    ? req.query.text
    : req.body?.text;

  if (typeof text !== "string" || !text.trim()) {
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
    console.error("Fish Audio request timed out.");
    controller.abort();
  }, 60000);

  res.on("close", () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });

  try {
    const response = await fetch(
      "https://api.fish.audio/v1/tts",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
          "Content-Type": "application/json",
          "model": "s2.1-pro-free"
        },
        body: JSON.stringify({
          text: text.trim(),
          reference_id: FISH_AUDIO_VOICE_ID,
          format: "mp3",
          latency: "balanced"
        }),
        signal: controller.signal
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        "Fish Audio error:",
        response.status,
        detail
      );

      return res.status(response.status).json({
        error: "Fish Audio could not generate speech.",
        details: detail
      });
    }

    if (!response.body) {
      throw new Error("Fish Audio returned no audio stream.");
    }

    res.status(200);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const reader = response.body.getReader();

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;
      if (res.destroyed || res.writableEnded) break;

      if (!res.write(Buffer.from(value))) {
        await new Promise(resolve => res.once("drain", resolve));
      }
    }

    if (!res.destroyed && !res.writableEnded) {
      res.end();
    }

  } catch (error) {
    console.error("Speech error:", error.message);

    if (!res.headersSent && !res.destroyed) {
      res.status(500).json({
        error: "Sasha's voice service could not respond."
      });
    } else if (!res.destroyed && !res.writableEnded) {
      res.end();
    }

  } finally {
    clearTimeout(timeout);
  }
}

app.get("/api/speech", generateSpeech);
app.post("/api/speech", generateSpeech);

// Serve the React application.
app.use(express.static(path.join(__dirname, "dist")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sasha AI running on port ${PORT}`);
  console.log(`Primary model: ${MODELS[0]}`);
  console.log(`Backup model: ${MODELS[1]}`);
});
