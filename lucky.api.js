(() => {
  const qs = (s, el = document) => el.querySelector(s);

  const tiles = Array.from(document.querySelectorAll('[data-prize]'));
  const modal = qs('#modal');
  const modalPrize = qs('#modalPrize');
  const closeModal = qs('#closeModal');
  const okBtn = qs('#okBtn');
  const spinBtn = qs('#spinBtn');
  const startBtn = qs('#startBtn');
  const overlay = modal?.querySelector('.overlay');
  const remainingEl = qs('#remaining');

  const state = {
    userId: null,
    enabled: true,
    remaining: 0,
    spinning: false,
  };

  function getClient() {
    return window.supabaseClient || window.supabase;
  }

  function openModal(text) {
    modalPrize.textContent = text;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function hideModal() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  function playWinSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(660, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.14);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.20, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.24);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.26);
      o.onended = () => ctx.close();
    } catch (_) {
      // ignore
    }
  }

  function setRemaining(n) {
    state.remaining = Math.max(0, Number(n) || 0);
    if (remainingEl) remainingEl.textContent = String(state.remaining);
    const disabled = !state.enabled || state.remaining <= 0;
    if (startBtn) startBtn.disabled = disabled;
    if (spinBtn) spinBtn.disabled = disabled;
    if (startBtn) startBtn.style.opacity = disabled ? '0.55' : '1';
  }

  function randomPreviewPick() {
    const usdtTiles = tiles.filter(t => /USDT$/i.test(t.dataset.prize || ''));
    const pool = usdtTiles.length ? usdtTiles : tiles;
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx]?.dataset?.prize || '—';
  }

  async function loadState() {
    const client = getClient();
    if (!client) {
      alert('Supabase client not found');
      return;
    }

    // requireAuth from session.js
    let uid = null;
    try {
      if (typeof window.requireAuth === 'function') {
        uid = window.requireAuth();
      }
    } catch (_) {}

    if (!uid) {
      uid =
        localStorage.getItem('lux_user_id') ||
        localStorage.getItem('user_id') ||
        localStorage.getItem('uid') ||
        localStorage.getItem('userId');
    }

    if (!uid) {
      alert('Not logged in');
      return;
    }

    state.userId = uid;

    const { data, error } = await client.rpc('app_lucky_get_state', { p_user: state.userId });
    if (error) {
      console.error(error);
      alert(error.message || 'Failed to load state');
      return;
    }

    state.enabled = !!data?.enabled;
    setRemaining(data?.remaining || 0);

    if (!state.enabled) {
      if (remainingEl) remainingEl.textContent = '0';
      if (startBtn) startBtn.disabled = true;
      if (spinBtn) spinBtn.disabled = true;
    }
  }

  async function doSpin() {
    if (state.spinning) return;
    if (!state.enabled) {
      alert('Lucky Draw is not available now');
      return;
    }
    if (state.remaining <= 0) {
      alert('No spins available');
      return;
    }

    const client = getClient();
    if (!client) {
      alert('Supabase client not found');
      return;
    }

    state.spinning = true;
    openModal('Spinning...');
    if (spinBtn) spinBtn.disabled = true;
    if (startBtn) startBtn.disabled = true;

    try {
      const { data, error } = await client.rpc('app_lucky_spin', { p_user: state.userId });
      if (error) throw error;

      const amount = Number(data?.amount || 0);
      modalPrize.textContent = `${amount.toFixed(2)} USDT`;
      playWinSound();

      setRemaining(data?.remaining || 0);
    } catch (e) {
      console.error(e);
      modalPrize.textContent = 'Failed. Try again.';
      // reload in case ticket changed
      await loadState();
    } finally {
      state.spinning = false;
      const disabled = !state.enabled || state.remaining <= 0;
      if (spinBtn) spinBtn.disabled = disabled;
      if (startBtn) startBtn.disabled = disabled;
    }
  }

  function bindUI() {
    tiles.forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.prize)));

    startBtn?.addEventListener('click', doSpin);
    spinBtn?.addEventListener('click', doSpin);

    closeModal?.addEventListener('click', hideModal);
    okBtn?.addEventListener('click', hideModal);
    overlay?.addEventListener('click', hideModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) hideModal();
    });

    // if user opens modal without spins, show preview
    if (startBtn) {
      startBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openModal(randomPreviewPick());
      });
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    bindUI();
    await loadState();
    setInterval(loadState, 10000);
  });
})();
