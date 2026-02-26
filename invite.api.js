(function () {
  const sb = window.LUX && window.LUX.sb;
  const sess = window.LUX && window.LUX.session;
  if (!sb || !sess) return;

  const uid = sess.requireAuth("./login.html");
  if (!uid) return;

  const linkEl = document.getElementById("inviteLinkText");
  const codeEl = document.getElementById("inviteCodeText");

  async function safeCopy(text) {
    const value = String(text || "");
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return !!ok;
      } catch {
        return false;
      }
    }
  }

  function buildInvite(code) {
    const origin = window.location.origin || "";
    const base = origin || "https://example.com";
    const url = new URL("register.html", base.endsWith("/") ? base : base + "/");
    url.searchParams.set("code", code);

    const link = url.toString();
    if (linkEl) linkEl.textContent = link;
    if (codeEl) codeEl.textContent = code;
    return { link, code };
  }

  async function load() {
    try {
      const res = await sb.from("users").select("invite_code").eq("id", uid).single();
      if (res.error) throw res.error;

      const code = String((res.data && res.data.invite_code) || "").trim();
      if (!code) throw new Error("No invite code");

      const invite = buildInvite(code);

      const copyLinkBtn = document.getElementById("copyInviteLinkBtn");
      if (copyLinkBtn)
        copyLinkBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          const ok = await safeCopy(invite.link);
          sess.toast(ok ? "Link copied" : "Copy failed");
        });

      const copyCodeBtn = document.getElementById("copyInviteCodeBtn");
      if (copyCodeBtn)
        copyCodeBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          const ok = await safeCopy(invite.code);
          sess.toast(ok ? "Code copied" : "Copy failed");
        });

      const shareBtn = document.getElementById("shareBtn");
      if (shareBtn)
        shareBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          const payload = { title: "Invitation", text: "Invite code: " + invite.code, url: invite.link };
          try {
            if (navigator.share) {
              await navigator.share(payload);
              sess.toast("Shared");
              return;
            }
          } catch {}

          const ok = await safeCopy(invite.link + "\n" + invite.code);
          sess.toast(ok ? "Copied" : "Share not supported");
        });
    } catch (err) {
      sess.toast((err && err.message) || "Load error");
    }
  }

  load();
})();
