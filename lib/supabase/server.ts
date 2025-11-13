// File: lib/supabase/server.ts (Server-side Supabase client without auth-helpers cookies issue)

import { createClient } from "@supabase/supabase-js";
import { cookies as getCookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Creates a Supabase Client for Server Components and Route Handlers.
 * Uses plain supabase-js client with custom cookie handler to avoid async/await issues.
 * The client manages its own session based on cookies provided.
 */
export const createSupabaseServerClient = () => {
  const cookieStore = getCookies();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        // Pass cookies to the server request headers if needed
        cookie: cookieStore
          .getAll()
          .map(({ name, value }) => `${name}=${value}`)
          .join(";"),
      },
    },
  });
};
