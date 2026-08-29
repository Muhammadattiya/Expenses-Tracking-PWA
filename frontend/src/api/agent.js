import api from './axios';

export const chatWithAgent = (message, conversationHistory) => 
  api.post('/agent/chat', { message, conversationHistory });
