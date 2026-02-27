(function () {
  "use strict";

  // ---- helpers
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function waitFor(fn, timeoutMs) {
    var start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        var v = fn();
        if (v) return v;
      } catch (e) {}
      await sleep(50);
    }
    return null;
  }

  function fmt2(n) {
    var x = Number(n || 0);
    return x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function applyStats(data) {
    if (!data) return;
    setText("demoBalance", fmt2(data.balance));
    setText("todayIncome", "$" + fmt2(data.todays_activity));
    setText("totalIncome", "$" + fmt2(data.total_activity));
    setText("teamIncome", "$" + fmt2(data.network_activity_today));
    setText("teamTotalIncome", "$" + fmt2(data.total_network_activity));

    if (data.public_id8 != null) setText("userIdValue", String(data.public_id8));
  }

  function cacheKey(uid) { return "lux_stats_v1:" + String(uid); }

  function readCache(uid) {
    try {
      var raw = localStorage.getItem(cacheKey(uid));
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.data) return null;
      return obj.data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(uid, data) {
    try {
      localStorage.setItem(cacheKey(uid), JSON.stringify({ ts: Date.now(), data: data }));
    } catch (e) {}
  }

  async function getUid(sb, sess) {
    // Prefer session helper if available
    if (sess && typeof sess.getUserId === "function") {
      try {
        var id1 = await sess.getUserId();
        if (id1) return id1;
      } catch (e) {}
    }

    // Try Supabase auth directly
    if (sb && sb.auth && typeof sb.auth.getUser === "function") {
      try {
        var u = await sb.auth.getUser();
        var id2 = u && u.data && u.data.user && u.data.user.id;
        if (id2) return id2;
      } catch (e) {}
    }

    // Fallback to requireAuth if it exists (may redirect)
    if (sess && typeof sess.requireAuth === "function") {
      try {
        var id3 = sess.requireAuth("./login.html");
        if (id3) return id3;
      } catch (e) {}
    }

    return null;
  }

  async function loadStats() {
    // Wait for LUX, Supabase client, and session helpers to exist
    var lux = await waitFor(function () { return window.LUX; }, 10000);
    if (!lux) return;

    var sb = await waitFor(function () { return window.LUX && window.LUX.sb; }, 10000);
    var sess = await waitFor(function () { return window.LUX && window.LUX.session; }, 10000);
    if (!sb) return;

    // Determine user
    var uid = await getUid(sb, sess);
    if (!uid) return;

    // Apply cached stats immediately (if any) to avoid "old design numbers" flicker
    var cached = readCache(uid);
    if (cached) applyStats(cached);

    // Query latest stats
    try {
      var res = await sb
        .from("v_user_activity")
        .select("user_id,public_id8,network_id7,level,status,balance,todays_activity,total_activity,network_activity_today,total_network_activity")
        .eq("user_id", uid)
        .single();

      if (res && res.error) throw res.error;
      var data = res && res.data;
      if (!data) return;

      applyStats(data);
      writeCache(uid, data);
    } catch (err) {
      // Keep UI interactive even if stats fail
      try { console.error("[myassets.api] loadStats failed:", err); } catch (e) {}
    }
  }

  // Kick off as early as possible without blocking UI
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { loadStats(); });
  } else {
    loadStats();
  }
})();