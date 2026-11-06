const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

/**
 * Sends a message to the Himalaya FarmCare AI Assistant.
 *
 * @param {string} message - The farmer's question.
 * @param {Array<{role: string, text: string}>} context - Recent conversation turns.
 * @returns {Promise<{reply: string, products: Array, language: string}>}
 */
export async function sendChatMessage(message, context = []) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('Please enter a question or message.');
  }

  const response = await fetch(`${apiBaseUrl}/chatbot/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message.trim(),
      context: context.slice(-6),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || `Chatbot request failed (${response.status}).`);
  }

  return {
    reply: payload.reply || 'Thank you for your message.',
    products: payload.products || [],
    language: payload.language || 'english',
    provider: payload.provider,
  };
}
