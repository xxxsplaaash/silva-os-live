(function(){
  'use strict';
  function boot(){
    const toastEl = document.getElementById('toast');
    if(!toastEl) return;
    let textNode = document.getElementById('toast-text');
    if(!textNode){ textNode = document.createElement('span'); textNode.id='toast-text'; toastEl.appendChild(textNode); }
    let progressBar = document.getElementById('toast-progress');
    if(!progressBar){ progressBar = document.createElement('div'); progressBar.id='toast-progress'; toastEl.appendChild(progressBar); }
    let hideTimer = null, cleanupTimer = null;
    const TOAST_MS = 2400, EXIT_MS = 380;
    function resetToast(){
      if(hideTimer) clearTimeout(hideTimer);
      if(cleanupTimer) clearTimeout(cleanupTimer);
      toastEl.classList.remove('show','hide');
      void toastEl.offsetWidth;
    }
    function resetProgress(duration){
      toastEl.style.setProperty('--toast-duration', `${duration}ms`);
      progressBar.style.animationName = 'none';
      void progressBar.offsetWidth;
      progressBar.style.animationName = '';
    }
    function scheduleExit(duration){
      hideTimer = setTimeout(()=>{
        toastEl.classList.remove('show');
        toastEl.classList.add('hide');
        cleanupTimer = setTimeout(()=> toastEl.classList.remove('hide'), EXIT_MS + 40);
      }, duration);
    }
    window.toast = function(msg, charVoice){
      const voiceToasts = { saved:'★ Saved. Good.', copied:'⎘ Copied. Use it well.', tested:'✓ Logged. Test more.' };
      const displayText = (charVoice && voiceToasts[charVoice]) ? voiceToasts[charVoice] : msg;
      resetToast();
      textNode.textContent = displayText;
      resetProgress(TOAST_MS);
      window.requestAnimationFrame(()=> toastEl.classList.add('show'));
      scheduleExit(TOAST_MS);
    };
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && toastEl.classList.contains('show')){
        if(hideTimer) clearTimeout(hideTimer);
        toastEl.classList.remove('show');
        toastEl.classList.add('hide');
        cleanupTimer = setTimeout(()=> toastEl.classList.remove('hide'), EXIT_MS + 40);
      }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
