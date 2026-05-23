import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xnchtzpfmyeiftyacfqk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuY2h0enBmbXllaWZ0eWFjZnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MTQ4NDYsImV4cCI6MjA5NTA5MDg0Nn0.p37oyVjOtZiAhSqdFudMuOHE5hA0Y2CnaXIcJccM5rc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type { User, Session } from '@supabase/supabase-js';
