import "server-only";

import { createAdminClient } from "./supabase/admin";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
};

export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc(
    "check_rate_limit",
    {
      p_rate_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    },
  );

  if (error) {
    console.error(
      "Rate limit check failed:",
      error.message,
    );

    return {
      allowed: false,
      remaining: 0,
    };
  }

  const result = data?.[0];

  if (!result) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  return {
    allowed: Boolean(result.allowed),
    remaining: Number(result.remaining ?? 0),
  };
}