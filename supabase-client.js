(function () {
  if (!window.supabase) return;
  const url = window.LUX_SUPABASE_URL;
  const key = window.LUX_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  window.LUX = window.LUX || {};
  window.LUX.sb = window.supabase.createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
})();
