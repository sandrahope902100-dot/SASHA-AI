import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function SashaAI() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  function sendMessage(e) {
    e.preventDefault();
    if (!message.trim()) return;

    setMessages([...messages, { text: message, sender: "You" }]);
    setMessage("");
  }

  return (
    <div style={{
      background: "#080d18",
      color: "#eaf6ff",
      minHeight: "100vh",
      padding: "25px",
      fontFamily: "Arial",
      textAlign: "center"
    }}>
      <h1 style={{color: "#38bdf8"}}>SASHA AI</h1>
      <h3>Your Jamaican AI Assistant</h3>
      <p>Smart. Friendly. Always ready to help.</p>

      <div style={{
        background: "#111c30",
        borderRadius: "15px",
        padding: "20px",
        minHeight: "300px",
        textAlign: "left"
      }}>
        <p style={{color: "#38bdf8"}}>Sasha:</p>
        <p>Hello! I'm Sasha. How can I help you today?</p>

        {messages.map((m, i) => (
          <p key={i}><b>{m.sender}:</b> {m.text}</p>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{marginTop: "20px"}}>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Talk to Sasha..."
          style={{padding: "14px", width: "65%", borderRadius: "10px"}}
        />
        <button style={{
          padding: "14px",
          background: "#0284c7",
          color: "white",
          border: "none",
          borderRadius: "10px"
        }}>Send</button>
      </form>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<SashaAI />);
