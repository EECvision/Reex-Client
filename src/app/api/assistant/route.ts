import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import fs from 'fs';
import path from 'path';

// Rate limiting (simple in-memory for this example)
const rateLimit = new Map<string, { count: number, timestamp: number }>();
const LIMIT = 30;
const WINDOW_MS = 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const user = rateLimit.get(ip);
  if (!user) {
    rateLimit.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (now - user.timestamp > WINDOW_MS) {
    rateLimit.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (user.count >= LIMIT) {
    return false;
  }
  user.count++;
  return true;
}

export async function POST(req: Request) {
  try {
    // Simple IP extraction (can be improved based on deployment)
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      return new Response('Rate limit exceeded', { status: 429 });
    }

    const { messages } = await req.json();

    // Limit conversation history to last 10 messages
    const recentMessages = messages.slice(-10);

    // Read the docs context dynamically (better for Next.js API routes without webpack raw-loader)
    const docsPath = path.join(process.cwd(), 'src', 'data', 'docs-context.txt');
    let docsContext = '';
    if (fs.existsSync(docsPath)) {
      docsContext = fs.readFileSync(docsPath, 'utf-8');
    } else {
      console.error('Docs context file not found at:', docsPath);
      // Fallback or handle error
    }

    const systemPrompt = `You are "Ask Assistant", the official Reex API Builder documentation assistant.

Rules:
- Answer questions ONLY using the documentation provided below.
- Format responses in clean markdown with code blocks where helpful.
- Be concise but thorough.
- Do not make up features, commands, or capabilities that are not explicitly documented.
- Do not answer general programming questions unrelated to Reex API Builder.

IMPORTANT — Bail Out Rule:
If the answer cannot be found in the provided documentation, you MUST respond with:
"I couldn't find an exact answer in the current documentation. Please check the [Reex Documentation](https://docs.reex.dev) or community forum for more help."

---DOCUMENTATION---
${docsContext}
---END DOCUMENTATION---`;

    const result = await streamText({
      model: google('gemini-flash-latest'),
      system: systemPrompt,
      messages: recentMessages,
    });

    return result.toDataStreamResponse();
    } catch (error: any) {
    console.error('Assistant API Error:', error);
    const message = error?.message || 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
