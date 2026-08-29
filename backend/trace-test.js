require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const agentService = require('./services/agentService');
const { agentToolHandlers } = require('./services/agentTools');
const User = require('./models/User');

async function runTrace() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const userId = user._id.toString();

  const originalCreate = agentService.groq.chat.completions.create.bind(agentService.groq.chat.completions);
  agentService.groq.chat.completions.create = async function(args) {
    const completion = await originalCreate(args);
    const choice = completion.choices[0].message;
    
    console.log('\n================================');
    console.log(`[LLM RESPONSE] Tokens - Prompt: ${completion.usage.prompt_tokens}, Completion: ${completion.usage.completion_tokens}, Total: ${completion.usage.total_tokens}`);
    if (choice.tool_calls) {
      console.log('Tool Calls:', JSON.stringify(choice.tool_calls, null, 2));
    } else {
      console.log('Content:', choice.content);
    }
    console.log('================================\n');
    
    return completion;
  };

  console.log('--- TEST: How much did I spend this month? ---');
  await agentService.processChat(userId, "How much did I spend this month?");
  
  await mongoose.disconnect();
}

runTrace();
