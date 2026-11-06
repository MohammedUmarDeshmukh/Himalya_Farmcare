import { processChatMessage } from '../services/chatbotService.js';

// Simple in-memory rate limiter for chatbot endpoint (max 40 requests per 60 seconds per IP)
const ipRequestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 40;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);

  if (!entry || now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
    ipRequestCounts.set(ip, { count: 1, startTime: now });
    return false;
  }

  entry.count += 1;
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  return false;
}

// Clean up stale IP records periodically every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequestCounts.entries()) {
    if (now - entry.startTime > RATE_LIMIT_WINDOW_MS * 2) {
      ipRequestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref?.();

export async function handleChatMessage(req, res) {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        success: false,
        message: 'Too many messages sent. Please wait a moment before sending another query.',
      });
    }

    const { message, context } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be non-empty text.',
      });
    }

    if (message.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long (maximum 1000 characters).',
      });
    }

    // Process chat query through service
    const result = await processChatMessage({
      message: message.trim(),
      context: Array.isArray(context) ? context.slice(-6) : [],
    });

    return res.status(200).json({
      success: true,
      reply: result.reply,
      products: result.products || [],
      language: result.language,
      provider: result.provider,
    });
  } catch (error) {
    console.error('Chatbot Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process message. Please try again.',
      reply: 'An internal error occurred while processing your request. Please try again in a few moments.',
    });
  }
}
