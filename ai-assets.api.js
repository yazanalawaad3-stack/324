(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const uid = sess.requireAuth("./login.html");
  if (!uid) return;

  const runBtn = document.getElementById("runBtn");
  const earnedEl = document.getElementById("mEarned");
  const runsLeftEl = document.getElementById("runsLeft");
  const totalRunsEl = document.getElementById("totalRuns");
  const perClickEl = document.getElementById("mPerClick");
  const balEl = document.getElementById("mBalance");
  const totalProfitEl = document.getElementById("mTotalProfit");

  // status badges on cards

  // unlock modal
  const unlockModal = document.getElementById("unlockModal");
  const sheetTitle = document.getElementById("sheetTitle");
  const sheetSub = document.getElementById("sheetSub");
  let selectedLevel = "v1";

  function setLoading(isLoading) {
    if (!runBtn) return;
    runBtn.disabled = !!isLoading;
    runBtn.classList.toggle("is-loading", !!isLoading);
  }

  function levelRank(lv) {
    const map = { v0: 0, v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7 };
    return map[String(lv || "v0")] ?? 0;
  }

  function setBadge(el, unlocked) {
    if (!el) return;
    el.textContent = unlocked ? "Unlocked" : "Locked";
    el.classList.toggle("locked", !unlocked);
    el.classList.toggle("unlocked", !!unlocked);
  }

    function setBadgesForLevel(rank) {
    // Update V1 / V2 cards explicitly (these are guaranteed)
    const card1 = document.getElementById('cardV1');
    const card2 = document.getElementById('cardV2');
    if (card1) setBadge(card1.querySelector('.status'), rank >= 1);
    if (card2) setBadge(card2.querySelector('.status'), rank >= 2);

    // Update any card that declares data-level="v1..v7"
    document.querySelectorAll('.level-card[data-level]').forEach((card) => {
      const lvRaw = String(card.getAttribute('data-level') || '').toLowerCase();
      const need = levelRank(lvRaw);
      if (!need) return;
      const badge = card.querySelector('.status');
      if (!badge) return;
      setBadge(badge, rank >= need);
    });
  });
  }

  function openUnlockModal(lv) {
    selectedLevel = lv;
    if (sheetTitle) sheetTitle.textContent = lv === "v2" ? "V2" : "V1";
    if (sheetSub) sheetSub.textContent = lv === "v2" ? "Profit 2.23% • 4 runs / day" : "Profit 1.71% • 3 runs / day";
    if (unlockModal) {
      unlockModal.classList.add("show");
      unlockModal.setAttribute("aria-hidden", "false");
    }
  }

  function closeUnlockModal() {
    if (!unlockModal) return;
    unlockModal.classList.remove("show");
    unlockModal.setAttribute("aria-hidden", "true");
  }

  async function getToday() {
    try {
      const d = await sb.rpc("business_day", {});
      if (d.error) throw d.error;
      return d.data; // 'YYYY-MM-DD'
    } catch {
      const now = new Date();
      return now.toISOString().slice(0, 10);
    }
  }

  async function refreshTop() {
    try {
      const res = await sb.from("v_user_activity").select("level,status,balance,todays_activity").eq("user_id", uid).single();
      if (res.error) throw res.error;

      const level = String((res.data && res.data.level) || "v0");
      localStorage.setItem("lux_level", level);

      const r = levelRank(level);
      setBadgesForLevel(r);

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

      const today = await getToday();
      let claimed = false;
      if (pct > 0) {
        const rr = await sb.from("ai_daily_runs").select("id").eq("user_id", uid).eq("business_day", today).limit(1);
        claimed = !rr.error && Array.isArray(rr.data) && rr.data.length > 0;
      }

      const remaining = claimed ? 0 : (clicks || 0);
      if (totalRunsEl) totalRunsEl.textContent = String(clicks || 0);
      if (runsLeftEl) runsLeftEl.textContent = String(remaining);

      const bal = Number((res.data && res.data.balance) || 0);
      const profit = bal * (pct / 100);
      const perClick = clicks ? profit / clicks : 0;
      if (perClickEl)
        perClickEl.textContent = perClick.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });

      if (balEl) balEl.textContent = bal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
      if (totalProfitEl) totalProfitEl.textContent = profit.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 8 });

      if (earnedEl) earnedEl.textContent = Number((res.data && res.data.todays_activity) || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:8});
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

  document.querySelectorAll("button[data-action='unlock']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const d = String(btn.getAttribute("data-level") || "V1").toLowerCase();
      const lv = d === "v2" ? "v2" : "v1";

      await refreshTop();
      const current = String(localStorage.getItem("lux_level") || "v0");
      const ok = levelRank(current) >= (lv === "v2" ? 2 : 1);
      if (!ok) {
        sess.toast("Locked");
        return;
      }
      openUnlockModal(lv);
    });
  });


  // Coming soon buttons
  document.querySelectorAll("button[data-action='coming']").forEach((btn) => {
    btn.addEventListener("click", () => sess.toast("Coming soon"));
  });

  // close sheet
  document.querySelectorAll("button[data-action='closeSheet']").forEach((btn) => {
    btn.addEventListener("click", closeUnlockModal);
  });
  if (unlockModal) {
    unlockModal.addEventListener("click", (e) => {
      if (e.target === unlockModal) closeUnlockModal();
    });
  }

  if (runBtn) runBtn.addEventListener("click", onRun);
  window.addEventListener("load", refreshTop);
})();
