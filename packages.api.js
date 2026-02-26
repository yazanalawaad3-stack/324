(function () {
  "use strict";

  function fmt(n) {
    const v = Number(n || 0);
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT";
  }

  function getSb() {
    // Prefer the project-wide client created in supabase-client.js
    if (window.LUX && window.LUX.sb) return window.LUX.sb;

    // Fallback: if supabase UMD is present and config exists, create it here
    if (window.supabase && window.LUX_SUPABASE_URL && window.LUX_SUPABASE_ANON_KEY) {
      window.LUX = window.LUX || {};
      window.LUX.sb = window.supabase.createClient(window.LUX_SUPABASE_URL, window.LUX_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      return window.LUX.sb;
    }
    return null;
  }

  async function loadPackages(sb) {
    const { data, error } = await sb
      .from("investment_packages")
      .select("code,min_amount,max_amount,duration_days,daily_rate,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;

    const map = {};
    (data || []).forEach((p) => {
      map[String(p.code).toUpperCase()] = p;
    });
    return map;
  }

  async function loadWallet(sb, userId) {
    const { data, error } = await sb
      .from("wallet_accounts")
      .select("balance,locked")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return {
      available: Number(data?.balance || 0),
      locked: Number(data?.locked || 0),
    };
  }

  function setAccountUI(account) {
    const av = document.getElementById("availableView");
    const lk = document.getElementById("lockedView");
    if (av) av.textContent = fmt(account.available);
    if (lk) lk.textContent = fmt(account.locked);
  }

  function validateAmount(pkg, amount) {
    if (!pkg) return false;
    const a = Number(amount || 0);
    if (!Number.isFinite(a) || a <= 0) return false;
    return a >= Number(pkg.min_amount) && a <= Number(pkg.max_amount);
  }

  function updateEstimates(pkg, planKey) {
    const input = document.getElementById("amount_" + planKey);
    const err = document.getElementById("error_" + planKey);
    const dailyEl = document.getElementById("daily_" + planKey);
    const totalEl = document.getElementById("total_" + planKey);
    const maturityEl = document.getElementById("maturity_" + planKey);

    const amount = Number(input?.value || 0);

    // Unified 2% rate (backend also uses 2% default)
    const rate = Number(pkg?.daily_rate ?? 0.02);
    const days = Number(pkg?.duration_days ?? 30);

    const daily = amount > 0 ? amount * rate : 0;
    const total = daily * days;
    const maturity = amount + total;

    if (dailyEl) dailyEl.textContent = fmt(daily);
    if (totalEl) totalEl.textContent = fmt(total);
    if (maturityEl) maturityEl.textContent = fmt(maturity);

    if (!input?.value) {
      if (err) err.style.display = "none";
      return;
    }
    if (err) err.style.display = validateAmount(pkg, amount) ? "none" : "block";
  }

  async function startPlan(sb, userId, packages, account, planKey) {
    const pkg = packages[planKey];
    const input = document.getElementById("amount_" + planKey);
    const amount = Number(input?.value || 0);

    if (!validateAmount(pkg, amount)) {
      window.LUX?.session?.toast?.("Invalid amount for this plan.");
      return;
    }
    if (amount > account.available) {
      window.LUX?.session?.toast?.("Insufficient available balance.");
      return;
    }

    const { data, error } = await sb.rpc("app_start_investment", {
      p_user: userId,
      p_package_code: planKey,
      p_amount: amount,
    });

    if (error) {
      window.LUX?.session?.toast?.(error.message || "Failed to start plan.");
      return;
    }

    // Refresh wallet after lock
    const w = await loadWallet(sb, userId);
    account.available = w.available;
    account.locked = w.locked;
    setAccountUI(account);

    if (input) input.value = "";
    updateEstimates(pkg, planKey);

    window.LUX?.session?.toast?.("Plan started successfully.");
    return data;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const sb = getSb();
    if (!sb) {
      alert("Supabase client not found");
      return;
    }

    const userId = window.LUX?.session?.requireAuth?.("./login.html") || "";
    if (!userId) return;

    try {
      const packages = await loadPackages(sb);
      const account = await loadWallet(sb, userId);
      setAccountUI(account);

      ["P1", "P2", "P3"].forEach((k) => {
        const input = document.getElementById("amount_" + k);
        if (input) input.addEventListener("input", () => updateEstimates(packages[k], k));
        updateEstimates(packages[k], k);

        const btn = document.getElementById("start_" + k);
        if (btn) {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            startPlan(sb, userId, packages, account, k);
          });
        }
      });
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to load packages.");
    }
  });
})();