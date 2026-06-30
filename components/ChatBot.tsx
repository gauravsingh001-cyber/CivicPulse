"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";

interface Message {
  role: "user" | "bot";
  text: string;
}

const QUICK_REPLIES = [
  "How do I report an issue?",
  "How does verification work?",
  "How do I earn points?",
  "What issues can I report?",
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Hi! I'm CivicBot 🤖 I'm here to help you navigate CivicPulse and report community issues. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = messages.map((m) => ({
      role: m.role === "bot" ? ("model" as const) : ("user" as const),
      text: m.text,
    }));

    const { chatWithAssistant } = await import("@/lib/gemini");
    const response = await chatWithAssistant(text, history);
    setMessages((prev) => [...prev, { role: "bot", text: response }]);
    setLoading(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        className="chatbot-toggle"
        onClick={() => setOpen(!open)}
        title="Chat with CivicBot"
      >
        {open ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}
      </button>

      {/* Chat window */}
      {open && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bot size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "white", fontSize: "0.9rem" }}>
                CivicBot
              </div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.7)" }}>
                ✦ Powered by Gemini AI
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages" id="chat-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.role === "user" ? "user" : "bot"}`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="chat-message bot" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                <div className="animate-pulse" style={{ width: "8px", height: "8px", background: "var(--text-muted)", borderRadius: "50%" }} />
                <div className="animate-pulse" style={{ width: "8px", height: "8px", background: "var(--text-muted)", borderRadius: "50%", animationDelay: "0.2s" }} />
                <div className="animate-pulse" style={{ width: "8px", height: "8px", background: "var(--text-muted)", borderRadius: "50%", animationDelay: "0.4s" }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div
              style={{
                padding: "8px 12px",
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              {QUICK_REPLIES.map((reply, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(reply)}
                  style={{
                    background: "rgba(79,142,247,0.1)",
                    border: "1px solid rgba(79,142,247,0.25)",
                    borderRadius: "99px",
                    padding: "4px 10px",
                    fontSize: "0.7rem",
                    color: "var(--brand-primary)",
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "all 0.2s",
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-area">
            <input
              className="input"
              placeholder="Ask CivicBot anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              style={{ fontSize: "0.875rem" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="btn btn-primary btn-icon"
              style={{ flexShrink: 0 }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
