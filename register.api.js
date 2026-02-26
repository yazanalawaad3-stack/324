(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const form = document.querySelector("form");
  const phoneEl = document.getElementById("phone");
  const passEl = document.getElementById("password");
  const confirmEl = document.getElementById("confirm");
  const inviteEl = document.getElementById("invite");
  const captchaEl = document.getElementById("captcha");
  const captchaImg = document.getElementById("captchaImage");
  const submitBtn = document.getElementById("submitBtn");

  function getPhone() {
    const iti = window._itiRegister;
    if (iti && typeof iti.getNumber === "function") return iti.getNumber();
    return String((phoneEl && phoneEl.value) || "").trim();
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (submitBtn) submitBtn.disabled = true;

    const phone = getPhone();
    const password = String((passEl && passEl.value) || "");
    const confirm = String((confirmEl && confirmEl.value) || "");
    const invite = String((inviteEl && inviteEl.value) || "").trim().toUpperCase();
    const captcha = String((captchaEl && captchaEl.value) || "").trim();
    const captchaExpected = String((captchaImg && captchaImg.textContent) || "").trim();

    if (!phone) return sess.toast("Phone required");
    if (!password || password.length < 4) return sess.toast("Password too short");
    if (password !== confirm) return sess.toast("Passwords do not match");
    if (!captcha || captcha !== captchaExpected) return sess.toast("Invalid code");

    try {
      const res = await sb.rpc("app_register_user", {
        p_phone: phone,
        p_password: password,
        p_invite_code: invite || null,
      });

      if (res.error) throw res.error;
      if (!res.data) throw new Error("Register failed");

      sess.setUserId(res.data);
      window.location.href = "./myassets.html";
    } catch (err) {
      const msg = err && err.message ? String(err.message) : "Register error";
      sess.toast(msg);
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  if (form) form.addEventListener("submit", onSubmit);
})();
