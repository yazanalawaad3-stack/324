import { supabase } from './supabaseClient.js';

const qs = (s, el = document) => el.querySelector(s);

function setupPasswordToggles() {
  document.querySelectorAll('.toggle-password').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const targetId = toggle.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';

      toggle.innerHTML = isHidden
        ? '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12c-3.33 0-6.21-2.05-7.54-5 1.33-2.95 4.21-5 7.54-5 3.33 0 6.21 2.05 7.54 5-1.33 2.95-4.21 5-7.54 5z"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2"/></svg>'
        : '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5zm0 12c-3.33 0-6.21-2.05-7.54-5 1.33-2.95 4.21-5 7.54-5 3.33 0 6.21 2.05 7.54 5-1.33 2.95-4.21 5-7.54 5z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });
}

function generateCaptcha() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const el = qs('#captchaImage');
  if (el) el.textContent = String(digits);
}

function initPhoneInput() {
  const phoneField = qs('#phone');
  if (!phoneField) return;

  if (window.intlTelInput) {
    const iti = window.intlTelInput(phoneField, {
      initialCountry: 'auto',
      separateDialCode: true,
      utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js',
      geoIpLookup: (callback) => {
        fetch('https://ipapi.co/json/')
          .then((r) => r.json())
          .then((d) => callback((d?.country_code || 'lb').toLowerCase()))
          .catch(() => callback('lb'));
      },
    });
    phoneField._iti = iti;
  } else {
    setTimeout(initPhoneInput, 100);
  }
}

function getE164Phone() {
  const phoneField = qs('#phone');
  if (!phoneField) return '';

  const iti = phoneField._iti;
  if (iti && typeof iti.getNumber === 'function') {
    return iti.getNumber();
  }
  return String(phoneField.value || '').trim();
}

function setStatus(msg, isError = false) {
  let box = qs('#statusBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'statusBox';
    box.style.marginTop = '12px';
    box.style.fontSize = '0.9rem';
    box.style.opacity = '0.92';
    box.style.textAlign = 'center';
    box.style.color = isError ? 'var(--bad)' : 'var(--good)';
    qs('.card')?.appendChild(box);
  }
  box.style.color = isError ? 'var(--bad)' : 'var(--good)';
  box.textContent = msg;
}

async function registerUser({ phone, password, inviteCodeUsed }) {
  const { data, error } = await supabase.rpc('register_user', {
    p_phone: phone,
    p_password: password,
    p_invite_code: inviteCodeUsed || null,
  });
  if (error) throw error;
  return data;
}

function wireAgreement() {
  const agreeBox = qs('#agree');
  const submitBtn = qs('#submitBtn');
  if (!agreeBox || !submitBtn) return;

  const toggle = () => {
    submitBtn.disabled = !agreeBox.checked;
  };

  agreeBox.addEventListener('change', toggle);
  toggle();
}

function fillInviteFromQuery() {
  const inviteInput = qs('#invite');
  if (!inviteInput) return;

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  if (code && !inviteInput.value) inviteInput.value = code;
}

function wireForm() {
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('', false);

    const captchaInput = String(qs('#captcha')?.value || '').trim();
    const captchaShown = String(qs('#captchaImage')?.textContent || '').trim();
    if (!captchaInput || captchaInput !== captchaShown) {
      generateCaptcha();
      setStatus('Captcha is incorrect', true);
      return;
    }

    const password = String(qs('#password')?.value || '');
    const confirm = String(qs('#confirm')?.value || '');
    if (password.length < 6) {
      setStatus('Password must be at least 6 characters', true);
      return;
    }
    if (password !== confirm) {
      setStatus('Passwords do not match', true);
      return;
    }

    const phone = getE164Phone();
    if (!phone) {
      setStatus('Phone is required', true);
      return;
    }

    const inviteCodeUsed = String(qs('#invite')?.value || '').trim();

    const btn = qs('#submitBtn');
    if (btn) btn.disabled = true;

    try {
      const row = await registerUser({ phone, password, inviteCodeUsed });

      localStorage.setItem('app_user_id', row.id);
      localStorage.setItem('app_user_no', String(row.user_no));
      localStorage.setItem('app_phone', row.phone);
      localStorage.setItem('app_referral_code', row.referral_code);

      setStatus('Registered successfully');
      setTimeout(() => {
        window.location.href = './invite.html';
      }, 400);
    } catch (err) {
      const msg = err?.message || 'Registration failed';
      setStatus(msg, true);
      if (btn) btn.disabled = false;
    }
  });
}

window.addEventListener('load', () => {
  setupPasswordToggles();
  initPhoneInput();
  generateCaptcha();
  qs('#captchaImage')?.addEventListener('click', generateCaptcha);
  wireAgreement();
  fillInviteFromQuery();
  wireForm();
});
