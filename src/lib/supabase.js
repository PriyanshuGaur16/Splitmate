import { createClient } from '@supabase/supabase-js'

// The client keeps the session in the browser (persistSession) and refreshes
// the token automatically, so a user stays signed in after closing the browser.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
)
