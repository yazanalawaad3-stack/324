(function () {
  "use strict";

  function getUserId() {
    if (typeof window.requireAuth === "function") {
      try {
        return window.requireAuth();
      } catch (e) {
        return null;
      }
    }
    return localStorage.getItem("lux_user_id");
  }

  function fmt(n, currency) {
    const v = Number.isFinite(n) ? n : 0;
    return v.toFixed(2) + " " + (currency || "USDT");
  }

  const state = {
    userId: null,
    currency: "USDT",
    account: { available: 0, locked: 0 },
    plans: {
      P1: { days: 30, dailyRate: 0.02 },
      P2: { days: 30, dailyRate: 0.02 },
      P3: { days: 30, dailyRate: 0.02 }
    }
  };

  function readPlanLimits(planKey) {
    const input = document.getElementById("amount_" + planKey);
    const min = Number(input?.getAttribute("min") || 0);
    const max = Number(input?.getAttribute("max") || 0);
    return { min, max };
  }

  function setAccountUI() {
    const a = document.getElementById("availableView");
    const l = document.getElementById("lockedView");
    if (a) a.textContent = fmt(state.account.available, state.currency);
    if (l) l.textContent = fmt(state.account.locked, state.currency);
  }

  function calc(planKey, raw) {
    const p = state.plans[planKey];
    const amount = Number(raw || 0);
    const daily = amount * p.dailyRate;
    const total = daily * p.days;
    const maturity = amount + total;
    return { amount, daily, total, maturity };
  }

  function validate(planKey, amount) {
    const lim = readPlanLimits(planKey);
    return amount >= lim.min && amount <= lim.max;
  }

  function updateUI(planKey) {
    const input = document.getElementById("amount_" + planKey);
    const err = document.getElementById("error_" + planKey);
    const dailyEl = document.getElementById("daily_" + planKey);
    const totalEl = document.getElementById("total_" + planKey);
    const maturityEl = document.getElementById("maturity_" + planKey);

    if (!input) return;

    const { amount, daily, total, maturity } = calc(planKey, input.value);
    if (dailyEl) dailyEl.textContent = fmt(daily, state.currency);
    if (totalEl) totalEl.textContent = fmt(total, state.currency);
    if (maturityEl) maturityEl.textContent = fmt(maturity, state.currency);

    if (!input.value) {
      if (err) err.style.display = "none";
      return;
    }
    if (err) err.style.display = validate(planKey, amount) ? "none" : "block";
  }

  async function loadAccount() {
    if (!window.supabase) throw new Error("Supabase client not found");
    const { data, error } = await window.supabase
      .from("wallet_accounts")
      .select("balance,locked,currency")
      .eq("user_id", state.userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      state.account.available = 0;
      state.account.locked = 0;
      state.currency = "USDT";
    } else {
      state.account.available = Number(data.balance || 0);
      state.account.locked = Number(data.locked || 0);
      state.currency = data.currency || "USDT";
    }
    setAccountUI();
  }

  async function startPlanInternal(planKey) {
    const input = document.getElementById("amount_" + planKey);
    const amount = Number(input?.value || 0);

    if (!validate(planKey, amount)) {
      alert("Invalid amount. Please check the plan limits.");
      return false;
    }
    if (amount > state.account.available) {
      alert("Insufficient available balance.");
      return false;
    }

    const { data, error } = await window.supabase.rpc("app_start_investment", {
      p_user: state.userId,
      p_package_code: planKey,
      p_amount: amount
    });

    if (error) {
      alert(error.message || "Failed to start plan");
      return false;
    }

    if (input) input.value = "";
    updateUI(planKey);
    await loadAccount();

    alert("Plan started successfully.");
    return false;
  }

  window.startPlan = function (planKey) {
    startPlanInternal(planKey).catch((e) => {
      console.error(e);
      alert(e.message || "Unexpected error");
    });
    return false;
  };

  function init() {
    state.userId = getUserId();
    if (!state.userId) {
      alert("Please login first.");
      window.location.href = "login.html";
      return;
    }

    setAccountUI();

    ["P1", "P2", "P3"].forEach((k) => {
      const input = document.getElementById("amount_" + k);
      if (input) input.addEventListener("input", () => updateUI(k));
      updateUI(k);
    });

    loadAccount().catch((e) => {
      console.error(e);
      alert(e.message || "Failed to load account");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
