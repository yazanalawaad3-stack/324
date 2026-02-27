;(() => {
  'use strict';

  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  const onReady = (fn) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitForLUX(timeoutMs = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const lux = window.LUX;
      if (lux && lux.sb && lux.session) return lux;
      await sleep(60);
    }
    return null;
  }

  // ---- UI helpers ----
  function createToast() {
    const toastEl = qs('#luxToast');
    const toastText = qs('#toastText');
    let toastTimer = null;

    return (msg) => {
      if (!toastEl || !toastText) return;
      toastText.textContent = String(msg ?? '');
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1400);
    };
  }

  const toast = createToast();

  async function safeCopy(text) {
    try {
      await navigator.clipboard.writeText(String(text));
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = String(text);
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      } catch {
        return false;
      }
    }
  }

  // ---- Settings menu ----
  function initSettingsMenu() {
    const settingsBtn = qs('#settingsBtn');
    const settingsMenu = qs('#settingsMenu');

    function positionSettingsMenu() {
      if (!settingsBtn || !settingsMenu) return;
      const r = settingsBtn.getBoundingClientRect();
      const top = Math.round(r.bottom + 10);
      const left = Math.max(10, Math.round(r.right - settingsMenu.offsetWidth));
      settingsMenu.style.top = `${top}px`;
      settingsMenu.style.left = `${left}px`;
      settingsMenu.style.right = 'auto';
    }

    function openSettingsMenu() {
      if (!settingsMenu) return;
      positionSettingsMenu();
      settingsMenu.classList.add('show');
      settingsMenu.setAttribute('aria-hidden', 'false');
    }

    function closeSettingsMenu() {
      if (!settingsMenu) return;
      settingsMenu.classList.remove('show');
      settingsMenu.setAttribute('aria-hidden', 'true');
    }

    function toggleSettingsMenu() {
      if (!settingsMenu) return;
      const isOpen = settingsMenu.classList.contains('show');
      isOpen ? closeSettingsMenu() : openSettingsMenu();
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSettingsMenu();
      });
    }

    // Handle clicks inside the menu
    if (settingsMenu) {
      settingsMenu.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = e.target.closest('.lux-menu-item');
        if (!item) return;

        const actionRaw = String(item.getAttribute('data-action') || '').trim();
        if (!actionRaw) return;

        const action = ({
          levels: 'member',
          bonus: 'rewards',
          email: 'security',
          how: 'guide',
          download: 'getapp'
        }[actionRaw] || actionRaw);

        const txEl = qs('.lux-menu-tx', item);
        const label = String(txEl ? txEl.textContent : (action || 'Done')).trim();
        toast(label);

        // Navigation / actions
        if (action === 'message') {
          window.location.href = './message.html';
          return;
        }

        if (action === 'logout') {
          closeSettingsMenu();
          const lux = await waitForLUX(5000);
          try {
            if (lux?.session?.signOut) {
              await lux.session.signOut();
            } else if (lux?.sb?.auth?.signOut) {
              await lux.sb.auth.signOut();
            }
          } catch {
            // ignore
          }
          window.location.href = './login.html';
          return;
        }

        if (action === 'about') window.location.href = './about.html';
        if (action === 'guide') window.location.href = './guide.html';
        if (action === 'language') window.location.href = './language.html';
        if (action === 'member') window.location.href = './member.html';
        if (action === 'rewards') window.location.href = './rewards.html';
        if (action === 'luckydraw') window.location.href = './Luckydraw.html';
        if (action === 'security') window.location.href = './security.html';

        closeSettingsMenu();
      });
    }

    document.addEventListener('click', () => closeSettingsMenu());
    window.addEventListener('resize', () => {
      if (settingsMenu && settingsMenu.classList.contains('show')) positionSettingsMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSettingsMenu();
    });

    return { closeSettingsMenu };
  }

  // ---- Refresh button ----
  function initRefreshButton(closeSettingsMenu) {
    const refreshBtn = qs('#refreshBtn');
    if (!refreshBtn) return;
    refreshBtn.addEventListener('click', () => {
      if (typeof closeSettingsMenu === 'function') closeSettingsMenu();
      window.location.reload();
    });
  }

  // ---- Bottom dock ----
  function initBottomDock() {
    const navItems = qsa('.dock-item');
    const indicator = qs('.dock-indicator');
    if (!navItems.length || !indicator) return;

    function updateIndicator() {
      const activeIndex = Math.max(0, navItems.findIndex((b) => b.classList.contains('active')));
      const parent = indicator.parentElement;
      if (!parent) return;
      const step = (parent.clientWidth - 20) / 5;
      indicator.style.transform = `translateX(${activeIndex * step}px)`;
    }

    function activateDock(screen) {
      const btn = navItems.find((b) => b.getAttribute('data-screen') === screen);
      if (!btn) return;
      navItems.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      updateIndicator();
      const labelEl = btn.querySelector('.dock-tx');
      const label = (labelEl ? labelEl.textContent : (btn.getAttribute('aria-label') || screen));
      toast(String(label).trim() || 'Ready');
    }

    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const screen = btn.getAttribute('data-screen');
        activateDock(screen);
        if (screen && typeof screen === 'string') {
          const s = screen.toLowerCase();
          if (s === 'packages') window.location.href = './packages.html';
          else if (s.includes('ai')) window.location.href = './ai-assets.html';
          else if (s === 'market') window.location.href = './index000.html';
        }
      });
    });

    window.addEventListener('resize', updateIndicator);
    updateIndicator();
  }

  // ---- Quick actions (4 buttons) ----
  function initQuickActions() {
    // Network quick action by id
    const quickNetworkBtn = qs('#quickNetworkBtn');
    if (quickNetworkBtn) {
      quickNetworkBtn.addEventListener('click', () => {
        window.location.href = './network.html';
      });
    }

    // Wallet / Analytics by id (if present)
    const walletBtn = qs('#walletBtn');
    if (walletBtn) walletBtn.addEventListener('click', () => window.location.href = './wallet.html');

    const analyticsBtn = qs('#analyticsBtn');
    if (analyticsBtn) analyticsBtn.addEventListener('click', () => window.location.href = './analytics.html');

    // Transfer: detect by label
    const quickButtons = qsa('.lux-quick');
    quickButtons.forEach((btn) => {
      const labelEl = qs('.lux-quick-label', btn);
      const label = String(labelEl ? labelEl.textContent : '').trim().toLowerCase();
      if (label === 'transfer') {
        btn.addEventListener('click', () => window.location.href = './transfer.html');
      }
    });
  }

  // ---- Coin icons + rates (unchanged logic, guarded) ----
  function initRates() {
    const rateEls = {
      bnb: qs('#rateBNB'),
      trx: qs('#rateTRX'),
      eth: qs('#rateETH'),
      chgBnb: qs('#chgBNB'),
      chgTrx: qs('#chgTRX'),
      chgEth: qs('#chgETH')
    };

    if (!rateEls.bnb && !rateEls.trx && !rateEls.eth) return;

    const last = { bnb: null, trx: null, eth: null };

    function fmtUsd(v) {
      if (!Number.isFinite(v)) return '--';
      if (v >= 1000) return `${v.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDT`;
      if (v >= 1) return `${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
      return `${v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })} USDT`;
    }

    function fmtPct(v) {
      if (!Number.isFinite(v)) return '--';
      const sign = v > 0 ? '+' : '';
      return `${sign}${v.toFixed(2)}%`;
    }

    function setTrend(el, trend) {
      if (!el) return;
      el.classList.remove('is-up', 'is-down');
      if (trend === 'up') el.classList.add('is-up');
      if (trend === 'down') el.classList.add('is-down');
    }

    function setChange(el, v) {
      if (!el) return;
      el.textContent = fmtPct(v);
      el.classList.remove('good', 'bad');
      if (!Number.isFinite(v)) return;
      if (v >= 0) el.classList.add('good');
      else el.classList.add('bad');
    }

    const RATES_CACHE_KEY = 'lux_rates_cache_v1';

    function readCachedRates() {
      try {
        const raw = localStorage.getItem(RATES_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.data || !parsed.ts) return null;
        return parsed;
      } catch {
        return null;
      }
    }

    function writeCachedRates(data) {
      try {
        localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      } catch {
        // ignore
      }
    }

    async function fetchJsonWithTimeout(url, timeoutMs) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { accept: 'application/json' },
          cache: 'no-store',
          signal: ctrl.signal
        });
        if (!res.ok) throw new Error('rates_fetch_failed');
        return await res.json();
      } finally {
        clearTimeout(t);
      }
    }

    function normalizeFromBinance(arr) {
      if (!Array.isArray(arr)) return null;
      const map = Object.create(null);
      for (const it of arr) {
        const sym = String(it?.symbol || '');
        map[sym] = it;
      }
      const bnb = Number(map['BNBUSDT']?.lastPrice);
      const eth = Number(map['ETHUSDT']?.lastPrice);
      const trx = Number(map['TRXUSDT']?.lastPrice);
      const bnbChg = Number(map['BNBUSDT']?.priceChangePercent);
      const ethChg = Number(map['ETHUSDT']?.priceChangePercent);
      const trxChg = Number(map['TRXUSDT']?.priceChangePercent);
      if (!Number.isFinite(bnb) && !Number.isFinite(eth) && !Number.isFinite(trx)) return null;
      return {
        binancecoin: { usd: bnb, usd_24h_change: bnbChg },
        ethereum: { usd: eth, usd_24h_change: ethChg },
        tron: { usd: trx, usd_24h_change: trxChg }
      };
    }

    async function fetchRates() {
      try {
        const bUrl = 'https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BNBUSDT%22,%22ETHUSDT%22,%22TRXUSDT%22%5D';
        const bData = await fetchJsonWithTimeout(bUrl, 2500);
        const normalized = normalizeFromBinance(bData);
        if (normalized) return normalized;
      } catch {
        // fallback
      }
      const cgUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,tron&vs_currencies=usd&include_24hr_change=true';
      return await fetchJsonWithTimeout(cgUrl, 3500);
    }

    function applyRates(data) {
      const eth = Number(data?.ethereum?.usd);
      const bnb = Number(data?.binancecoin?.usd);
      const trx = Number(data?.tron?.usd);

      const ethChg = Number(data?.ethereum?.usd_24h_change);
      const bnbChg = Number(data?.binancecoin?.usd_24h_change);
      const trxChg = Number(data?.tron?.usd_24h_change);

      if (rateEls.eth) {
        rateEls.eth.textContent = fmtUsd(eth);
        const t = last.eth == null ? null : (eth > last.eth ? 'up' : (eth < last.eth ? 'down' : null));
        setTrend(rateEls.eth, t);
        last.eth = Number.isFinite(eth) ? eth : last.eth;
      }
      if (rateEls.bnb) {
        rateEls.bnb.textContent = fmtUsd(bnb);
        const t = last.bnb == null ? null : (bnb > last.bnb ? 'up' : (bnb < last.bnb ? 'down' : null));
        setTrend(rateEls.bnb, t);
        last.bnb = Number.isFinite(bnb) ? bnb : last.bnb;
      }
      if (rateEls.trx) {
        rateEls.trx.textContent = fmtUsd(trx);
        const t = last.trx == null ? null : (trx > last.trx ? 'up' : (trx < last.trx ? 'down' : null));
        setTrend(rateEls.trx, t);
        last.trx = Number.isFinite(trx) ? trx : last.trx;
      }

      setChange(rateEls.chgEth, ethChg);
      setChange(rateEls.chgBnb, bnbChg);
      setChange(rateEls.chgTrx, trxChg);
    }

    function setImg(el, src, alt) {
      if (!el) return;
      const img = document.createElement('img');
      img.className = 'lux-coin-icon';
      img.alt = alt || '';
      img.decoding = 'async';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.src = src;
      el.replaceChildren(img);
    }

    function hydrateCoinIcons() {
      const ICONS = {
        bnb: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/bnb.svg',
        trx: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/trx.svg',
        eth: 'https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/eth.svg'
      };
      const mapNetToCoin = { bep20: 'bnb', trc20: 'trx', erc20: 'eth' };
      qsa('.lux-netrate').forEach((row) => {
        const net = String(row.getAttribute('data-net') || '').toLowerCase();
        const coin = mapNetToCoin[net];
        const holder = qs('.lux-netrate-ic', row);
        if (!holder || !coin || !ICONS[coin]) return;
        setImg(holder, ICONS[coin], coin.toUpperCase());
      });
    }

    async function startRates() {
      hydrateCoinIcons();

      const cached = readCachedRates();
      if (cached?.data) {
        const age = Date.now() - Number(cached.ts || 0);
        if (Number.isFinite(age) && age >= 0 && age <= 10 * 60 * 1000) {
          applyRates(cached.data);
        }
      }

      try {
        const data = await fetchRates();
        applyRates(data);
        writeCachedRates(data);
      } catch {
        // silent
      }

      let timer = null;
      const tick = async () => {
        try {
          const data = await fetchRates();
          applyRates(data);
          writeCachedRates(data);
        } catch {
          // silent
        }
      };

      const startTimer = () => {
        if (timer) return;
        timer = setInterval(tick, 20000);
      };

      const stopTimer = () => {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
      };

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopTimer();
        else {
          tick();
          startTimer();
        }
      });

      startTimer();
    }

    startRates();
  }

  // ---- Supabase data (from original myassets.api.js, but now waits for LUX) ----
  async function initSupabaseData() {
    const lux = await waitForLUX(6000);
    if (!lux?.sb || !lux?.session) return;

    const uid = lux.session.requireAuth('./login.html');
    if (!uid) return;

    const sb = lux.sb;

    async function load() {
      try {
        const res = await sb
          .from('v_user_activity')
          .select('user_id,public_id8,network_id7,level,status,balance,todays_activity,total_activity,network_activity_today,total_network_activity')
          .eq('user_id', uid)
          .single();

        if (res.error) throw res.error;
        const data = res.data;
        if (!data) return;

        const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const balEl = document.getElementById('demoBalance');
        if (balEl) balEl.textContent = fmt(data.balance);

        const todayEl = document.getElementById('todayIncome');
        if (todayEl) todayEl.textContent = '$' + fmt(data.todays_activity);

        const totalEl = document.getElementById('totalIncome');
        if (totalEl) totalEl.textContent = '$' + fmt(data.total_activity);

        const teamTodayEl = document.getElementById('teamIncome');
        if (teamTodayEl) teamTodayEl.textContent = '$' + fmt(data.network_activity_today);

        const teamTotalEl = document.getElementById('teamTotalIncome');
        if (teamTotalEl) teamTotalEl.textContent = '$' + fmt(data.total_network_activity);

        const idEl = document.getElementById('userIdValue');
        if (idEl) idEl.textContent = String(data.public_id8 || idEl.textContent || '');

      } catch {
        // silent
      }
    }

    load();
  }

  onReady(() => {
    const { closeSettingsMenu } = initSettingsMenu() || {};
    initRefreshButton(closeSettingsMenu);
    initBottomDock();
    initQuickActions();
    initRates();

    // Lucide icons (if used)
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } catch {
      // ignore
    }

    // Page ready class
    window.addEventListener('load', () => {
      document.body.classList.add('lux-loaded');
    });

    initSupabaseData();
  });
})();
