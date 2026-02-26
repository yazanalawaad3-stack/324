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
      const res = await sb.from("v_user_activity").select("level,status").eq("user_id", uid).single();
      if (res.error) throw res.error;

      const level = String((res.data && res.data.level) || "v0");
      const status = String((res.data && res.data.status) || "active");

      localStorage.setItem("lux_level", level);
      localStorage.setItem("lux_status", status);

      setActiveTab(level.toUpperCase());

      if (status === "frozen") {
        sess.toast("Account frozen");
      }
    } catch (err) {
      sess.toast((err && err.message) || "Load error");
    }
  }

  window.addEventListener("load", load);
})();
