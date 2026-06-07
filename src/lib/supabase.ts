import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://skrdhktjyiiipxcuxknk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrcmRoa3RqeWlpaXB4Y3V4a25rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDY3ODksImV4cCI6MjA5NTQ4Mjc4OX0.EhuDYdzQguQ-Bc098P7ZYepAGRwwyJFdSySXrEsol10';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'trip_planner',
  },
});

export type { User, Session } from '@supabase/supabase-js';
