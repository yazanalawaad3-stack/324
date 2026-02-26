(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const uid = sess.requireAuth("./login.html");
  if (!uid) return;

  const amountEl = document.getElementById("amount");
  const btn = document.getElementById("transferBtn");

  async function loadBalance() {
    try {
      const res = await sb.from("wallet_accounts").select("balance").eq("user_id", uid).single();
      if (res.error) throw res.error;
      const bal = Number((res.data && res.data.balance) || 0);

      if (window.state && window.state.balances) {
        window.state.balances.USDT = bal;
      }

      if (typeof window.updateHeader === "function") window.updateHeader();
      if (typeof window.validate === "function") window.validate();
    } catch (err) {
      sess.toast((err && err.message) || "Load error");
    }
  }

  async function onTransfer() {
    try {
      const amt = typeof window.parseAmount === "function" ? window.parseAmount() : Number((amountEl && amountEl.value) || 0);
      if (!amt || amt <= 0) return sess.toast("Enter a valid amount");

      const res = await sb.rpc("app_withdraw_request", { p_user: uid, p_amount: amt });
      if (res.error) throw res.error;

      sess.toast("Request created");
      if (amountEl) amountEl.value = "";
      await loadBalance();
    } catch (err) {
      sess.toast((err && err.message) || "Withdraw error");
    }
  }

  if (btn) btn.addEventListener("click", onTransfer);
  window.addEventListener("load", loadBalance);
})();
