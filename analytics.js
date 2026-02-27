(() => {
  const qs = (s, el=document) => el.querySelector(s);

  const toastEl = qs('#luxToast');
  const toastText = qs('#toastText');
  let toastTimer = null;

  function toast(msg){
    if(!toastEl || !toastText) return;
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  function toISODate(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function prettyDate(iso){
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' });
  }

  function prettyTime(ts){
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
  }

  function businessDayISO(now = new Date()){
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Beirut',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    const parts = fmt.formatToParts(now);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const local = new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`);
    const shifted = new Date(local.getTime() - 2*60*60*1000);
    return toISODate(shifted);
  }

  function getSupabaseClient(){
    const hasRpc = (c) => c && typeof c.rpc === 'function' && typeof c.from === 'function';
    if(hasRpc(window.supabaseClient)) return window.supabaseClient;
    if(hasRpc(window.client)) return window.client;

    if(window.supabase && typeof window.supabase.createClient === 'function'){
      const url = window.LUX_SUPABASE_URL;
      const key = window.LUX_SUPABASE_ANON_KEY;
      if(url && key){
        const c = window.supabase.createClient(url, key);
        window.supabaseClient = c;
        window.client = c;
        return c;
      }
    }
    return null;
  }

  const TYPES = [
    { key: 'deposit_credit', label: 'Deposit', icon: 'fa-arrow-down' },
    { key: 'withdraw_request', label: 'Withdraw', icon: 'fa-arrow-up' },
    { key: 'withdraw_fee', label: 'Withdraw Fee', icon: 'fa-receipt' },
    { key: 'withdraw_release', label: 'Withdraw Paid', icon: 'fa-check' },
    { key: 'ai_profit', label: 'AI Profit', icon: 'fa-robot' },
    { key: 'network_commission', label: 'Team Bonus', icon: 'fa-users' },
    { key: 'signup_bonus', label: 'Signup Bonus', icon: 'fa-gift' },
    { key: 'lucky_draw_prize', label: 'Lucky Draw', icon: 'fa-spinner' },
    { key: 'invest_lock', label: 'Package Lock', icon: 'fa-lock' },
    { key: 'invest_release', label: 'Package Release', icon: 'fa-unlock' },
    { key: 'game_win', label: 'Game Win', icon: 'fa-chart-line' },
    { key: 'game_loss', label: 'Game Loss', icon: 'fa-chart-line' },
    { key: 'admin_adjust', label: 'Adjustment', icon: 'fa-pen' },
  ];

  const dateInput = qs('#dateInput');
  const dateChipBtn = qs('#dateChipBtn');
  const selectedDateText = qs('#selectedDateText');
  const refreshBtn = qs('#refreshBtn');
  const listEl = qs('#logList');
  const emptyState = qs('#emptyState');
  const liveText = qs('#liveText');

  let selectedISO = businessDayISO(new Date());
  let cache = new Map(); // iso -> events array

  function mapRowToEvent(r){
    const typeKey = r.reason;
    const typeMeta = TYPES.find(t => t.key === typeKey) || { label: typeKey, icon: 'fa-circle-info' };
    const direction = (Number(r.amount) >= 0) ? 'in' : 'out';
    const status = r.status || 'success';
    return {
      id: String(r.ledger_id || r.id || ''),
      type: typeKey,
      label: typeMeta.label,
      icon: typeMeta.icon,
      time: r.created_at,
      amount: Math.abs(Number(r.amount || 0)),
      currency: r.currency || 'USDT',
      direction,
      status
    };
  }

  function render(items){
    if(selectedISO === businessDayISO(new Date())){
      selectedDateText.textContent = 'Today';
      if(liveText) liveText.textContent = 'Updated for today';
    }else{
      selectedDateText.textContent = prettyDate(selectedISO);
      if(liveText) liveText.textContent = 'Showing selected date';
    }

    if(!listEl) return;
    listEl.innerHTML = '';

    if(!items || items.length === 0){
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const frag = document.createDocumentFragment();

    items.forEach(ev => {
      const typeMeta = TYPES.find(t => t.key === ev.type) || TYPES[0];
      const row = document.createElement('div');
      row.className = 'lux-log-card';

      const dirClass = ev.direction === 'in' ? 'good' : 'bad';
      const sign = ev.direction === 'in' ? '+' : '-';
      const statusClass = ev.status === 'success' ? 'ok' : 'pending';
      const statusLabel = ev.status === 'success' ? 'Success' : String(ev.status || 'Pending');

      row.innerHTML = `
        <div class="lux-log-ic">
          <i class="fa-solid ${typeMeta.icon}" aria-hidden="true"></i>
        </div>

        <div class="lux-log-mid">
          <div class="lux-log-top">
            <div class="lux-log-title">${typeMeta.label}</div>
            <div class="lux-log-time">${prettyTime(ev.time)}</div>
          </div>

          <div class="lux-log-sub">
            <span class="lux-log-status ${statusClass}">${statusLabel}</span>
            <span class="lux-log-dot" aria-hidden="true">•</span>
            <span class="lux-log-id">#${String(ev.id).slice(-6)}</span>
          </div>
        </div>

        <div class="lux-log-right">
          <div class="lux-log-amt ${dirClass}">${sign}${ev.amount.toFixed(2)} <span class="lux-log-cur">${ev.currency}</span></div>
        </div>
      `;
      frag.appendChild(row);
    });

    listEl.appendChild(frag);
  }

  async function loadForDate(iso){
    const client = getSupabaseClient();
    if(!client){
      alert('Supabase client not found');
      return;
    }

    let uid = null;
    if(typeof window.requireAuth === 'function'){
      uid = window.requireAuth();
      if(!uid) return;
    }else{
      uid = localStorage.getItem('lux_user_id');
    }
    if(!uid){
      alert('No session');
      return;
    }

    if(cache.has(iso)){
      render(cache.get(iso));
      return;
    }

    const { data, error } = await client
      .from('v_financial_log')
      .select('ledger_id, user_id, business_day, created_at, reason, amount, currency, status')
      .eq('user_id', uid)
      .eq('business_day', iso)
      .order('created_at', { ascending: false })
      .limit(200);

    if(error){
      console.error(error);
      alert(error.message || 'Failed to load log');
      return;
    }

    const items = (data || []).map(mapRowToEvent);
    cache.set(iso, items);
    render(items);
  }

  function openNativeDate(){
    if(!dateInput) return;
    dateInput.value = selectedISO;
    const prevStyle = dateInput.getAttribute('style') || '';
    dateInput.style.position = 'fixed';
    dateInput.style.left = '8px';
    dateInput.style.bottom = '8px';
    dateInput.style.opacity = '0.001';
    dateInput.style.zIndex = '9999';
    dateInput.focus();
    if(typeof dateInput.showPicker === 'function') dateInput.showPicker();
    setTimeout(() => { dateInput.setAttribute('style', prevStyle); }, 200);
  }

  if(dateChipBtn){
    dateChipBtn.addEventListener('click', () => openNativeDate());
  }

  if(dateInput){
    dateInput.addEventListener('change', async () => {
      selectedISO = dateInput.value || businessDayISO(new Date());
      await loadForDate(selectedISO);
    });
  }

  if(refreshBtn){
    refreshBtn.addEventListener('click', async () => {
      cache.delete(selectedISO);
      await loadForDate(selectedISO);
      toast('Updated');
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    selectedISO = businessDayISO(new Date());
    if(dateInput) dateInput.value = selectedISO;
    await loadForDate(selectedISO);
  });
})();
