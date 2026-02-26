(function () {
  window.LUX = window.LUX || {};

  const KEY = "lux_user_id";

  function getUserId() {
    const v = localStorage.getItem(KEY);
    return v ? String(v).trim() : "";
  }

  function setUserId(id) {
    if (!id) return;
    localStorage.setItem(KEY, String(id));
  }

  function clearUserId() {
    localStorage.removeItem(KEY);
  }

  function requireAuth(redirectTo) {
    const uid = getUserId();
    if (!uid) {
      window.location.href = redirectTo || "./login.html";
      return "";
    }
    return uid;
  }

  function toast(msg) {
    const t = String(msg || "");
    const el = document.querySelector("#luxToast");
    const text = document.querySelector("#toastText");
    if (el && text) {
      text.textContent = t;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 1600);
      return;
    }
    const el2 = document.querySelector("#toast");
    if (el2) {
      el2.textContent = t;
      el2.classList.add("show");
      setTimeout(() => el2.classList.remove("show"), 1600);
      return;
    }
    alert(t);
  }

  window.LUX.session = { getUserId, setUserId, clearUserId, requireAuth, toast };
})();
