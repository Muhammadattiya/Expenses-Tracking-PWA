require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const agentService = require('./services/agentService');
const { agentToolHandlers } = require('./services/agentTools');
const User = require('./models/User');

async function runAudit() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const userId = user._id.toString();

  const originalCreate = agentService.groq.chat.completions.create.bind(agentService.groq.chat.completions);
  agentService.groq.chat.completions.create = async function(args) {
    const completion = await originalCreate(args);
    const choice = completion.choices[0].message;
    completion.__injectedTrace = {
      prompt_tokens: completion.usage.prompt_tokens,
      completion_tokens: completion.usage.completion_tokens,
      tool_calls: choice.tool_calls ? JSON.stringify(choice.tool_calls) : null,
      content: choice.content
    };
    return completion;
  };

  const originalProcess = agentService.processChat.bind(agentService);
  agentService.processChat = async function(uid, msg, hist) {
    const res = await originalProcess(uid, msg, hist);
    const iters = res.history.filter(m => m.role === 'assistant').length;
    return { res, iters };
  };

  console.log('Testing for 3 iterations...');
  for (let i = 0; i < 15; i++) {
    const { res, iters } = await agentService.processChat(userId, "How much did I spend this month?");
    if (iters >= 3) {
      console.log(`\nFound 3 iterations on attempt ${i+1}!`);
      res.history.forEach((m, idx) => {
        console.log(`[MSG ${idx}] Role: ${m.role}`);
        if (m.tool_calls) console.log('  Tool Calls:', JSON.stringify(m.tool_calls));
        if (m.name) console.log('  Tool Name:', m.name);
        if (m.content) console.log('  Content Length:', m.content.length);
        if (m.content && m.role !== 'tool') console.log('  Content Preview:', m.content.substring(0, 100).replace(/\n/g, ' '));
      });
      break;
    } else {
      process.stdout.write('.');
    }
  }

  await mongoose.disconnect();
}

runAudit();
