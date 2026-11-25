
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

function SashaAI() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e, suggestedText) {
    if (e) e.preventDefault();

    const userMessage = (suggestedText || message).trim();

    if (!userMessage || loading) return;

    setMessages(prev => [
      ...prev,
      { sender: "You", text: userMessage }
    ]);

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection failed.");
      }

      setMessages(prev => [
        ...prev,
        { sender: "Sasha", text: data.reply }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          sender: "Sasha",
          text: "I couldn't connect just now. Please try again. " +
            error.message
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "Explain artificial intelligence",
    "Teach me something new",
    "Help me with technology",
    "What can you do?"
  ];

  return (
    <div className="app">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #050914;
          font-family: Arial, sans-serif;
        }

        .app {
          min-height: 100vh;
          background: radial-gradient(
            circle at 50% 0%,
            #142c4b,
            #080f20 45%,
            #050914 85%
          );
          color: #edf7ff;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid #263d59;
          background: rgba(5, 12, 26, .9);
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .logo {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 23px;
          background: linear-gradient(
            135deg, #e6f7ff, #168bd8, #142b53
          );
          box-shadow: 0 0 20px #168bd866;
        }

        .brand h2 {
          margin: 0;
          font-size: 19px;
          letter-spacing: 2px;
          color: #d9f4ff;
        }

        .brand small {
          display: block;
          color: #7fa9c8;
          margin-top: 4px;
          font-size: 11px;
        }

        .status {
          font-size: 11px;
          color: #65e6b2;
        }

        .status span {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #42e7a1;
          margin-right: 5px;
          box-shadow: 0 0 8px #42e7a1;
        }

        .main {
          width: 100%;
          max-width: 850px;
          margin: auto;
          padding: 20px 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .welcome {
          text-align: center;
          padding: 22px 10px;
        }

        .orb {
          width: 108px;
          height: 108px;
          margin: 0 auto 18px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 48px;
          background: radial-gradient(
            circle at 35% 30%,
            #ffffff,
            #8ddcff 22%,
            #167ac5 55%,
            #101c3d 85%
          );
          box-shadow:
            0 0 25px #35aaff88,
            0 0 65px #147bd955;
          animation: glow 3s ease-in-out infinite alternate;
        }

        @keyframes glow {
          from {
            box-shadow: 0 0 20px #35aaff66;
          }
          to {
            box-shadow: 0 0 45px #35aaffbb,
              0 0 75px #147bd966;
          }
        }

        .welcome h1 {
          font-size: 27px;
          margin: 8px 0;
          color: white;
        }

        .welcome h1 span {
          color: #58c8ff;
        }

        .welcome p {
          color: #a5bdd4;
          line-height: 1.6;
          font-size: 14px;
        }

        .suggestions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin: 10px 0 25px;
        }

        .suggestions button {
          background: #101e32;
          border: 1px solid #284867;
          color: #c8eaff;
          border-radius: 12px;
          padding: 14px 10px;
          font-size: 12px;
          cursor: pointer;
        }

        .suggestions button:active {
          background: #163d60;
        }

        .chat {
          display: flex;
          flex-direction: column;
          gap: 15px;
          padding: 8px 0 20px;
        }

        .bubble {
          max-width: 90%;
          padding: 14px 16px;
          border-radius: 17px;
          line-height: 1.6;
          font-size: 14px;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .user {
          align-self: flex-end;
          background: linear-gradient(
            135deg, #1267a7, #17447d
          );
          border: 1px solid #318bd0;
          border-bottom-right-radius: 4px;
        }

        .sasha {
          align-self: flex-start;
          background: #111e31;
          border: 1px solid #294867;
          border-bottom-left-radius: 4px;
        }

        .sender {
          color: #65caff;
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 6px;
          letter-spacing: 1px;
        }

        .typing {
          color: #83cfff;
          font-size: 13px;
          padding: 12px;
        }

        .composer {
          position: sticky;
          bottom: 0;
          padding: 13px 0 8px;
          background: #070e1b;
        }

        .form {
          display: flex;
          gap: 9px;
          padding: 8px;
          border-radius: 16px;
          background: #111e30;
          border: 1px solid #315477;
          box-shadow: 0 0 22px #147bd922;
        }

        .form input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: white;
          padding: 10px;
          font-size: 14px;
        }

        .form input::placeholder {
          color: #7894ad;
        }

        .send {
          border: none;
          border-radius: 12px;
          padding: 0 18px;
          background: linear-gradient(
            135deg, #168bd8, #07518e
          );
          color: white;
          font-weight: bold;
          cursor: pointer;
        }

        .send:disabled {
          opacity: .5;
        }

        .footer {
          text-align: center;
          color: #66829e;
          font-size: 10px;
          padding: 12px;
        }

        @media (max-width: 380px) {
          .status {
            font-size: 9px;
          }

          .welcome h1 {
            font-size: 23px;
          }

          .suggestions button {
            font-size: 11px;
          }
        }
      `}</style>

      <header className="header">
        <div className="brand">
          <div className="logo">✦</div>
          <div>
            <h2>SASHA AI</h2>
            <small>YOUR JAMAICAN AI ASSISTANT</small>
          </div>
        </div>

        <div className="status">
          <span></span> Online
        </div>
      </header>

      <main className="main">
        <section className="welcome">
          <div className="orb">✦</div>
          <h1>Hello, I'm <span>Sasha.</span></h1>
          <p>
            Your intelligent AI companion.
            <br />
            Ask me anything. Let's figure it out together.
          </p>
        </section>

        {messages.length === 0 && (
          <section className="suggestions">
            {suggestions.map((item, index) => (
              <button
                key={index}
                onClick={() => sendMessage(null, item)}
              >
                {item}
              </button>
            ))}
          </section>
        )}

        <section className="chat">
          {messages.map((item, index) => (
            <div
              key={index}
              className={
                "bubble " +
                (item.sender === "You" ? "user" : "sasha")
              }
            >
              <div className="sender">{item.sender}</div>
              {item.text}
            </div>
          ))}

          {loading && (
            <div className="typing">
              ✦ Sasha is thinking...
            </div>
          )}

          <div ref={bottomRef}></div>
        </section>
      </main>

      <div className="composer">
        <form className="form" onSubmit={sendMessage}>
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Message Sasha..."
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
          SASHA AI • Powered by artificial intelligence
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<SashaAI />);

