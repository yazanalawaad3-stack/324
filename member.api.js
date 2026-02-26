(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const uid = sess.requireAuth("./login.html");
  if (!uid) return;

  function setActiveTab(level) {
    const tabs = Array.from(document.querySelectorAll(".tab[data-level]"));
    tabs.forEach((t) => {
      const lv = String(t.getAttribute("data-level") || "").toLowerCase();
      const isActive = lv === String(level || "").toLowerCase();
      t.setAttribute("aria-selected", isActive ? "true" : "false");
      t.classList.toggle("active", isActive);
    });
  }

  async function load() {
    try {
      const res = await sb
        .from("v_user_activity")
        .select("level,status,balance")
        .eq("user_id", uid)
        .single();
      if (res.error) throw res.error;

      const level = String((res.data && res.data.level) || "v0");
      const status = String((res.data && res.data.status) || "active");
      const balance = Number((res.data && res.data.balance) || 0);

      // Active direct referrals (effective users)
      let effUsers = 0;
      try {
        const r2 = await sb.rpc("count_active_direct_referrals", { p_user: uid });
        if (!r2.error && r2.data != null) effUsers = Number(r2.data) || 0;
      } catch (_) {}

      localStorage.setItem("lux_level", level);
      localStorage.setItem("lux_status", status);

      setActiveTab(level.toUpperCase());

      // Update member page profile stats and re-render
      if (window.data && window.data.profile) {
        window.data.profile.balance = Math.floor(balance * 100000000) / 100000000;
        window.data.profile.users = effUsers;
      }

      // Re-render selected level (defined in member.html)
      if (typeof window.selectLevel === "function") {
        const current = (level || "v0").toUpperCase();
        // Member page levels start from V1 in UI; keep at least V1
        const uiLevel = current === "V0" ? "V1" : current;
        window.selectLevel(uiLevel);
      }

      if (status === "frozen") {
        sess.toast("Account frozen");
      }
    } catch (err) {
      sess.toast((err && err.message) || "Load error");
    }
  }

  window.addEventListener("load", load);
})();
