(() => {
  const CACHE_PREFIX = 'lux_stats_cache_v1:';

  const waitFor = (fn, { timeoutMs = 7000, intervalMs = 25 } = {}) =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        try {
          const v = fn();
          if (v) return resolve(v);
        } catch (_) {}
        if (Date.now() - start > timeoutMs) return reject(new Error('Init timeout'));
        setTimeout(tick, intervalMs);
      };
      tick();
    });

  const fmt = (n) =>
    Number(n || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  const applyStatsToUI = (data) => {
    if (!data) return;

    if (data.balance != null) setText('demoBalance', fmt(data.balance));
    if (data.todays_activity != null) setText('todayIncome', '$' + fmt(data.todays_activity));
    if (data.total_activity != null) setText('totalIncome', '$' + fmt(data.total_activity));
    if (data.network_activity_today != null) setText('teamIncome', '$' + fmt(data.network_activity_today));
    if (data.total_network_activity != null) setText('teamTotalIncome', '$' + fmt(data.total_network_activity));

    if (data.public_id8 != null) {
      const idEl = document.getElementById('userIdValue');
      const v = String(data.public_id8 || '').trim();
      if (idEl && v) idEl.textContent = v;
    }

    document.documentElement.classList.remove('lux-loading-stats');
  };

  const cacheKey = (uid) => `${CACHE_PREFIX}${uid}`;

  const readCache = (uid) => {
    try {
      const raw = localStorage.getItem(cacheKey(uid));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_) {
      return null;
    }
  };

  const writeCache = (uid, payload) => {
    try {
      localStorage.setItem(cacheKey(uid), JSON.stringify({ ...payload, _ts: Date.now() }));
    } catch (_) {}
  };

  const loadFresh = async (sb, sess, uid) => {
    const res = await sb
      .from('v_user_activity')
      .select(
        'user_id,public_id8,network_id7,level,status,balance,todays_activity,total_activity,network_activity_today,total_network_activity'
      )
      .eq('user_id', uid)
      .single();

    if (res.error) throw res.error;
    const data = res.data;
    if (!data) return;

    applyStatsToUI(data);

    writeCache(uid, {
      balance: data.balance,
      todays_activity: data.todays_activity,
      total_activity: data.total_activity,
      network_activity_today: data.network_activity_today,
      total_network_activity: data.total_network_activity,
      public_id8: data.public_id8,
    });

    // Keep existing app behavior that expects these values
    try {
      localStorage.setItem('lux_public_id8', String(data.public_id8 || ''));
      localStorage.setItem('lux_network_id7', String(data.network_id7 || ''));
      localStorage.setItem('lux_level', String(data.level || ''));
      localStorage.setItem('lux_status', String(data.status || ''));
    } catch (_) {}
  };

  const boot = async () => {
    try {
      const lux = await waitFor(() => window.LUX && window.LUX.session && window.LUX.sb);
      const sb = lux.sb;
      const sess = lux.session;

      const uid = sess.requireAuth('./login.html');
      if (!uid) return;

      // 1) Show cached real values instantly (if available)
      const cached = readCache(uid);
      if (cached) {
        applyStatsToUI(cached);
      }

      // 2) Always fetch fresh values (no blocking UI)
      await loadFresh(sb, sess, uid);
    } catch (err) {
      // If load fails and no cache, keep skeleton but avoid breaking the page.
      try {
        const lux = window.LUX;
        if (lux && lux.session && typeof lux.session.toast === 'function') {
          lux.session.toast((err && err.message) || 'Load error');
        }
      } catch (_) {}
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
