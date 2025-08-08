// ==UserScript==
// @name         CommentHQ Bridge
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Send YouTube comment drafts to CommentHQ engine
// @match        https://www.youtube.com/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// ==/UserScript==

(function(){
  'use strict';
  const API = 'http://127.0.0.1:43117/api/inbox';

  function send(text) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: API,
      headers: { 'Content-Type':'application/json' },
      data: JSON.stringify({ text, url: location.href }),
      onload: () => console.log('[CHQ] sent'),
      onerror: () => console.warn('[CHQ] failed')
    });
  }

  function button() {
    const b = document.createElement('button');
    b.textContent = 'CHQ';
    b.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:999999;padding:8px;border-radius:8px;background:#222;color:#fff;border:1px solid #555;cursor:pointer';
    b.onclick = () => {
      const ta = document.querySelector('ytd-app textarea#textarea');
      const text = ta ? ta.value : '';
      if (text.trim()) send(text.trim());
      window.open('http://127.0.0.1:43117/','_blank');
    };
    document.body.appendChild(b);
  }

  const ready = setInterval(()=>{
    if (document.body) { clearInterval(ready); button(); }
  }, 1000);
})();
