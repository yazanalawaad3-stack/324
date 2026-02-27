(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function safeToast(msg) {
    try {
      const sess = window.LUX && window.LUX.session;
      if (sess && typeof sess.toast === "function") return sess.toast(msg);
    } catch (e) {}
    try {
      const el = $("toastText");
      const box = $("luxToast");
      if (el && box) {
        el.textContent = String(msg || "");
        box.classList.add("show");
        clearTimeout(safeToast._t);
        safeToast._t = setTimeout(() => box.classList.remove("show"), 2200);
      }
    } catch (e) {}
  }

  function toggleMenu(forceOpen) {
    const menu = $("settingsMenu");
    if (!menu) return;
    const isHidden = menu.getAttribute("aria-hidden") !== "false";
    const open = typeof forceOpen === "boolean" ? forceOpen : isHidden;
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    menu.style.display = open ? "block" : "none";
  }

  function wireUi(loadFn) {
    const refreshBtn = $("refreshBtn");
    if (refreshBtn && !refreshBtn.dataset.wired) {
      refreshBtn.dataset.wired = "1";
      refreshBtn.addEventListener("click", () => {
        if (typeof loadFn === "function") loadFn();
      });
    }

    const settingsBtn = $("settingsBtn");
    if (settingsBtn && !settingsBtn.dataset.wired) {
      settingsBtn.dataset.wired = "1";
      settingsBtn.addEventListener("click", () => toggleMenu());
    }

    document.addEventListener("click", (e) => {
      const menu = $("settingsMenu");
      if (!menu) return;
      const btn = $("settingsBtn");
      if (!btn) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      toggleMenu(false);
    });

    const copyBtn = $("copyUserIdBtn");
    if (copyBtn && !copyBtn.dataset.wired) {
      copyBtn.dataset.wired = "1";
      copyBtn.addEventListener("click", async () => {
        const txt = ($("userIdValue") && $("userIdValue").textContent) || "";
        if (!txt) return safeToast("No ID");
        try {
          await navigator.clipboard.writeText(txt.trim());
          safeToast("Copied");
        } catch (e) {
          safeToast("Copy failed");
        }
      });
    }

    const walletBtn = $("walletBtn");
    if (walletBtn && !walletBtn.dataset.wired) {
      walletBtn.dataset.wired = "1";
      walletBtn.addEventListener("click", () => (window.location.href = "./wallet.html"));
    }

    const networkBtn = $("quickNetworkBtn");
    if (networkBtn && !networkBtn.dataset.wired) {
      networkBtn.dataset.wired = "1";
      networkBtn.addEventListener("click", () => (window.location.href = "./network.html"));
    }

    const analyticsBtn = $("analyticsBtn");
    if (analyticsBtn && !analyticsBtn.dataset.wired) {
      analyticsBtn.dataset.wired = "1";
      analyticsBtn.addEventListener("click", () => (window.location.href = "./analytics.html"));
    }

    const inviteBtn = $("inviteFriendsBtn");
    if (inviteBtn && !inviteBtn.dataset.wired) {
      inviteBtn.dataset.wired = "1";
      inviteBtn.addEventListener("click", async () => {
        const pid = localStorage.getItem("lux_public_id8") || ($("userIdValue") && $("userIdValue").textContent) || "";
        const url = `${location.origin}${location.pathname.replace(/[^/]+$/, "")}register.html?ref=${encodeURIComponent(pid.trim())}`;
        try {
          await navigator.clipboard.writeText(url);
          safeToast("Invite link copied");
        } catch (e) {
          safeToast(url);
        }
      });
    }

    const menu = $("settingsMenu");
    if (menu && !menu.dataset.wired) {
      menu.dataset.wired = "1";
      menu.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const act = btn.getAttribute("data-action");
          toggleMenu(false);
          if (act === "luckydraw") return;
          safeToast(act ? `Open: ${act}` : "Open");
        });
      });
      toggleMenu(false);
    }
  }

  function waitForLuxReady(timeoutMs) {
    const start = Date.now();
    return new Promise((resolve) => {
      const t = setInterval(() => {
        const sb = window.LUX && window.LUX.sb;
        const sess = window.LUX && window.LUX.session;
        if (sb && sess) {
          clearInterval(t);
          resolve({ sb, sess, ok: true });
          return;
        }
        if (Date.now() - start > timeoutMs) {
          clearInterval(t);
          resolve({ sb: null, sess: null, ok: false });
        }
      }, 50);
    });
  }

  function formatMoney(n) {
    return Number(n || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  async function createLoader(sb, sess, uid) {
    return async function load() {
      try {
        const res = await sb
          .from("v_user_activity")
          .select(
            "user_id,public_id8,network_id7,level,status,balance,todays_activity,total_activity,network_activity_today,total_network_activity"
          )
          .eq("user_id", uid)
          .single();

        if (res.error) throw res.error;
        const data = res.data;
        if (!data) return;

        const balEl = $("demoBalance");
        if (balEl) balEl.textContent = formatMoney(data.balance);

        const todayEl = $("todayIncome");
        if (todayEl) todayEl.textContent = "$" + formatMoney(data.todays_activity);

        const totalEl = $("totalIncome");
        if (totalEl) totalEl.textContent = "$" + formatMoney(data.total_activity);

        const teamTodayEl = $("teamIncome");
        if (teamTodayEl) teamTodayEl.textContent = "$" + formatMoney(data.network_activity_today);

        const teamTotalEl = $("teamTotalIncome");
        if (teamTotalEl) teamTotalEl.textContent = "$" + formatMoney(data.total_network_activity);

        const idEl = $("userIdValue");
        if (idEl) idEl.textContent = String(data.public_id8 || "").trim() || idEl.textContent;

        localStorage.setItem("lux_public_id8", String(data.public_id8 || ""));
        localStorage.setItem("lux_network_id7", String(data.network_id7 || ""));
        localStorage.setItem("lux_level", String(data.level || ""));
        localStorage.setItem("lux_status", String(data.status || ""));
      } catch (err) {
        safeToast((err && err.message) || "Load error");
      }
    };
  }

  async function init() {
    // Wire UI immediately so page never feels frozen.
    wireUi(() => safeToast("Loading..."));

    const ready = await waitForLuxReady(3500);
    if (!ready.ok) {
      safeToast("Session not ready");
      return;
    }

    const sb = ready.sb;
    const sess = ready.sess;

    let uid = null;
    try {
      uid = sess.requireAuth("./login.html");
    } catch (e) {
      safeToast("Auth error");
      return;
    }
    if (!uid) return;

    const load = await createLoader(sb, sess, uid);
    wireUi(load);

    if (document.readyState === "complete") load();
    else window.addEventListener("load", load, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();