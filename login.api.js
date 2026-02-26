(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const form = document.querySelector("form");
  const phoneEl = document.getElementById("phone");
  const passEl = document.getElementById("password");

  function getPhone() {
    const iti = window._itiLogin;
    if (iti && typeof iti.getNumber === "function") return iti.getNumber();
    return String((phoneEl && phoneEl.value) || "").trim();
  }

  async function onSubmit(e) {
    e.preventDefault();
    const phone = getPhone();
    const password = String((passEl && passEl.value) || "");

    if (!phone) return sess.toast("Phone required");
    if (!password) return sess.toast("Password required");

    try {
      const res = await sb.rpc("app_login_user", { p_phone: phone, p_password: password });
      if (res.error) throw res.error;
      if (!res.data) return sess.toast("Invalid credentials");

      sess.setUserId(res.data);
      window.location.href = "./myassets.html";
    } catch (err) {
      sess.toast((err && err.message) || "Login error");
    }
  }

  if (form) form.addEventListener("submit", onSubmit);
})();
