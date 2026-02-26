(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const uid = sess.requireAuth("./login.html");
  if (!uid) return;

  // Top stats
  const runsLeftEl = document.getElementById("runsLeft");
  const totalRunsEl = document.getElementById("totalRuns");

  // Cards
  const cards = Array.from(document.querySelectorAll(".level-card"));

  // Full modal (desktop + mobile)
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modal = document.getElementById("modal");
  const closeModalBtn = document.getElementById("closeModal");

  const modalTitle = document.getElementById("modalTitle");
  const runTimeText = document.getElementById("runTimeText");
  const rateText = document.getElementById("rateText");
  const modalBalance = document.getElementById("modalBalance");

  const progressLabel = document.getElementById("progressLabel");
  const timeLeft = document.getElementById("timeLeft");
  const progressFill = document.getElementById("progressFill");
  const stepsEl = document.getElementById("steps");

  const profitValue = document.getElementById("profitValue");
  const resultSub = document.getElementById("resultSub");

  const lockNote = document.getElementById("lockNote");
  const lockNoteText = document.getElementById("lockNoteText");

  const startBtn = document.getElementById("startBtn");
  const claimBtn = document.getElementById("claimBtn");

  // Bottom sheet exists in HTML; we keep it closed/unused.
  const unlockSheet = document.getElementById("unlockModal");
  if (unlockSheet) unlockSheet.remove();

  const LEVELS = {
    v1: { percent: 1.71, clicks: 3, runTimeSec: 10 },
    v2: { percent: 2.23, clicks: 4, runTimeSec: 13 }
  };

  const levelRank = (lv) => {
    const map = { v0: 0, v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7 };
    return map[String(lv || "v0")] ?? 0;
  };

  const setBadge = (badge, unlocked) => {
    if (!badge) return;
    badge.textContent = unlocked ? "Unlocked" : "Locked";
    badge.classList.toggle("locked", !unlocked);
    badge.classList.toggle("unlocked", !!unlocked);
  };

  async function getBusinessDay() {
    const r = await sb.rpc("business_day", {});
    if (r.error) {
      const now = new Date();
      return now.toISOString().slice(0, 10);
    }
    return r.data;
  }

  async function getUserActivity() {
    const r = await sb
      .from("v_user_activity")
      .select("level,status,balance")
      .eq("user_id", uid)
      .single();
    if (r.error) throw r.error;
    return r.data;
  }

  async function hasClaimedToday(day) {
    const rr = await sb
      .from("ai_daily_runs")
      .select("id, profit_amount")
      .eq("user_id", uid)
      .eq("business_day", day)
      .limit(1);
    if (rr.error) return { claimed: false, profit: 0 };
    if (Array.isArray(rr.data) && rr.data.length > 0) {
      return { claimed: true, profit: Number(rr.data[0].profit_amount || 0) };
    }
    return { claimed: false, profit: 0 };
  }

  function updateCardsForLevel(rank) {
    cards.forEach((card) => {
      const lvRaw = String(card.querySelector("button[data-level]")?.getAttribute("data-level") || "").toLowerCase();
      let need = null;
      if (lvRaw === "v1") need = 1;
      if (lvRaw === "v2") need = 2;
      const badge = card.querySelector(".status");
      if (!badge) return;
      if (need == null) {
        setBadge(badge, false);
        return;
      }
      setBadge(badge, rank >= need);
    });
  }

  function openModal() {
    if (modalBackdrop) modalBackdrop.classList.add("open");
    if (modal) {
      modal.classList.add("open");
      modal.setAttribute("aria-hidden", "false");
    }
  }

  function closeModal() {
    if (modalBackdrop) modalBackdrop.classList.remove("open");
    if (modal) {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function setLockMessage(msg) {
    if (lockNote) lockNote.hidden = !msg;
    if (lockNoteText) lockNoteText.textContent = msg || "";
  }

  function setProgress(pct, label, tleft) {
    if (progressFill) progressFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (progressLabel) progressLabel.textContent = label || "";
    if (timeLeft) timeLeft.textContent = tleft || "";
  }

  function resetSteps() {
    if (!stepsEl) return;
    const steps = Array.from(stepsEl.querySelectorAll(".step"));
    steps.forEach((s) => {
      s.classList.remove("active");
      s.classList.remove("done");
    });
  }

  function markStep(i, state) {
    if (!stepsEl) return;
    const steps = Array.from(stepsEl.querySelectorAll(".step"));
    const el = steps[i];
    if (!el) return;
    el.classList.toggle("active", state === "active");
    el.classList.toggle("done", state === "done");
  }

  function fmt(n, min = 2, max = 8) {
    const num = Number(n || 0);
    return num.toLocaleString("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });
  }

  let ui = {
    day: null,
    userLevel: "v0",
    userStatus: "active",
    balance: 0,
    claimed: false,
    claimedProfit: 0,

    modalLevel: "v1",
    clicksNeeded: 0,
    clicksDone: 0,
    percent: 0,
    runTimeSec: 0,
    totalProfit: 0,
    perClick: 0,
    busy: false
  };

  async function refreshTop() {
    const day = await getBusinessDay();
    const act = await getUserActivity();

    ui.day = day;
    ui.userLevel = String(act.level || "v0");
    ui.userStatus = String(act.status || "active");
    ui.balance = Number(act.balance || 0);

    const rank = levelRank(ui.userLevel);
    updateCardsForLevel(rank);

    const v = LEVELS[ui.userLevel];
    const clicks = v ? v.clicks : 0;

    const claim = v ? await hasClaimedToday(day) : { claimed: false, profit: 0 };
    ui.claimed = !!claim.claimed;
    ui.claimedProfit = Number(claim.profit || 0);

    if (totalRunsEl) totalRunsEl.textContent = String(clicks);
    if (runsLeftEl) runsLeftEl.textContent = String(ui.claimed ? 0 : clicks);
  }

  function hydrateModal(levelKey) {
    const cfg = LEVELS[levelKey];
    ui.modalLevel = levelKey;
    ui.clicksNeeded = cfg.clicks;
    ui.clicksDone = 0;
    ui.percent = cfg.percent;
    ui.runTimeSec = cfg.runTimeSec;

    ui.totalProfit = ui.balance * (ui.percent / 100);
    ui.perClick = ui.totalProfit / ui.clicksNeeded;

    if (modalTitle) modalTitle.textContent = `${levelKey.toUpperCase()} AI Session`;
    if (runTimeText) runTimeText.textContent = `${cfg.runTimeSec} sec`;
    if (rateText) rateText.textContent = `${cfg.percent.toFixed(2)}%`;
    if (modalBalance) modalBalance.textContent = fmt(ui.balance, 2, 8);

    if (profitValue) profitValue.textContent = fmt(0, 2, 8);
    if (resultSub) resultSub.textContent = `Click Run ${ui.clicksNeeded} times to complete.`;

    resetSteps();
    setProgress(0, "Ready", "—");

    setLockMessage("");

    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = `Run (0/${ui.clicksNeeded})`;
    }
    if (claimBtn) {
      claimBtn.disabled = true;
      claimBtn.textContent = "Claim";
    }

    if (ui.claimed) {
      setLockMessage("Already claimed today.");
      if (startBtn) startBtn.disabled = true;
      if (claimBtn) claimBtn.disabled = true;
      if (profitValue) profitValue.textContent = fmt(ui.claimedProfit, 2, 8);
      if (resultSub) resultSub.textContent = "Come back tomorrow.";
      setProgress(100, "Completed", "0s");
    }

    if (ui.userStatus !== "active") {
      setLockMessage("Account is frozen.");
      if (startBtn) startBtn.disabled = true;
      if (claimBtn) claimBtn.disabled = true;
    }
  }

  async function animateRun(runIndex) {
    const start = Date.now();
    const duration = Math.min(1800, ui.runTimeSec * 250); // quick UI animation

    resetSteps();
    markStep(0, "active");

    return new Promise((resolve) => {
      const tick = () => {
        const t = (Date.now() - start) / duration;
        const pct = Math.round(t * 100);
        setProgress(pct, `Running (${runIndex}/${ui.clicksNeeded})`, `${Math.max(0, Math.ceil((duration - (Date.now() - start)) / 250))}s`);

        if (t >= 1) {
          setProgress(100, `Run done (${runIndex}/${ui.clicksNeeded})`, "0s");
          markStep(0, "done");
          markStep(1, "done");
          markStep(2, "done");
          markStep(3, "done");
          markStep(4, "done");
          resolve();
          return;
        }

        if (t > 0.2) markStep(1, "active");
        if (t > 0.4) markStep(2, "active");
        if (t > 0.6) markStep(3, "active");
        if (t > 0.8) markStep(4, "active");

        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async function onRunClick() {
    if (ui.busy) return;
    if (ui.claimed) return;

    ui.busy = true;
    try {
      ui.clicksDone += 1;
      if (startBtn) startBtn.textContent = `Run (${ui.clicksDone}/${ui.clicksNeeded})`;

      await animateRun(ui.clicksDone);

      const earned = ui.perClick * ui.clicksDone;
      if (profitValue) profitValue.textContent = fmt(earned, 2, 8);
      if (resultSub) resultSub.textContent = `Progress: ${ui.clicksDone}/${ui.clicksNeeded}`;

      if (ui.clicksDone >= ui.clicksNeeded) {
        if (startBtn) {
          startBtn.disabled = true;
          startBtn.textContent = "Completed";
        }
        if (claimBtn) {
          claimBtn.disabled = false;
          claimBtn.textContent = "Claim";
        }
        if (resultSub) resultSub.textContent = "Ready to claim.";
      }
    } finally {
      ui.busy = false;
    }
  }

  async function onClaim() {
    if (ui.busy) return;
    if (ui.claimed) return;
    if (ui.clicksDone < ui.clicksNeeded) return;

    ui.busy = true;
    try {
      if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.textContent = "Claiming...";
      }

      const r = await sb.rpc("app_ai_claim", { p_user: uid });
      if (r.error) throw r.error;

      // Refresh to get actual credited amount
      const claim = await hasClaimedToday(ui.day);
      ui.claimed = !!claim.claimed;
      ui.claimedProfit = Number(claim.profit || ui.totalProfit || 0);

      if (profitValue) profitValue.textContent = fmt(ui.claimedProfit, 2, 8);
      if (resultSub) resultSub.textContent = "Claimed successfully.";

      await refreshTop();
      sess.toast("Claimed");

      setTimeout(closeModal, 500);
    } catch (e) {
      sess.toast((e && e.message) || "Claim error");
      if (claimBtn) {
        claimBtn.disabled = false;
        claimBtn.textContent = "Claim";
      }
    } finally {
      ui.busy = false;
    }
  }

  async function tryOpenFor(levelKey) {
    await refreshTop();

    const needRank = levelKey === "v2" ? 2 : 1;
    if (levelRank(ui.userLevel) < needRank) {
      sess.toast("Locked");
      return;
    }

    hydrateModal(levelKey);
    openModal();
  }

  // Bind unlock buttons
  document.querySelectorAll("button[data-action='unlock']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lv = String(btn.getAttribute("data-level") || "V1").toLowerCase();
      const key = lv === "v2" ? "v2" : "v1";
      tryOpenFor(key);
    });
  });

  // Coming soon buttons
  document.querySelectorAll("button[data-action='coming']").forEach((btn) => {
    btn.addEventListener("click", () => sess.toast("Coming soon"));
  });

  // Modal close handlers
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // Modal actions
  if (startBtn) startBtn.addEventListener("click", onRunClick);
  if (claimBtn) claimBtn.addEventListener("click", onClaim);

  window.addEventListener("load", () => {
    refreshTop().catch((e) => sess.toast((e && e.message) || "Load error"));
  });
})();
