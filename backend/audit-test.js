require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const agentService = require('./services/agentService');
const User = require('./models/User');

async function runAudit() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const userId = user._id.toString();

  const originalCreate = agentService.groq.chat.completions.create.bind(agentService.groq.chat.completions);
  agentService.groq.chat.completions.create = async function(args) {
    console.log('\n--- LLM API CALL ---');
    args.messages.forEach((m, i) => {
      if (m.role === 'tool') {
        console.log(`[Message ${i} - ${m.role}] tool_call_id: ${m.tool_call_id}, name: ${m.name}`);
        console.log(`Content: ${m.content}`);
      } else if (m.role === 'assistant' && m.tool_calls) {
        console.log(`[Message ${i} - ${m.role}] Tool Calls:`, JSON.stringify(m.tool_calls));
      } else {
        console.log(`[Message ${i} - ${m.role}]:`, m.content ? (m.content.length > 200 ? m.content.substring(0, 200) + '...' : m.content) : '(empty)');
      }
    });

    const completion = await originalCreate(args);
    
    const choice = completion.choices[0].message;
    console.log('\n--- LLM RESPONSE ---');
    if (choice.tool_calls) {
      console.log('Tool Calls:', JSON.stringify(choice.tool_calls, null, 2));
    } else {
      console.log('Content:', choice.content);
    }
    
    return completion;
  };

  console.log('--- TEST 1: What accounts do I have? ---');
  await agentService.processChat(userId, "What accounts do I have?");

  console.log('--- TEST 2: How much did I spend this month? ---');
  await agentService.processChat(userId, "How much did I spend this month?");
  
  await mongoose.disconnect();
}

runAudit();
