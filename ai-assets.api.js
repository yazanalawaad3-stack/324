(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const uid = sess.requireAuth("./login.html");
  if (!uid) return;

  const runBtn = document.getElementById("runBtn");
  const earnedEl = document.getElementById("mEarned");

  function setLoading(isLoading) {
    if (!runBtn) return;
    runBtn.disabled = !!isLoading;
    runBtn.classList.toggle("is-loading", !!isLoading);
  }

  async function refreshTop() {
    try {
      const res = await sb.from("v_user_activity").select("level,status,balance,todays_activity").eq("user_id", uid).single();
      if (res.error) throw res.error;

      const level = String((res.data && res.data.level) || "v0");
      localStorage.setItem("lux_level", level);

      const totalRunsEl = document.getElementById("totalRuns");
      const remainingEl = document.getElementById("remainRuns");
      const pctEl = document.getElementById("mPercent");
      const perClickEl = document.getElementById("mPerClick");

      let pct = 0;
      let clicks = 0;
      if (level === "v1") {
        pct = 1.71;
        clicks = 3;
      }
      if (level === "v2") {
        pct = 2.23;
        clicks = 4;
      }

      if (totalRunsEl) totalRunsEl.textContent = String(clicks || 0);
      if (remainingEl) remainingEl.textContent = String(clicks || 0);
      if (pctEl) pctEl.textContent = pct ? pct.toFixed(2) + "%" : "0%";

      const bal = Number((res.data && res.data.balance) || 0);
      const profit = bal * (pct / 100);
      const perClick = clicks ? profit / clicks : 0;
      if (perClickEl)
        perClickEl.textContent = perClick.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });

      if (earnedEl) earnedEl.textContent = String((res.data && res.data.todays_activity) || 0);
    } catch (err) {
      sess.toast((err && err.message) || "Load error");
    }
  }

  async function onRun() {
    setLoading(true);
    try {
      const res = await sb.rpc("app_ai_claim", { p_user: uid });
      if (res.error) throw res.error;
      sess.toast("Done");
      await refreshTop();
    } catch (err) {
      sess.toast((err && err.message) || "Run error");
    } finally {
      setLoading(false);
    }
  }

  if (runBtn) runBtn.addEventListener("click", onRun);
  window.addEventListener("load", refreshTop);
})();
