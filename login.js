import { supabase } from './supabaseClient.js';

const qs = (s, el = document) => el.querySelector(s);

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
  if (iti && typeof iti.getNumber === 'function') return iti.getNumber();
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
    box.style.color = isError ? '#ff5d7b' : '#2ee59d';
    qs('.card')?.appendChild(box);
  }
  box.style.color = isError ? '#ff5d7b' : '#2ee59d';
  box.textContent = msg;
}

async function loginUser({ phone, password }) {
  const { data, error } = await supabase.rpc('login_user', {
    p_phone: phone,
    p_password: password,
  });
  if (error) throw error;
  return data;
}

function wireForm() {
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('', false);

    const phone = getE164Phone();
    const password = String(qs('#password')?.value || '');

    if (!phone || !password) {
      setStatus('Phone and password are required', true);
      return;
    }

    const btn = qs('#loginBtn');
    if (btn) btn.disabled = true;

    try {
      const row = await loginUser({ phone, password });

      localStorage.setItem('app_user_id', row.id);
      localStorage.setItem('app_user_no', String(row.user_no));
      localStorage.setItem('app_phone', row.phone);
      localStorage.setItem('app_referral_code', row.referral_code);

      setStatus('Logged in');
      setTimeout(() => {
        window.location.href = './invite.html';
      }, 300);
    } catch (err) {
      setStatus(err?.message || 'Login failed', true);
      if (btn) btn.disabled = false;
    }
  });
}

window.addEventListener('load', () => {
  initPhoneInput();
  wireForm();
});
