(() => {
  const qs = (s, el = document) => el.querySelector(s);

  const form = qs('#loginForm');
  const msgEl = qs('#formMsg');
  const phoneEl = qs('#phone');
  const passEl = qs('#password');

  function setMsg(text, ok = false) {
    if (!msgEl) return;
    msgEl.style.color = ok ? 'var(--good)' : 'var(--bad)';
    msgEl.textContent = text || '';
  }

  function saveUser(row) {
    localStorage.setItem('app_user', JSON.stringify(row));
    localStorage.setItem('app_user_id', row.id);
  }

  if (!form) return;

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMsg('');

    const phone = (phoneEl?.value || '').trim();
    const pass = (passEl?.value || '').trim();

    if (!phone) return setMsg('Phone is required');
    if (!pass) return setMsg('Password is required');

    try {
      const { data, error } = await supabase.rpc('login_user', {
        p_phone: phone,
        p_password: pass,
      });

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) throw new Error('Login failed');

      saveUser(row);
      setMsg('Logged in', true);
      window.location.href = 'invite.html';
    } catch (err) {
      setMsg(err?.message || 'Error');
    }
  });
})();
