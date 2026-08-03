const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

export async function askClaude(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text;
  if (!text) throw new Error('Claude returned no text');
  return text;
}

/** Ask Claude for JSON and parse it, tolerating markdown fences. */
export async function askClaudeJson<T>(opts: { system: string; user: string; maxTokens?: number }): Promise<T> {
  const text = await askClaude(opts);
  const cleaned = text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in Claude response');
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
