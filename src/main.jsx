
import React, { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";

function SashaAI() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hey! I'm Sasha AI. Wah gwaan? I'm ready to chat, answer questions and help you get things done. You can type or use the microphone to talk to me."
    }
  ]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  const voiceRequestRef = useRef(0);
  const speechQueueRef = useRef([]);
  const speechWorkerRef = useRef(false);
  const voiceEnabledRef = useRef(true);
  const nextSpeechRef = useRef(null);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  function stopSpeaking() {
    voiceRequestRef.current++;

    speechQueueRef.current = [];
    nextSpeechRef.current = null;
    speechWorkerRef.current = false;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setSpeaking(false);
  }

  async function fetchSpeech(text, requestId) {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new Error(
        errorData.error || "Fish Audio could not generate speech."
      );
    }

    const audioBlob = await response.blob();

    if (
      requestId !== voiceRequestRef.current ||
      !voiceEnabledRef.current
    ) {
      return null;
    }

    return URL.createObjectURL(audioBlob);
  }

  function prepareNextSpeech(requestId) {
    if (
      !speechQueueRef.current.length ||
      requestId !== voiceRequestRef.current ||
      !voiceEnabledRef.current
    ) {
      return null;
    }

    const text = speechQueueRef.current.shift();

    return fetchSpeech(text, requestId);
  }

  function queueSpeech(text) {
    const cleanText = text.trim();

    if (!voiceEnabledRef.current || !cleanText) return;

    speechQueueRef.current.push(cleanText);

    if (!speechWorkerRef.current) {
      playSpeechQueue();
      return;
    }

    // Prepare the next audio while the current segment plays.
    if (
      audioRef.current &&
      !nextSpeechRef.current &&
      speechQueueRef.current.length
    ) {
      const requestId = voiceRequestRef.current;
      nextSpeechRef.current = prepareNextSpeech(requestId);
    }
  }

  async function playSpeechQueue() {
    if (speechWorkerRef.current) return;

    speechWorkerRef.current = true;

    const requestId = voiceRequestRef.current;

    try {
      let preparedUrl = await prepareNextSpeech(requestId);

      while (
        preparedUrl &&
        requestId === voiceRequestRef.current &&
        voiceEnabledRef.current
      ) {
        const audio = new Audio(preparedUrl);

        audioRef.current = audio;
        audio.preload = "auto";
        audioUrlRef.current = preparedUrl;

        const playback = new Promise((resolve, reject) => {
          audio.onplay = () => {
            if (requestId === voiceRequestRef.current) {
              setSpeaking(true);
              setVoiceError("");
            }
          };

          audio.onended = resolve;

          audio.onerror = () => {
            reject(new Error("Audio playback failed."));
          };

          audio.play().catch(reject);
        });

        // Start generating the following segment during playback.
        if (
          speechQueueRef.current.length &&
          !nextSpeechRef.current
        ) {
          nextSpeechRef.current = prepareNextSpeech(requestId);
        }

        await playback;

        URL.revokeObjectURL(preparedUrl);

        if (audioUrlRef.current === preparedUrl) {
          audioUrlRef.current = null;
        }

        if (audioRef.current === audio) {
          audioRef.current = null;
        }

        if (requestId !== voiceRequestRef.current) break;

        setSpeaking(false);

        if (nextSpeechRef.current) {
          preparedUrl = await nextSpeechRef.current;
          nextSpeechRef.current = null;
        } else {
          preparedUrl = await prepareNextSpeech(requestId);
        }
      }

    } catch (error) {
      if (requestId === voiceRequestRef.current) {
        console.error("Sasha voice error:", error);
        setVoiceError(error.message);
        setSpeaking(false);
      }

    } finally {
      if (requestId === voiceRequestRef.current) {
        speechWorkerRef.current = false;
        setSpeaking(false);

        if (
          speechQueueRef.current.length &&
          voiceEnabledRef.current
        ) {
          playSpeechQueue();
        }
      }
    }
  }

  function toggleVoice() {
    if (voiceEnabled) {
      voiceEnabledRef.current = false;
      stopSpeaking();
      setVoiceError("");
    } else {
      voiceEnabledRef.current = true;
    }

    setVoiceEnabled(!voiceEnabled);
  }

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input is not supported in this browser. Please use Chrome."
      );
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-JM";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error("Microphone error:", error);
      setListening(false);
    }
  }

  async function sendMessage(e) {
    e?.preventDefault();

    const text = message.trim();

    if (!text || loading) return;

    stopSpeaking();
    setVoiceError("");
    setMessage("");
    setLoading(true);

    const history = [
      ...messages.filter(item => item.text?.trim()),
      { role: "user", text }
    ].slice(-20);

    setMessages(prev => [
      ...prev,
      { role: "user", text },
      { role: "assistant", text: "" }
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: history
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.error || "Sasha is temporarily unavailable."
        );
      }

      if (!response.body) {
        throw new Error(
          "Your browser could not receive Sasha's response."
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let reply = "";
      let streamError = "";
      let speechBuffer = "";

      function updateAssistant(newText) {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated.length - 1;

          if (updated[last]?.role === "assistant") {
            updated[last] = {
              ...updated[last],
              text: newText
            };
          }

          return updated;
        });
      }

      function queueCompletedSpeech() {
        if (!voiceEnabledRef.current) {
          speechBuffer = "";
          return;
        }

        // Prefer complete sentences for natural speech.
        const sentenceMatch = speechBuffer.match(
          /^([\s\S]*?[.!?])(?=\s|$)/
        );

        if (sentenceMatch) {
          const sentence = sentenceMatch[1].trim();

          speechBuffer = speechBuffer
            .slice(sentenceMatch[0].length)
            .trimStart();

          if (sentence) {
            queueSpeech(sentence);
          }

          return;
        }

        // Prevent unusually long chunks if a sentence is very long.
        if (speechBuffer.length >= 150) {
          const splitAt = speechBuffer.lastIndexOf(" ", 125);

          if (splitAt > 70) {
            queueSpeech(
              speechBuffer.slice(0, splitAt).trim()
            );

            speechBuffer = speechBuffer
              .slice(splitAt)
              .trimStart();
          }
        }
      }

      function processBlock(block) {
        let eventName = "message";
        const dataLines = [];

        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        if (!dataLines.length) return;

        const rawData = dataLines.join("\n");

        if (rawData === "[DONE]") return;

        let data;

        try {
          data = JSON.parse(rawData);
        } catch {
          console.error("Sasha stream parsing error:", rawData);
          streamError = "Sasha sent an unreadable response.";
          return;
        }

        if (
          typeof data.text === "string" &&
          data.text.length > 0
        ) {
          reply += data.text;
          speechBuffer += data.text;

          updateAssistant(reply);
          queueCompletedSpeech();
        }

        if (data.error) {
          streamError = data.error;
        }

        if (eventName === "error" && !data.error) {
          streamError = "Sasha couldn't finish her answer.";
        }

        if (eventName === "done" && data.reply) {
          reply = data.reply;
          updateAssistant(reply);
        }
      }

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, {
          stream: true
        });

        buffer = buffer.replace(/\r\n/g, "\n");

        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          processBlock(block);
        }

        if (streamError) {
          throw new Error(streamError);
        }
      }

      buffer += decoder.decode();
      buffer = buffer.replace(/\r\n/g, "\n");

      if (buffer.trim()) {
        processBlock(buffer);
      }

      if (streamError) {
        throw new Error(streamError);
      }

      if (!reply.trim()) {
        throw new Error(
          "Gemini connected, but no text was received. Please try again."
        );
      }

      // Speak any remaining words after the final sentence.
      if (voiceEnabledRef.current && speechBuffer.trim()) {
        queueSpeech(speechBuffer.trim());
        speechBuffer = "";
      }

    } catch (error) {
      console.error("Sasha chat error:", error);

      setMessages(prev => {
        const updated = [...prev];
        const last = updated.length - 1;

        if (
          updated[last]?.role === "assistant" &&
          !updated[last].text
        ) {
          updated[last] = {
            role: "assistant",
            text: error.message ||
              "I couldn't connect just now. Please try again."
          };
        } else {
          updated.push({
            role: "assistant",
            text: error.message ||
              "I couldn't connect just now. Please try again."
          });
        }

        return updated;
      });

    } finally {
      setLoading(false);
    }
  }

  const styles = `
    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: #080e19;
      color: #eef5ff;
      font-family: Arial, sans-serif;
    }

    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      max-width: 850px;
      margin: auto;
      background: radial-gradient(circle at top, #142844, #080e19 58%);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 19px 17px;
      border-bottom: 1px solid #263b57;
      background: rgba(9, 17, 31, .94);
      position: sticky;
      top: 0;
      z-index: 5;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .orb {
      width: 47px;
      height: 47px;
      flex-shrink: 0;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #55caff;
      box-shadow: 0 0 20px #299bff88;
    }

    .assistant-avatar {
      width: 36px;
      height: 36px;
      flex: 0 0 36px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid #55caff;
      box-shadow: 0 0 12px #299bff66;
      margin: 2px 8px 0 0;
    }

    .brand h1 {
      font-size: 20px;
      margin: 0;
      letter-spacing: 2px;
    }

    .brand small {
      color: #8fb6df;
      font-size: 11px;
      letter-spacing: 2px;
    }

    .voice-toggle {
      border: 1px solid #438dca;
      background: #132b45;
      color: #bfe6ff;
      padding: 10px 12px;
      border-radius: 22px;
      font-size: 12px;
      cursor: pointer;
    }

    .welcome {
      text-align: center;
      padding: 25px 18px 12px;
    }

    .welcome h2 {
      font-size: 24px;
      margin: 5px 0 8px;
    }

    .welcome p {
      color: #9bb2cc;
      font-size: 13px;
      margin: 0;
    }

    .status {
      color: #62e6b2;
      font-size: 11px;
      margin-top: 12px;
      letter-spacing: 1px;
    }

    .voice-error {
      color: #ff8295;
      font-size: 12px;
      margin-top: 10px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .messages {
      flex: 1;
      padding: 18px 15px 25px;
      overflow-y: auto;
    }

    .message {
      display: flex;
      margin: 13px 0;
    }

    .message.user {
      justify-content: flex-end;
    }

    .bubble {
      max-width: 85%;
      padding: 13px 15px;
      border-radius: 17px;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .assistant .bubble {
      background: #15263c;
      border: 1px solid #315275;
      border-bottom-left-radius: 4px;
    }

    .user .bubble {
      background: linear-gradient(135deg, #1769a9, #17477c);
      border: 1px solid #398bd0;
      border-bottom-right-radius: 4px;
    }

    .suggestions {
      display: flex;
      gap: 8px;
      padding: 0 14px 13px;
      overflow-x: auto;
    }

    .suggestions button {
      flex-shrink: 0;
      background: #10243a;
      color: #b9dcfa;
      border: 1px solid #294d70;
      border-radius: 20px;
      padding: 9px 12px;
      font-size: 12px;
    }

    .composer {
      padding: 13px 13px 10px;
      background: #0b1422;
      border-top: 1px solid #263b57;
      position: sticky;
      bottom: 0;
    }

    .form {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .form input {
      flex: 1;
      min-width: 0;
      background: #15243a;
      color: white;
      border: 1px solid #355675;
      border-radius: 25px;
      padding: 14px;
      font-size: 14px;
      outline: none;
    }

    .form input:focus {
      border-color: #50baff;
    }

    .mic, .send {
      border: none;
      border-radius: 50%;
      width: 45px;
      height: 45px;
      flex-shrink: 0;
      cursor: pointer;
      font-size: 18px;
    }

    .mic {
      color: white;
      background: #263f5d;
      border: 1px solid #5596cf;
    }

    .mic.active {
      background: #a52d48;
      box-shadow: 0 0 15px #ff4266;
    }

    .send {
      color: white;
      background: linear-gradient(135deg, #168de0, #2454a0);
      font-size: 14px;
      font-weight: bold;
    }

    .send:disabled {
      opacity: .4;
    }

    .footer {
      text-align: center;
      color: #617d9d;
      font-size: 10px;
      padding-top: 11px;
      letter-spacing: 1px;
    }

    button:disabled {
      cursor: not-allowed;
    }

    @media (max-width: 480px) {
      .brand h1 { font-size: 17px; }
      .welcome h2 { font-size: 21px; }
      .bubble { max-width: 90%; }
    }
  `;

  return (
    <>
      <style>{styles}</style>

      <div className="app">
        <header className="header">
          <div className="brand">
            <img className="orb" src="/sasha-avatar.jpg" alt="Sasha AI" />
            <div>
              <h1>SASHA AI</h1>
              <small>YOUR AI COMPANION</small>
            </div>
          </div>

          <button
            className="voice-toggle"
            onClick={toggleVoice}
          >
            {voiceEnabled
              ? speaking ? "🔊 Speaking..." : "🔊 Voice ON"
              : "🔇 Voice OFF"}
          </button>
        </header>

        <section className="welcome">
          <h2>Hey, I'm Sasha 💙</h2>
          <p>Your intelligent Jamaican AI assistant.</p>

          <div className="status">
            ● ONLINE • READY TO CHAT
          </div>

          {voiceError && (
            <div className="voice-error">
              Voice issue: {voiceError}
            </div>
          )}
        </section>

        <main className="messages">
          {messages.map((item, index) => (
            <div
              className={`message ${item.role}`}
              key={index}
            >
              {item.role === "assistant" && (
                <img className="assistant-avatar" src="/sasha-avatar.jpg" alt="Sasha AI" />
              )}
              <div className="bubble">
                {item.text || (
                  loading && index === messages.length - 1
                    ? "Sasha is thinking..."
                    : ""
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef}></div>
        </main>

        <div className="suggestions">
          <button
            onClick={() => setMessage("Teach me something about AI.")}
          >
            Teach me about AI
          </button>

          <button
            onClick={() => setMessage("What can you help me with?")}
          >
            What can you do?
          </button>

          <button
            onClick={() => setMessage("Tell me something interesting.")}
          >
            Surprise me
          </button>
        </div>

        <footer className="composer">
          <form className="form" onSubmit={sendMessage}>
            <button
              className={`mic ${listening ? "active" : ""}`}
              type="button"
              onClick={startListening}
              title="Speak to Sasha"
            >
              {listening ? "🔴" : "🎤"}
            </button>

            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={
                listening ? "Listening..." : "Message Sasha..."
              }
              aria-label="Message Sasha"
            />

            <button
              className="send"
              type="submit"
              disabled={loading || !message.trim()}
            >
              Send
            </button>
          </form>

          <div className="footer">
            SASHA AI • POWERED BY ARTIFICIAL INTELLIGENCE
          </div>
        </footer>
      </div>
    </>
  );
}

createRoot(
  document.getElementById("root")
).render(<SashaAI />);
