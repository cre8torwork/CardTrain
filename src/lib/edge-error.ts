// Surface the message an edge function actually returned.
//
// supabase-js reports any non-2xx from a function as the generic
// "Edge Function returned a non-2xx status code", throwing away the response
// body — so a helpful server message like
//   "UnionPay is not configured: set CYBS_SA_CUP_PROFILE_ID … for MID …204"
// never reaches the customer or the console. Every opaque payment error in this
// project has cost a debugging cycle; don't add another.
//
// The body lives on `error.context`, which is a Response in supabase-js v2 but a
// JSON string in some versions/paths — handle both, and never throw from here.

export interface EdgeErrorLike {
  message?: string;
  context?: unknown;
}

export async function edgeErrorMessage(
  error: EdgeErrorLike | null | undefined,
  fallback = 'Payment could not be started. Please try again.',
): Promise<string> {
  if (!error) return fallback;
  const ctx = error.context;

  // v2: context is a Response we can read the JSON body from.
  if (ctx && typeof (ctx as Response).json === 'function') {
    try {
      const body = await (ctx as Response).clone().json();
      const msg = body?.error ?? body?.message;
      if (typeof msg === 'string' && msg) return msg;
    } catch {
      /* body wasn't JSON — fall through */
    }
  }

  // Some paths hand back the raw body as a string.
  if (typeof ctx === 'string' && ctx) {
    try {
      const body = JSON.parse(ctx);
      const msg = body?.error ?? body?.message;
      if (typeof msg === 'string' && msg) return msg;
    } catch {
      return ctx;
    }
  }

  return error.message || fallback;
}
