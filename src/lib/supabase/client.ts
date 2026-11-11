"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/lib/env";
import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  client ??= createBrowserClient<Database>(config.url, config.publishableKey);
  return client;
}
