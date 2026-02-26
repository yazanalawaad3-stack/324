(() => {
  const qs = (s, el = document) => el.querySelector(s);

  const toastEl = qs('#luxToast');
  const toastText = qs('#toastText');
  let toastTimer = null;

  function toast(msg) {
    if (!toastEl || !toastText) return;
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  async function safeCopy(text) {
    const value = String(text ?? '');
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      } catch {
        return false;
      }
    }
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('app_user') || 'null');
    } catch {
      return null;
    }
  }

  function buildInvite() {
    const user = getUser();
    const code = String(user?.referral_code || '').trim();

    const origin = window.location.origin || '';
    const base = origin || 'https://example.com';
    const url = new URL('register.html', base.endsWith('/') ? base : `${base}/`);
    if (code) url.searchParams.set('code', code);

    const link = url.toString();

    const linkEl = qs('#inviteLinkText');
    const codeEl = qs('#inviteCodeText');
    if (linkEl) linkEl.textContent = link;
    if (codeEl) codeEl.textContent = code || '—';

    return { link, code };
  }

  function wire() {
    const invite = buildInvite();

    qs('#copyInviteLinkBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await safeCopy(invite.link);
      toast(ok ? 'Link copied' : 'Copy failed');
    });

    qs('#copyInviteCodeBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await safeCopy(invite.code);
      toast(ok ? 'Code copied' : 'Copy failed');
    });

    qs('#shareBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const payload = {
        title: 'Invitation',
        text: invite.code ? `Invite code: ${invite.code}` : 'Invitation',
        url: invite.link,
      };

      try {
        if (navigator.share) {
          await navigator.share(payload);
          toast('Shared');
          return;
        }
      } catch {}

      const ok = await safeCopy(`${invite.link}\n${invite.code}`);
      toast(ok ? 'Copied' : 'Share not supported');
    });
  }

  wire();
})();
