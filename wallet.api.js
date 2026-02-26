(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const uid = sess.requireAuth("./login.html");
  if (!uid) return;

  const addrEl = document.getElementById("walletAddressText");
  const refreshBtn = document.getElementById("walletRefreshBtn");

  async function load() {
    try {
      const res = await sb.from("user_deposit_addresses").select("address").eq("user_id", uid).single();

      if (res.error && res.error.code !== "PGRST116") throw res.error;

      const address = String((res.data && res.data.address) || "").trim();
      if (address && addrEl) addrEl.textContent = address;

      setTimeout(() => {
        if (refreshBtn) refreshBtn.click();
      }, 80);
    } catch (err) {
      sess.toast((err && err.message) || "Load error");
    }
  }

  window.addEventListener("load", load);
})();
