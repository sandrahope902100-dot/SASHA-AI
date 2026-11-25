
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();

      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  function stopSpeaking() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setSpeaking(false);
  }

  async function speak(text) {
    if (!voiceEnabled) return;

    stopSpeaking();
    setVoiceError("");

    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error || `Voice server error: ${response.status}`
        );
      }

      const audioBlob = await response.blob();

      if (!audioBlob.size) {
        throw new Error("Sasha received an empty audio file.");
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setSpeaking(true);
        setVoiceError("");
      };

      audio.onended = () => {
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
          audioRef.current = null;
          setSpeaking(false);
        }
      };

      audio.onerror = () => {
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
          audioRef.current = null;
          setVoiceError(
            "The audio arrived, but your browser couldn't play it."
          );
          setSpeaking(false);
        }
      };

      await audio.play();

    } catch (error) {
      console.error("Sasha voice error:", error);
      setVoiceError(
        error.message || "Sasha couldn't play her voice."
      );
      setSpeaking(false);
    }
  }

  function toggleVoice() {
    if (voiceEnabled) {
      stopSpeaking();
      setVoiceError("");
    }

    setVoiceEnabled(!voiceEnabled);
  }

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

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
    recognition.start();
  }

  async function sendMessage(e) {
    e?.preventDefault();

    const text = message.trim();
    if (!text || loading) return;

    stopSpeaking();
    setVoiceError("");

    setMessages(prev => [...prev, { role: "user", text }]);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Sasha is temporarily unavailable."
        );
      }

      const reply =
        data.reply || "I couldn't generate a reply. Try again.";

      setMessages(prev => [
        ...prev,
        { role: "assistant", text: reply }
      ]);

      speak(reply);

    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          text:
            error.message ||
            "I couldn't connect just now. Please try again."
        }
      ]);
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
      border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #fff, #54caff 35%, #1760a9 70%, #101d35);
      box-shadow: 0 0 20px #299bff88;
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

    .message.user { justify-content: flex-end; }

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

    .typing {
      color: #8ecbff;
      font-size: 13px;
      padding: 10px;
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

    .form input:focus { border-color: #50baff; }

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

    .send:disabled { opacity: .4; }

    .footer {
      text-align: center;
      color: #617d9d;
      font-size: 10px;
      padding-top: 11px;
      letter-spacing: 1px;
    }

    button:disabled { cursor: not-allowed; }

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
            <div className="orb"></div>
            <div>
              <h1>SASHA AI</h1>
              <small>YOUR AI COMPANION</small>
            </div>
          </div>

          <button className="voice-toggle" onClick={toggleVoice}>
            {voiceEnabled
              ? speaking ? "🔊 Speaking..." : "🔊 Voice ON"
              : "🔇 Voice OFF"}
          </button>
        </header>

        <section className="welcome">
          <h2>Hey, I'm Sasha 💙</h2>
          <p>Your intelligent Jamaican AI assistant.</p>
          <div className="status">● ONLINE • READY TO CHAT</div>

          {voiceError && (
            <div className="voice-error">
              Voice issue: {voiceError}
            </div>
          )}
        </section>

        <main className="messages">
          {messages.map((item, index) => (
            <div className={`message ${item.role}`} key={index}>
              <div className="bubble">{item.text}</div>
            </div>
          ))}

          {loading && (
            <div className="typing">Sasha is thinking...</div>
          )}

          <div ref={messagesEndRef}></div>
        </main>

        <div className="suggestions">
          <button onClick={() => setMessage("Teach me something about AI.")}>
            Teach me about AI
          </button>

          <button onClick={() => setMessage("What can you help me with?")}>
            What can you do?
          </button>

          <button onClick={() => setMessage("Tell me something interesting.")}>
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
              placeholder={listening ? "Listening..." : "Message Sasha..."}
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

createRoot(document.getElementById("root")).render(<SashaAI />);
