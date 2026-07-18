import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { openaiClient, DEPLOYMENT, isAiConfigured } from '../lib/openai';
import { chatTools, executeTool } from '../lib/chatTools';

const router = Router();

router.use(requireAuth);

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

/**
 * POST /api/chat
 *
 * SRE infrastructure chat endpoint. Executes tool/function calls if required.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Invalid request: messages array is required.' });
    return;
  }

  // Use real OpenAI if configured
  if (isAiConfigured && openaiClient) {
    try {
      let currentMessages: any[] = [
        {
          role: 'system',
          content: 'You are Aegis AI — an expert cloud operations and SRE assistant. Use the provided tools to fetch real-time infrastructure state, incidents, and chaos experiment history. Keep your responses concise, precise, and professional. Always prioritize real data returned by tools.',
        },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.name ? { name: m.name } : {}),
          ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        })),
      ];

      // Initial OpenAI Call
      let response = await openaiClient.chat.completions.create({
        model: DEPLOYMENT,
        messages: currentMessages,
        tools: chatTools,
        tool_choice: 'auto',
      });

      let responseMessage = response.choices[0]?.message;

      // Handle tool calls loop (up to 5 iterations to avoid infinite loop)
      let iterations = 0;
      while (responseMessage?.tool_calls && iterations < 5) {
        iterations++;
        // Push assistant's message with tool calls to message history
        currentMessages.push(responseMessage);        // Execute all requested tool calls
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = (toolCall as any).function.name;
          const functionArgs = JSON.parse((toolCall as any).function.arguments || '{}');

          // Run database/Redis queries
          const toolResult = await executeTool(functionName, functionArgs);

          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: JSON.stringify(toolResult),
          });
        }

        // Call OpenAI again with tool responses
        response = await openaiClient.chat.completions.create({
          model: DEPLOYMENT,
          messages: currentMessages,
        });
        responseMessage = response.choices[0]?.message;
      }

      res.json({
        message: responseMessage?.content ?? 'I encountered an issue generating a response.',
        model: DEPLOYMENT,
      });
      return;
    } catch (err: any) {
      res.status(502).json({ error: 'Azure OpenAI call failed', detail: err.message });
      return;
    }
  }

  // ── Mock / Demo Mode ────────────────────────────────────────────────────────
  // Dynamically inspects the user query to check actual system metrics, database,
  // and Redis state so the chat is live and realistic even without OpenAI credentials!
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content?.toLowerCase() ?? '';

  let reply = '';
  let toolLogs: string[] = [];

  if (lastUserMsg.includes('incident') || lastUserMsg.includes('alert') || lastUserMsg.includes('warn') || lastUserMsg.includes('crit')) {
    toolLogs.push('Executing get_recent_incidents()');
    const result = await executeTool('get_recent_incidents', { limit: 5 });
    const list = result.incidents || [];
    if (list.length === 0) {
      reply = '✅ All clear! There are currently no open or recent incidents recorded in Aegis.';
    } else {
      reply = `I found ${list.length} recent incidents in the database:\n\n` +
        list.map((inc: any) => {
          const time = new Date(inc.createdAt).toLocaleTimeString();
          const badge = inc.status === 'RESOLVED' ? '✅ RESOLVED' : '🚨 OPEN';
          return `- **${inc.title}** (${inc.severity} severity, Source: ${inc.source})\n  Status: ${badge} | Created at: ${time}`;
        }).join('\n\n');
    }
  } else if (lastUserMsg.includes('chaos') || lastUserMsg.includes('experiment') || lastUserMsg.includes('inject') || lastUserMsg.includes('attack')) {
    toolLogs.push('Executing get_active_chaos_experiments()');
    toolLogs.push('Executing get_experiment_history()');

    const activeResult = await executeTool('get_active_chaos_experiments', {});
    const historyResult = await executeTool('get_experiment_history', { limit: 3 });

    const active = activeResult.activeExperiment;
    const flags = Object.keys(activeResult.activeFlags);

    let activeSection = '';
    if (active) {
      activeSection = `🚨 **Active Experiment**: "${active.name}" (${active.type}) is currently running.\n`;
    } else {
      activeSection = '🟢 **Active Experiment**: None running at the moment.\n';
    }

    if (flags.length > 0) {
      activeSection += `Active failure flags in Redis: ${flags.map(f => `\`${f}\` (${activeResult.activeFlags[f]}ms)`).join(', ')}\n`;
    }

    const historySection = historyResult.experiments?.length
      ? '\n**Recent Experiment History:**\n' + historyResult.experiments.map((exp: any) => {
          return `- **${exp.name}** (${exp.type}) | Status: \`${exp.status}\` | Created at: ${new Date(exp.createdAt).toLocaleTimeString()}`;
        }).join('\n')
      : '\nNo chaos history found.';

    reply = `${activeSection}${historySection}`;
  } else if (lastUserMsg.includes('health') || lastUserMsg.includes('ready') || lastUserMsg.includes('db') || lastUserMsg.includes('postgres') || lastUserMsg.includes('redis') || lastUserMsg.includes('status')) {
    toolLogs.push('Executing get_health_status()');
    const result = await executeTool('get_health_status', {});
    const s = result.services;

    reply = `🩺 **System Health Diagnosis** (as of ${new Date(result.timestamp).toLocaleTimeString()}):\n\n` +
      `- **Backend API**: 🟢 Operational (Port :8000)\n` +
      `- **PostgreSQL Database**: ${s.database === 'healthy' ? '🟢 Operational' : '🔴 Connection Failed'}\n` +
      `- **Redis Cache**: ${s.redis === 'healthy' ? '🟢 Operational' : '🔴 Connection Failed'}\n\n` +
      `There are currently **${result.openIncidentsCount}** open incidents. ${result.summary}`;
  } else {
    reply = `Hello! I am Aegis SRE AI Assistant (running in DEMO/mock mode).\n\n` +
      `I can query live metrics and platform state using tools. Try asking me:\n` +
      `1. *"Are there any incidents open?"*\n` +
      `2. *"Check chaos experiment status."*\n` +
      `3. *"Is the database healthy?"*\n\n` +
      `*Note: To connect to real Azure OpenAI, please supply your keys in the \\\`.env\\\` file.*`;
  }

  res.json({
    message: reply,
    model: 'demo-mode-local-agent',
    logs: toolLogs,
  });
});

export default router;
