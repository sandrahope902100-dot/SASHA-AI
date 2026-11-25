
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite"
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

PERSONALITY:
- Warm, intelligent, confident and conversational.
- Give direct, accurate and useful answers.
- Understand context and follow-up questions.
- Explain complicated technology in simple language.
- Think carefully before answering.
- Avoid unnecessary long explanations.
- Never use poetry, rhymes, dramatic roleplay or stage directions.
- Never invent facts when uncertain.
- Sound like a real helpful assistant, not a scripted chatbot.

Your name is Sasha AI.`
              }]
            },
            contents: [{
              role: "user",
              parts: [{ text: message }]
            }],
            generationConfig: {
              maxOutputTokens: 500
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
        throw new Error(
          data.error?.message || "Google AI request failed."
        );
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


