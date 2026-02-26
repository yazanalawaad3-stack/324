(() => {
  const qs = (s, el = document) => el.querySelector(s);

  const form = qs('form');
  const msgEl = qs('#formMsg');
  const phoneEl = qs('#phone');
  const passEl = qs('#password');
  const confirmEl = qs('#confirm');
  const inviteEl = qs('#invite');
  const captchaEl = qs('#captcha');
  const captchaImg = qs('#captchaImage');

  function setMsg(text, ok = false) {
    if (!msgEl) return;
    msgEl.style.color = ok ? 'var(--good)' : 'var(--bad)';
    msgEl.textContent = text || '';
  }

  function getInviteFromUrl() {
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      return (code || '').trim();
    } catch {
      return '';
    }
  }

  function getFullPhone(iti) {
    if (iti && typeof iti.getNumber === 'function') {
      const n = iti.getNumber();
      return (n || '').replace(/\s+/g, '');
    }
    return (phoneEl?.value || '').trim();
  }

  function saveUser(row) {
    localStorage.setItem('app_user', JSON.stringify(row));
    localStorage.setItem('app_user_id', row.id);
  }

  async function run() {
    const prefill = getInviteFromUrl();
    if (inviteEl && prefill) inviteEl.value = prefill;

    let iti = null;
    const waitIti = () => {
      try {
        if (window.intlTelInput && phoneEl) {
          iti = window.intlTelInputGlobals?.getInstance?.(phoneEl) || null;
        }
      } catch {}
    };

    window.addEventListener('load', () => {
      waitIti();
      const inv = getInviteFromUrl();
      if (inviteEl && inv) inviteEl.value = inv;
    });

    if (!form) return;

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setMsg('');

      const phone = getFullPhone(iti);
      const pass = (passEl?.value || '').trim();
      const confirm = (confirmEl?.value || '').trim();
      const invite = (inviteEl?.value || '').trim();
      const captcha = (captchaEl?.value || '').trim();
      const captchaExpected = (captchaImg?.textContent || '').trim();

      if (!phone) return setMsg('Phone is required');
      if (pass.length < 6) return setMsg('Password must be at least 6 characters');
      if (pass !== confirm) return setMsg('Passwords do not match');
      if (!captcha || captcha !== captchaExpected) return setMsg('Captcha is incorrect');

      try {
        const { data, error } = await supabase.rpc('register_user', {
          p_phone: phone,
          p_password: pass,
          p_invite_code: invite || null,
        });

        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row?.id) throw new Error('Registration failed');

        saveUser(row);
        setMsg('Registered', true);
        window.location.href = 'invite.html';
      } catch (err) {
        setMsg(err?.message || 'Error');
      }
    });
  }

  run();
})();
