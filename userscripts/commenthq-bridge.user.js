\
// ==UserScript==
// @name         CommentHQ Bridge
// @namespace    https://github.com/Falcordog/commenthq
// @version      0.3.0
// @description  Control bridge with inline config, debug toggle, movable panel, and Phase 1.D toggles (stubs disabled by default)
// @match        https://www.youtube.com/*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

/* eslint-env browser */
/* global GM_config */

// --- Minimal GM_config-compatible shim (ASCII-only) ---
(function(){
  if (typeof window.GM_config !== 'undefined') return;
  function el(tag, props={}, children=[]) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    (children||[]).forEach(c=>e.appendChild(typeof c==='string'?document.createTextNode(c):c));
    return e;
  }
  const storeKey = (id,k)=>id + '::' + k;
  const G = {
    _meta: { id: 'gm_cfg' },
    _fields: {},
    init(opts){
      this._meta.id = opts.id || 'gm_cfg';
      this._meta.title = opts.title || 'Settings';
      this._fields = opts.fields || {};
      // seed defaults
      for (var k in this._fields) if (Object.prototype.hasOwnProperty.call(this._fields,k)) {
        var f = this._fields[k];
        var sk = storeKey(this._meta.id, k);
        var has = null;
        try { has = GM_getValue(sk, null); } catch(e) {}
        if (has === null && Object.prototype.hasOwnProperty.call(f,'default')) {
          try { GM_setValue(sk, f.default); } catch(e) {}
        }
      }
    },
    get(k){
      var sk = storeKey(this._meta.id, k);
      try { return GM_getValue(sk, (this._fields[k]||{}).default); } catch(e) { return (this._fields[k]||{}).default; }
    },
    set(k, v){
      var sk = storeKey(this._meta.id, k);
      try { GM_setValue(sk, v); } catch(e) {}
    },
    open(){
      var id = this._meta.id;
      var wrap = el('div',{style:'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:99999;display:flex;align-items:center;justify-content:center;'});
      var card = el('div',{style:'min-width:360px;max-width:560px;background:#111;color:#eee;padding:16px;border-radius:12px;font:14px system-ui,Segoe UI,Arial,sans-serif;'});
      card.appendChild(el('div',{style:'font-size:18px;margin-bottom:8px;font-weight:600;'},[this._meta.title||'Settings']));
      var form = el('div',{});
      for (var k in this._fields) if (Object.prototype.hasOwnProperty.call(this._fields,k)) {
        var f = this._fields[k];
        var row = el('label',{style:'display:flex;align-items:center;gap:8px;margin:8px 0;'});
        var lab = el('div',{style:'min-width:160px;'},[f.label||k]);
        var input;
        var cur = this.get(k);
        if ((f.type||'checkbox') === 'checkbox') {
          input = el('input',{type:'checkbox',checked:!!cur});
          input.addEventListener('change',this.set.bind(this,k, true));
          input.addEventListener('change', (function(key){ return function(){ try { GM_setValue(storeKey(id,key), !!input.checked); } catch(e){} }; })(k));
          input.checked = !!cur;
        } else if (f.type==='select') {
          input = el('select',{});
          (f.options||[]).forEach(function(opt){
            var o = el('option',{value:String(opt)},[String(opt)]);
            if (String(cur)===String(opt)) o.selected = true;
            input.appendChild(o);
          });
          input.addEventListener('change',(function(key){ return function(){ try { GM_setValue(storeKey(id,key), input.value); } catch(e){} }; })(k));
        } else {
          input = el('input',{type:'text',value:String(cur==null?'':cur)});
          input.addEventListener('change',(function(key){ return function(){ try { GM_setValue(storeKey(id,key), input.value); } catch(e){} }; })(k));
        }
        row.appendChild(lab); row.appendChild(input);
        form.appendChild(row);
      }
      var actions = el('div',{style:'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;'});
      var closeBtn = el('button',{textContent:'Close',style:'padding:6px 12px;border-radius:8px;border:1px solid #333;background:#222;color:#ddd;cursor:pointer;'});
      closeBtn.addEventListener('click',function(){ wrap.remove(); });
      actions.appendChild(closeBtn);
      card.appendChild(form); card.appendChild(actions);
      wrap.appendChild(card);
      document.body.appendChild(wrap);
    }
  };
  window.GM_config = G;
})();

(function(){'use strict';
  var CONFIG_ID = 'commenthq_cfg_v030';
  var fields = {
    // Core
    debugLogs:   { label:'Enable debug logs', type:'checkbox', default:false },
    panelCorner: { label:'Panel corner', type:'select', options:['top-left','top-right','bottom-left','bottom-right'], default:'top-right' },

    // Phase 1.D (stubs only; disabled by default)
    mod_factCamouflage: { label:'1.D — Fact Camouflage (stub)', type:'checkbox', default:false },
    mod_bannedPatternDisruption: { label:'1.D — Banned-Pattern Disruption (stub)', type:'checkbox', default:false },
    mod_threatIndexing: { label:'1.D — Threat Indexing (stub)', type:'checkbox', default:false },
    mod_toneInjection: { label:'1.D — Expressive Tone Injection (stub)', type:'checkbox', default:false }
  };
  try { GM_config.init({ id: CONFIG_ID, title: 'CommentHQ Settings', fields: fields }); } catch(e){}

  function cfgGet(key, def){
    try { return GM_config.get(key); } catch(e) { return def; }
  }

  function log(){
    if (cfgGet('debugLogs', false)) {
      var a = Array.prototype.slice.call(arguments);
      a.unshift('[CommentHQ]');
      try { console.log.apply(console, a); } catch(e){}
    }
  }

  // Settings button
  var btnId='commenthq-settings-btn';
  function placeButtonCorner(btn){
    var c = cfgGet('panelCorner','top-right');
    var map = {
      'top-left':'top:12px;left:12px;',
      'top-right':'top:12px;right:12px;',
      'bottom-left':'bottom:12px;left:12px;',
      'bottom-right':'bottom:12px;right:12px;'
    };
    btn.style.top=btn.style.right=btn.style.bottom=btn.style.left='';
    btn.style.cssText = btn.style.cssText.replace(/top:[^;]*;|right:[^;]*;|bottom:[^;]*;|left:[^;]*;/g,'');
    btn.style.cssText += map[c] || map['top-right'];
  }

  function ensureButton(){
    if (document.getElementById(btnId)) return;
    var b=document.createElement('button'); b.id=btnId; b.textContent='CommentHQ ⚙';
    b.style.cssText='position:fixed;z-index:99998;padding:6px 10px;border-radius:10px;background:#111;color:#eee;border:1px solid #333;opacity:.9;';
    b.addEventListener('click', function(){
      try { GM_config.open(); } catch(e){}
      setTimeout(function(){ placeButtonCorner(b); }, 50);
    });
    document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(b); placeButtonCorner(b); });
  }

  ensureButton();
  log('booted (v0.3.0). Phase 1.D toggles present but inactive.');

  // Stub hooks for modules (no-ops until GUI/engine integrated)
  function maybeRewrite(text){
    if (!text) return text;
    if (!cfgGet('mod_factCamouflage',false) &&
        !cfgGet('mod_bannedPatternDisruption',false) &&
        !cfgGet('mod_threatIndexing',false) &&
        !cfgGet('mod_toneInjection',false)) {
      return text; // all off
    }
    // TODO: call local rewrite microservice once available
    return text;
  }

  // Expose hook for future integration
  window.__CommentHQ = window.__CommentHQ || {};
  window.__CommentHQ.maybeRewrite = maybeRewrite;
})();
