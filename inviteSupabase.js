import { supabase } from './supabaseClient.js';

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

function getStoredUserId() {
  return String(localStorage.getItem('app_user_id') || '').trim();
}

async function fetchReferralCode() {
  const cached = String(localStorage.getItem('app_referral_code') || '').trim();
  if (cached) return cached;

  const userId = getStoredUserId();
  if (!userId) return '';

  const { data, error } = await supabase.rpc('get_referral_code', { p_user_id: userId });
  if (error) throw error;
  if (!data) return '';

  localStorage.setItem('app_referral_code', data);
  return data;
}

function buildInvite(code) {
  const origin = window.location.origin || '';
  const base = origin || 'https://example.com';
  const url = new URL('register.html', base.endsWith('/') ? base : `${base}/`);
  url.searchParams.set('code', code);
  const link = url.toString();

  const linkEl = qs('#inviteLinkText');
  const codeEl = qs('#inviteCodeText');
  if (linkEl) linkEl.textContent = link;
  if (codeEl) codeEl.textContent = code;

  return { link, code };
}

async function wire() {
  try {
    const code = await fetchReferralCode();
    if (!code) {
      toast('No user session');
      return;
    }

    const invite = buildInvite(code);

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
        text: `Invite code: ${invite.code}`,
        url: invite.link,
      };

      try {
        if (navigator.share) {
          await navigator.share(payload);
          toast('Shared');
          return;
        }
      } catch {
        // ignore
      }

      const ok = await safeCopy(`${invite.link}\n${invite.code}`);
      toast(ok ? 'Copied' : 'Share not supported');
    });
  } catch (err) {
    toast(err?.message || 'Error');
  }
}

wire();
