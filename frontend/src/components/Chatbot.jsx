import { useEffect, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { sendChatMessage } from '../services/chatbotService';
import './chatbot.css';

const SESSION_STORAGE_KEY = 'himalaya_farmcare_chat_history';

const SUGGESTED_QUESTIONS = [
  '🌾 Products available for Cotton?',
  '🌿 Products available for Turmeric?',
  '💡 How to use Smart Recommendation?',
  '📦 How can I track my order?',
  '💊 Dosage for 5 acres of Cotton?',
  '🛒 How do I place an order with COD?',
];

// Helper to safely parse inline **bold** text without dangerouslySetInnerHTML
function parseInlineBold(lineText) {
  if (!lineText) return null;
  const parts = lineText.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, idx) => {
    if (idx % 2 === 1) {
      return <strong key={idx}>{part}</strong>;
    }
    return part;
  });
}

// Pure React Markdown-like message formatter (Zero raw asterisks, zero XSS vulnerability)
function FormattedChatMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = null;
  let listType = null; // 'ul' or 'ol'

  const flushList = () => {
    if (currentList) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`ol-${elements.length}`} className="chat-ol">
            {currentList}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="chat-ul">
            {currentList}
          </ul>
        );
      }
      currentList = null;
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for bullet list item (• or * or -)
    if (/^[•*-]\s+/.test(trimmed)) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
        currentList = [];
      }
      const content = trimmed.replace(/^[•*-]\s+/, '');
      currentList.push(<li key={`li-${index}`}>{parseInlineBold(content)}</li>);
      return;
    }

    // Check for numbered list item (1. or 2.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
        currentList = [];
      }
      currentList.push(<li key={`li-${index}`}>{parseInlineBold(numMatch[2])}</li>);
      return;
    }

    // Regular line, flush any pending list
    flushList();

    if (!trimmed) {
      // Empty line spacer
      elements.push(<div key={`spacer-${index}`} className="chat-line-spacer" />);
      return;
    }

    // Heading format (### or **Heading:** alone)
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${index}`} className="chat-heading">
          {parseInlineBold(trimmed.substring(4))}
        </h4>
      );
      return;
    }

    // Standard paragraph line
    elements.push(
      <p key={`p-${index}`} className="chat-paragraph">
        {parseInlineBold(line)}
      </p>
    );
  });

  flushList();

  return <div className="formatted-chat-message">{elements}</div>;
}

function getInitialGreeting() {
  return {
    id: 'welcome-msg',
    role: 'assistant',
    text: `Namaste! 🙏 Welcome to **Himalaya FarmCare Assistant**.\n"Serving Your Farm Is Our Duty."\n\nI can help you with crop protection products, verified dosage calculations, smart recommendations, order placement, and tracking. Feel free to ask in English, Hindi (हिंदी), or Hinglish!`,
    products: [],
    provider: 'database-fallback',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function Chatbot() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parse errors and fallback
    }
    return [getInitialGreeting()];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync messages to session storage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  // Auto-scroll to bottom whenever messages or typing state updates
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  // Do not show chatbot on admin portal pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      products: [],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputMessage('');
    setIsTyping(true);

    try {
      // Build context from recent turns
      const context = nextMessages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await sendChatMessage(text, context);

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: res.reply,
        products: res.products || [],
        provider: res.provider || 'database-fallback',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        text:
          'Kisan Bhai, hamare server se connect karne mein samasya aayi hai. Kripya thodi der baad dobara koshish karein. (Network or server error encountered).',
        products: [],
        provider: 'database-fallback',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRestartChat = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setMessages([getInitialGreeting()]);
    setInputMessage('');
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          className="chatbot-launcher"
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          aria-label="Open Himalaya FarmCare AI Assistant"
        >
          <div className="launcher-icon-wrap">
            <span>🌱</span>
            <span className="launcher-pulse-dot" />
          </div>
          <span className="launcher-text">Ask FarmCare Assistant</span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="chatbot-window" role="dialog" aria-label="FarmCare AI Assistant Chat">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-info">
              <div className="chat-avatar">
                <span>👨‍🌾</span>
                <span className="chat-online-badge" />
              </div>
              <div className="chat-header-text">
                <h3>FarmCare Assistant</h3>
                <p>
                  <span>●</span> Online • Agri & Store Guide
                </p>
              </div>
            </div>

            <div className="chat-header-actions">
              <button
                type="button"
                className="chat-header-btn"
                title="Restart Chat"
                onClick={handleRestartChat}
                aria-label="Restart Conversation"
              >
                ↺
              </button>
              <button
                type="button"
                className="chat-header-btn"
                title={isMinimized ? 'Expand' : 'Minimize'}
                onClick={() => setIsMinimized((prev) => !prev)}
                aria-label="Minimize Chat Window"
              >
                {isMinimized ? '□' : '—'}
              </button>
              <button
                type="button"
                className="chat-header-btn"
                title="Close"
                onClick={() => setIsOpen(false)}
                aria-label="Close Chat Window"
              >
                &times;
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div className="chat-messages-area">
                {/* Initial Suggestion Pills */}
                {messages.length === 1 && (
                  <div className="chat-welcome-box">
                    <div className="welcome-greeting">
                      <span>🌾</span>
                      <span>How can I help your farm today?</span>
                    </div>
                    <p className="welcome-text">
                      Choose a quick question below or type your query in English, Hindi, or Hinglish:
                    </p>
                    <div className="welcome-suggestions-label">Suggested Inquiries</div>
                    <div className="suggestions-wrap">
                      {SUGGESTED_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          className="suggestion-pill-btn"
                          onClick={() => handleSend(q.replace(/^[^\w]+/, '').trim())}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message History */}
                {messages.map((msg) => (
                  <div key={msg.id} className={`chat-message-row ${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="message-avatar-small" aria-hidden="true">
                        🌱
                      </div>
                    )}
                    <div className="message-bubble">
                      <div className="message-bubble-content">
                        <FormattedChatMessage text={msg.text} />
                      </div>

                      {/* Transparent Provider Attribution */}
                      {msg.role === 'assistant' && (
                        <div className="message-provider-tag">
                          {msg.provider === 'gemini-ai' ? (
                            <span className="provider-pill ai">✨ Gemini AI Grounded</span>
                          ) : (
                            <span className="provider-pill db">🌱 Verified Database Engine</span>
                          )}
                        </div>
                      )}

                      {/* Attached Product Cards if present */}
                      {msg.products && msg.products.length > 0 && (
                        <div className="chat-products-grid">
                          {msg.products.map((prod) => (
                            <div key={prod.id || prod.name} className="chat-product-card">
                              <div className="product-card-left">
                                <span className="product-card-title">{prod.name}</span>
                                <div className="product-card-badges">
                                  <span className="mini-badge crop">{prod.crop}</span>
                                  <span className="mini-badge">{prod.problem}</span>
                                  {prod.dosagePerAcre && (
                                    <span className="mini-badge dosage">
                                      {prod.dosagePerAcre} {prod.dosageUnit || 'ml'}/Acre
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="product-card-right">
                                {prod.p100 && (
                                  <span className="product-card-price">
                                    ₹{prod.p100}
                                    {prod.p500 ? ` - ₹${prod.p500}` : ''}
                                  </span>
                                )}
                                <Link
                                  to={`/products`}
                                  className="product-card-link-btn"
                                  onClick={() => setIsOpen(false)}
                                >
                                  View Item
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="chat-message-row assistant">
                    <div className="message-avatar-small" aria-hidden="true">
                      🌱
                    </div>
                    <div className="chat-typing-indicator">
                      <div className="typing-dots">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                      <span className="typing-label">Checking farm records…</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="chat-input-area">
                <form
                  className="chat-input-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    className="chat-text-input"
                    placeholder="Ask in English, Hindi, or Hinglish…"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isTyping}
                    maxLength={1000}
                  />
                  <button
                    type="submit"
                    className="chat-send-btn"
                    disabled={isTyping || !inputMessage.trim()}
                    aria-label="Send message"
                  >
                    ➤
                  </button>
                </form>
                <div className="chat-footer-tagline">
                  <span>Himalaya FarmCare AI</span>
                  <span className="chat-disclaimer-pill">Verified Database Records</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
