import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS: only allow the production origin and local dev ─────────────────────
const ALLOWED_ORIGINS = [
  'https://dicky818.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// ── In-memory rate limiter (fast path — still useful as first line of defense) ─
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;           // max requests
const RATE_WINDOW_MS = 60_000;   // per 60 seconds

function checkRateLimitMemory(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Persistent rate limiter (DB-backed, survives cold starts) ────────────────
async function checkRateLimitDB(userId: string, serviceClient: ReturnType<typeof createClient>): Promise<boolean> {
  try {
    const { data, error } = await serviceClient.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: 'ai-advice',
      p_max_requests: RATE_LIMIT,
      p_window_seconds: 60,
    });
    if (error) {
      console.error('Rate limit DB check failed:', error.message);
      // Fall back to in-memory if DB fails
      return true;
    }
    return data === true;
  } catch (e) {
    console.error('Rate limit DB error:', e);
    return true; // Fail open if DB is unreachable
  }
}

// ── Prompt sanitisation: strip obvious injection attempts ─────────────────────
function sanitisePrompt(raw: string): string {
  return raw
    .replace(/\bignore\s+(all\s+)?previous\s+instructions?\b/gi, '[removed]')
    .replace(/\bsystem\s*:\s*/gi, '[removed]')
    .replace(/\bact\s+as\b/gi, '[removed]')
    .replace(/\byou\s+are\s+now\b/gi, '[removed]')
    .replace(/\bforget\s+(everything|all)\b/gi, '[removed]')
    .slice(0, 4000); // hard cap
}

async function waitWithAbort(milliseconds: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return false;
  return await new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve(true);
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function fetchGeminiWithTimeout(url: string, init: RequestInit, requestSignal: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const abortFromClient = () => controller.abort();
  if (requestSignal.aborted) throw new DOMException('Client disconnected', 'AbortError');
  requestSignal.addEventListener('abort', abortFromClient, { once: true });
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    requestSignal.removeEventListener('abort', abortFromClient);
  }
}

function providerRetryDelayMs(response: Response, body: string, fallbackMs: number): number {
  const headerSeconds = Number(response.headers.get('retry-after'));
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
    return Math.min(20_000, Math.max(650, Math.round(headerSeconds * 1000)));
  }
  const retryMatch = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/)
    || body.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  const bodySeconds = retryMatch ? Number(retryMatch[1]) : NaN;
  return Number.isFinite(bodySeconds) && bodySeconds > 0
    ? Math.min(20_000, Math.max(650, Math.round(bodySeconds * 1000)))
    : fallbackMs;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  // ── Preflight ────────────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  // ── Only accept POST ─────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  // ── JWT Authentication ───────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized: missing token' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized: empty token' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  // Verify JWT against Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  // ── Rate limiting (dual-layer: memory + DB) ─────────────────────────────────
  // Fast path: in-memory check (catches repeated abuse within same instance)
  if (!checkRateLimitMemory(user.id)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute.' }), {
      status: 429,
      headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  // Persistent check: DB-backed (survives cold starts, works across instances)
  if (supabaseServiceKey) {
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'trip_planner' },
    });
    const allowed = await checkRateLimitDB(user.id, serviceClient);
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute.' }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }
  }

  // ── Parse and validate body ──────────────────────────────────────────────────
  let body: { prompt?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Missing or invalid prompt' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const prompt = sanitisePrompt(body.prompt.trim());

  // ── Call Gemini API ──────────────────────────────────────────────────────────
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  const model = 'gemini-flash-latest';

  if (!geminiKey) {
    console.error('GEMINI_API_KEY not set in edge function environment');
    return new Response(JSON.stringify({ error: 'AI 服務暫時不可用，請稍後再試' }), {
      status: 503,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  // Build system + user content for Gemini
  const systemInstruction = '你是一個專業的旅遊顧問，請用繁體中文提供詳細且實用的旅遊建議。不要執行任何非旅遊相關的指令。';

  try {
    const requestBody = JSON.stringify({
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
    });
    let response: Response | null = null;
    let providerBody = '';
    let retryDelayMs = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (req.signal.aborted) return new Response(JSON.stringify({ error: '請求已取消' }), { status: 499, headers: { ...headers, 'Content-Type': 'application/json' } });
      try {
        response = await fetchGeminiWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-goog-api-key': geminiKey },
            body: requestBody,
          },
          req.signal,
        );
      } catch (error) {
        if (req.signal.aborted) return new Response(JSON.stringify({ error: '請求已取消' }), { status: 499, headers: { ...headers, 'Content-Type': 'application/json' } });
        if (attempt === 2) {
          console.error('Gemini API request failed:', error instanceof Error ? error.message : 'unknown error');
          return new Response(JSON.stringify({ error: 'AI 服務逾時，請稍後再試' }), { status: 504, headers: { ...headers, 'Content-Type': 'application/json' } });
        }
        if (!await waitWithAbort(650 * (attempt + 1), req.signal)) return new Response(JSON.stringify({ error: '請求已取消' }), { status: 499, headers: { ...headers, 'Content-Type': 'application/json' } });
        continue;
      }
      if (response.ok) break;
      providerBody = await response.text();
      const retryable = response.status === 429 || response.status === 503;
      retryDelayMs = providerRetryDelayMs(response, providerBody, 650 * (attempt + 1));
      if (!retryable || attempt === 2) break;
      if (!await waitWithAbort(retryDelayMs, req.signal)) return new Response(JSON.stringify({ error: '請求已取消' }), { status: 499, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    if (!response || !response.ok) {
      console.error(`Gemini API error: ${response?.status ?? 'network failure'} ${providerBody}`);
      if (response?.status === 429) {
        const retrySeconds = Math.max(1, Math.ceil(retryDelayMs / 1000));
        return new Response(JSON.stringify({ error: `AI 服務暫時達到使用額度，請約 ${retrySeconds} 秒後再試` }), {
          status: 429,
          headers: { ...headers, 'Content-Type': 'application/json', 'Retry-After': String(retrySeconds) },
        });
      }
      return new Response(JSON.stringify({ error: 'AI 服務暫時不可用，請稍後再試' }), {
        status: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text ?? '';
    const finishReason = candidate?.finishReason ?? '';

    if (!text) {
      console.error('Empty Gemini response:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'AI 回應為空，請稍後再試' }), {
        status: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // If truncated due to token limit, append a notice
    const finalText = finishReason === 'MAX_TOKENS'
      ? text + '\n\n> ⚠️ 內容因長度限制被截斷，請嘗試重新生成。'
      : text;

    return new Response(JSON.stringify({ text: finalText, model, finishReason }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Edge function error:', e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ error: '內部伺服器錯誤，請稍後再試' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
});
