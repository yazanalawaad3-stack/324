(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const uid = sess.requireAuth("./login.html");
  if (!uid) return;

  async function load() {
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

      const fmt = (n) =>
        Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const balEl = document.getElementById("demoBalance");
      if (balEl) balEl.textContent = fmt(data.balance);

      const todayEl = document.getElementById("todayIncome");
      if (todayEl) todayEl.textContent = "$" + fmt(data.todays_activity);

      const totalEl = document.getElementById("totalIncome");
      if (totalEl) totalEl.textContent = "$" + fmt(data.total_activity);

      const teamTodayEl = document.getElementById("teamIncome");
      if (teamTodayEl) teamTodayEl.textContent = "$" + fmt(data.network_activity_today);

      const teamTotalEl = document.getElementById("teamTotalIncome");
      if (teamTotalEl) teamTotalEl.textContent = "$" + fmt(data.total_network_activity);

      const idEl = document.getElementById("userIdValue");
      if (idEl) idEl.textContent = String(data.public_id8 || "").trim() || idEl.textContent;

      localStorage.setItem("lux_public_id8", String(data.public_id8 || ""));
      localStorage.setItem("lux_network_id7", String(data.network_id7 || ""));
      localStorage.setItem("lux_level", String(data.level || ""));
      localStorage.setItem("lux_status", String(data.status || ""));
    } catch (err) {
      sess.toast((err && err.message) || "Load error");
    }
  }

  window.addEventListener("load", load);
})();
