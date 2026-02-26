import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://lcwppbfjzhyyskdbzahp.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxjd3BwYmZqemh5eXNrZGJ6YWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5ODYwMDksImV4cCI6MjA4NzU2MjAwOX0.PWyYHrvyqP2jeCKsumbBwiyMfGVNXYpWnOQFwlmpp9Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
