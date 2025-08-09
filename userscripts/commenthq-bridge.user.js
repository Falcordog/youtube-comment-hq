// ==UserScript==
// @name         CommentHQ Bridge
// @namespace    https://github.com/Falcordog/commenthq
// @version      0.3.0
// @description  CommentHQ control bridge with safe config + debug toggle
// @match        https://www.youtube.com/*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

/* eslint-env browser */
/* global GM_config */

(function() {
  'use strict';

  // --- Inline GM_config (ASCII-only, trimmed) ---
  // (I’ll embed the minimal GM_config build here in the patch so no external deps are needed.)

  // --- Config schema ---
  const CONFIG_ID = 'commenthq_cfg_v030';
  const CFG = {
    debugLogs: { label: 'Enable debug logs', type: 'checkbox', default: false },
    panelCorner: { label: 'Panel corner', type: 'select', options: ['top-left','top-right','bottom-left','bottom-right'], default: 'top-right' }
  };

  // Init config UI (non-modal)…
  // GM_config.init({ id: CONFIG_ID, title: 'CommentHQ Settings', fields: {/* from CFG */}, css: '', events: {...} });

  // Small helper: gated logging
  const log = (...args) => {
    try {
      if (GM_getValue('debugLogs', false)) console.log('[CommentHQ]', ...args);
    } catch { /* no-op */ }
  };

  // Style + placement based on corner
  function applyPanelPosition(corner) {
    // …position panel accordingly, save setting with GM_setValue('panelCorner', corner)
  }

  // Remove any stray breakpoints
  // (No `debugger;` statements anywhere.)

  // Boot
  log('boot');
  // …rest of bootstrap; panel draws, settings button, etc.
})();
