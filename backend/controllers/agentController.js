const agentService = require('../services/agentService');
const AppError = require('../utils/AppError');

exports.chat = async (req, res, next) => {
  try {
    const { message, conversationHistory } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return next(new AppError('Invalid or missing message', 400));
    }

    if (message.length > 1000) {
      return next(new AppError('Message is too long', 400));
    }

    // req.user is populated by protect middleware
    const userId = req.user.id;
    if (!userId) {
      return next(new AppError('Unauthorized access', 401));
    }

    // Sanitize conversation history to prevent prompt injection and fake tool calls
    let sanitizedHistory = [];
    if (Array.isArray(conversationHistory)) {
      sanitizedHistory = conversationHistory
        .filter(msg => {
          // Only allow user and assistant roles
          if (!['user', 'assistant'].includes(msg.role)) return false;
          // Reject any message attempting to inject tool calls or function calls
          if (msg.tool_calls || msg.function_call) return false;
          // Must have string content
          if (typeof msg.content !== 'string') return false;
          return true;
        })
        .map(msg => ({
          role: msg.role,
          content: msg.content.substring(0, 1000) // limit individual message length to 1000 chars
        }))
        .slice(-8); // STRICT CONTEXT BUDGET: MAX_HISTORY_MESSAGES = 8
    }

    const result = await agentService.processChat(userId, message, sanitizedHistory);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Agent Error]', error.message, error.stack);
    // Don't expose raw internal errors to the user
    // Catch Groq specific errors if possible or fallback to generic
    if (error.status === 429) {
      return next(new AppError('Agent is currently overwhelmed. Please try again later.', 429));
    }
    return next(new AppError('Agent failed to process the request', 500));
  }
};
