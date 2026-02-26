(() => {
  const qs = (s, el=document) => el.querySelector(s);

  const toastEl = qs('#luxToast');
  const toastText = qs('#toastText');
  let toastTimer = null;

  function toast(msg){
    toastText.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1400);
  }

  async function safeCopy(text){
    try{
      await navigator.clipboard.writeText(String(text));
      return true;
    }catch{
      try{
        const ta = document.createElement('textarea');
        ta.value = String(text);
        ta.setAttribute('readonly','');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return !!ok;
      }catch{
        return false;
      }
    }
  }

  const addrEl = qs('#walletAddressText');
  const canvas = qs('#qrCanvas');
  const qrImg = qs('#qrImg');
  const copyBtn = qs('#copyAddressBtn');
  const refreshBtn = qs('#walletRefreshBtn');

  function setLoading(isLoading){
    if(!refreshBtn) return;
    refreshBtn.classList.toggle('is-loading', !!isLoading);
    refreshBtn.disabled = !!isLoading;
  }

  function flashAddress(){
    const pill = qs('.lux-address-pill');
    if(!pill) return;
    pill.classList.add('is-flash');
    setTimeout(() => pill.classList.remove('is-flash'), 450);
  }

  function renderQR(){
    const address = String(addrEl?.textContent || '').trim();
    if(!address) return;

    // Prefer client-side QR rendering (no network). If unavailable, fallback to a hosted QR image.
    const canCanvas = !!(window.QRCode && window.QRCode.toCanvas && canvas);

    if(canCanvas){
      if(qrImg) qrImg.style.display = 'none';
      if(canvas) canvas.style.display = 'block';
      window.QRCode.toCanvas(canvas, address, { width: 220, margin: 1 }, (err) => {
        if(err){
          console.error(err);
          // Fallback if canvas rendering fails
          if(qrImg){
            canvas.style.display = 'none';
            qrImg.style.display = 'block';
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(address)}`;
          }
        }
      });
      return;
    }

    if(qrImg){
      if(canvas) canvas.style.display = 'none';
      qrImg.style.display = 'block';
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(address)}`;
    }
  }

  function setAddress(newAddress){
    if(!addrEl) return;
    addrEl.textContent = String(newAddress || '').trim();
    renderQR();
  }

  async function fetchAddressFromFutureAPI(){
    // Future-ready: if you later add an endpoint, this will start working without changing UI.
    // Expected response shape: { "address": "0x..." }
    const url = `./api/deposit-address.json?currency=USDT&network=BEP20&_=${Date.now()}`;
    const res = await fetch(url, { cache: 'no-store' });
    if(!res.ok) return null;
    const data = await res.json();
    return data?.address ? String(data.address) : null;
  }

  if(copyBtn){
    copyBtn.addEventListener('click', async () => {
      const address = String(addrEl.textContent || '').trim();
      if(!address) return toast('No address');
      const ok = await safeCopy(address);
      toast(ok ? 'Address copied' : 'Copy failed');
    });
  }

  if(refreshBtn){
    refreshBtn.addEventListener('click', async () => {
      setLoading(true);
      try{
        let address = null;
        try{
          address = await fetchAddressFromFutureAPI();
        }catch{ /* ignore */ }

        if(address){
          setAddress(address);
          flashAddress();
          toast('Address updated');
        }else{
          // Visible feedback even before the API exists.
          renderQR();
          flashAddress();
          toast('Refreshed');
        }
      }finally{
        setTimeout(() => setLoading(false), 450);
      }
    });
  }

  // Also allow tapping the QR to copy
  const qrTapTargets = [canvas, qrImg].filter(Boolean);
  qrTapTargets.forEach((el) => {
    el.addEventListener('click', async () => {
      const address = String(addrEl?.textContent || '').trim();
      if(!address) return;
      const ok = await safeCopy(address);
      toast(ok ? 'Copied' : 'Copy failed');
    });
  });

  window.addEventListener('load', renderQR);
})();
