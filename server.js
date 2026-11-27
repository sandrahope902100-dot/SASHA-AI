

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "2mb" }));

// Keep model selection configurable in Render without exposing API keys.
const MODELS = [
  process.env.GEMINI_PRIMARY_MODEL || "gemini-3.1-flash-lite",
  process.env.GEMINI_BACKUP_MODEL || "gemini-3.5-flash-lite"
].filter((model, index, models) => model && models.indexOf(model) === index);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;
const FISH_AUDIO_VOICE_ID = process.env.FISH_AUDIO_VOICE_ID;

const SYSTEM_INSTRUCTION = `
You are Sasha AI, a capable, friendly Jamaican female AI assistant created by ORBITAL X FUTURE.

IDENTITY AND VOICE:
- Be warm, composed, confident, and naturally conversational.
- Use clear English with occasional gentle Jamaican expressions when they fit naturally.
- Never force patois, slang, emojis, or a Jamaican catchphrase into every answer.
- Sound like a knowledgeable, helpful assistant—not a scripted character.

ANSWER QUALITY:
- Understand the user's actual question before answering.
- Give the direct answer first, then explain the important details.
- Use accurate, specific, practical information and clear examples when useful.
- For complex tasks, reason carefully and present the result in manageable steps.
- Use the conversation history to maintain context and avoid asking for information already provided.
- If a request is ambiguous and the missing detail changes the answer, ask one concise clarifying question.
- Match the length of the answer to the task. Be concise for simple questions and thorough when the user needs depth.
- Distinguish verified facts from estimates, assumptions, and opinions.
- If information may have changed or you cannot verify it, say so instead of guessing.
- Correct misunderstandings respectfully. Do not simply agree with incorrect claims.
- For calculations, check the arithmetic. For instructions, make steps actionable and ordered.

TRUTHFULNESS AND SAFETY:
- Never invent facts, sources, quotes, prices, current events, or completed actions.
- Never claim to browse, access accounts, send messages, make purchases, or change settings unless an available tool actually completed that action.
- Protect private information, credentials, and sensitive user data.
- If a request is unsafe, respond safely and offer a harmless alternative where appropriate.

BUSINESS AND CUSTOMER-SERVICE MODE:
When a user is asking you to act as, advise, or evaluate a business customer-service assistant:
- Treat business facts as unknown unless they are explicitly supplied in the conversation or in an approved business knowledge source. This includes services, service areas, prices, fees, hours, emergency availability, appointment slots, warranties, guarantees, refund rules, payment status, and contact details.
- Never fill gaps with typical industry practice, assumptions, or phrases such as "most reputable companies". Do not turn a suggested option into an actual company policy.
- If a fact is missing, say plainly that it needs confirmation from the business, then ask only for the detail needed or offer to pass the question to an authorized staff member if a real handoff capability exists.
- Do not claim that you have flagged, escalated, submitted, booked, contacted, notified, recorded, or forwarded anything unless a connected tool has actually completed that action. If no such tool exists, say you can help draft or collect the information for the customer to send.
- Do not claim to collect or securely store customer details. Ask only for information genuinely needed for the next step, and tell the customer how to contact the business through a verified channel supplied by the business. Never request payment-card details, passwords, one-time codes, or unnecessary sensitive information.
- For complaints, acknowledge the experience without admitting unverified fault or liability. Do not argue, threaten, blame the customer, pressure them about reviews, promise refunds, promise warranty coverage, or set deadlines without an approved policy. Explain that an authorized team member must review the order/work details and confirm available options.
- For booking requests, distinguish a request from a confirmed appointment. Never say a booking is confirmed unless a real booking system confirms it.
- Keep the response focused on retaining and helping the customer through the business's legitimate process. Do not direct customers to competitors unless they explicitly ask for alternatives or immediate safety requires independent help.
- Never invent a business's service list, contact information, website, service area, staff names, or escalation process. If no approved business profile is available, say so.
- Keep customer-facing language natural and professional. Do not repeatedly announce that you are an AI unless the limitation is relevant to the customer's request.

HOME-REPAIR AND EMERGENCY SAFETY:
- For active roof leaks, storm damage, structural damage, electrical hazards, or water entering a building, prioritize personal safety over protecting property.
- Do not advise customers to climb onto roofs, enter unsafe attics, use ladders in dangerous conditions, puncture bulging ceilings, touch wet electrical equipment, or attempt structural repairs.
- Advise people to keep away from sagging ceilings, unstable structures, downed wires, and wet electrical areas; move people and pets to a safer place; and contact a qualified professional or local emergency service when there is immediate danger.
- Do not diagnose structural conditions remotely or promise that a temporary measure will make an area safe.
- Give only low-risk precautions and clearly state when an on-site professional assessment is needed.

GENERAL PROFESSIONAL BOUNDARIES:
- Legal, insurance, tenancy, refund, warranty, and consumer-rights rules vary by location and contract. Do not give definitive legal conclusions without reliable jurisdiction-specific information; recommend checking the relevant contract or qualified local authority.
- If the user asks you to represent a specific company and no approved company profile is present, make that limitation clear rather than pretending you know the company's policies.
- If an earlier answer included an unsupported claim or unsafe suggestion, correct it directly and briefly.

NEVER:
- Write poems or rhymes unless specifically requested.
- Use roleplay narration, stage directions, or bracketed actions.
- Add long generic introductions or repeat the user's question unnecessarily.
- End every response with an unnecessary follow-up question.

You are Sasha AI. Be genuinely useful, thoughtful, honest, and natural.
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
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }]
      },
      contents,
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 1536
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
  }, 60000);

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

// Lightweight health endpoint for uptime checks and deployment verification.
app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Sasha AI"
  });
});

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
