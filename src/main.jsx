
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

function SashaAI() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(e) {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message;
    setMessages(prev => [...prev, { sender: "You", text: userMessage }]);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setMessages(prev => [...prev, {
        sender: "Sasha",
        text: data.reply
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        sender: "Sasha",
        text: "I'm having trouble connecting. Please try again."
      }]);
    }

    setLoading(false);
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
        <p style={{color: "#38bdf8"}}>
          Sasha: Hello! I'm Sasha. How can I help you today?
        </p>

        {messages.map((m, i) => (
          <p key={i}><b>{m.sender}:</b> {m.text}</p>
        ))}

        {loading && <p>Sasha is thinking...</p>}
      </div>

      <form onSubmit={sendMessage} style={{marginTop: "20px"}}>
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Talk to Sasha..."
          style={{padding: "14px", width: "65%", borderRadius: "10px"}}
        />
        <button disabled={loading} style={{
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
