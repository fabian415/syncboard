import { env } from '../config/env.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function chatComplete(messages, { temperature = 0.3 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature,
        messages,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new HttpError(502, `AI provider error: ${res.status}`, 'AI 服務暫時無法使用，請稍後再試');
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new HttpError(502, 'AI provider returned no content', 'AI 回應內容為空，請重試');
    }
    return content;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new HttpError(504, 'AI request timed out', 'AI 服務回應逾時，請重試');
    }
    if (err instanceof HttpError) throw err;
    throw new HttpError(502, err.message, 'AI 服務連線失敗，請稍後再試');
  } finally {
    clearTimeout(timeout);
  }
}
