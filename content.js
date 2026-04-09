(() => {
  let mode = 'off'; // 'off' | 'temp' | 'locked'
  let hovered = null;
  let prevOutline = '';
  let hoverTimer = null;
  let lastAltDownAt = 0;

  const HOVER_DELAY = 300;
  const DOUBLE_TAP_WINDOW = 200;

  const isEditable = (el) =>
    el && el.closest && el.closest('input, textarea, [contenteditable], [contenteditable="true"]');

  let speakingEl = null;
  let prevBg = '';

  let extensionEnabled = false;
  let selectedVoiceName = null;
  try {
    chrome.storage && chrome.storage.local.get(['voiceName', 'enabled'], (r) => {
      selectedVoiceName = r && r.voiceName || null;
      extensionEnabled = !!(r && r.enabled);
    });
    chrome.storage && chrome.storage.onChanged && chrome.storage.onChanged.addListener((c) => {
      if (c.voiceName) selectedVoiceName = c.voiceName.newValue || null;
      if (c.enabled) {
        extensionEnabled = !!c.enabled.newValue;
        if (!extensionEnabled) exitMode();
      }
    });
  } catch (e) {}

  const clearSpeakingBg = () => {
    if (speakingEl) {
      speakingEl.style.backgroundColor = prevBg;
      speakingEl = null;
      prevBg = '';
    }
  };

  const speak = (text, el) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    try {
      speechSynthesis.cancel();
      clearSpeakingBg();
      const u = new SpeechSynthesisUtterance(trimmed);
      u.lang = 'en-US';
      u.rate = 0.85;
      if (selectedVoiceName) {
        const v = speechSynthesis.getVoices().find(x => x.name === selectedVoiceName);
        if (v) u.voice = v;
      }
      u.onstart = () => {
        if (!el) return;
        clearSpeakingBg();
        speakingEl = el;
        prevBg = el.style.backgroundColor;
        el.style.backgroundColor = '#fde68a';
      };
      u.onend = clearSpeakingBg;
      u.onerror = clearSpeakingBg;
      speechSynthesis.speak(u);
    } catch (e) {}
  };

  const clearHighlight = () => {
    if (hovered) {
      hovered.style.outline = prevOutline;
      hovered = null;
      prevOutline = '';
    }
  };

  const setHighlight = (el) => {
    if (hovered === el) return;
    clearHighlight();
    hovered = el;
    prevOutline = el.style.outline;
    el.style.outline = '2px solid #f59e0b';
  };

  const clearHoverTimer = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
  };

  const enterMode = (next) => {
    mode = next;
    document.body.style.cursor = 'crosshair';
  };

  const exitMode = () => {
    mode = 'off';
    clearHoverTimer();
    clearHighlight();
    try { speechSynthesis.cancel(); } catch (e) {}
    clearSpeakingBg();
    document.body.style.cursor = '';
  };

  const active = () => mode === 'temp' || mode === 'locked';

  // Sentence extraction at a point
  const SENT_BOUND = /[.!?]+[\s"')\]]*/g;
  const getSentenceAtPoint = (x, y) => {
    let node, offset;
    if (document.caretRangeFromPoint) {
      const r = document.caretRangeFromPoint(x, y);
      if (r) { node = r.startContainer; offset = r.startOffset; }
    } else if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(x, y);
      if (p) { node = p.offsetNode; offset = p.offset; }
    }
    if (!node) return null;
    // Walk up to a block container, collect its text
    let block = node.nodeType === 3 ? node.parentElement : node;
    while (block && block !== document.body) {
      const d = getComputedStyle(block).display;
      if (d && d !== 'inline' && d !== 'inline-block') break;
      block = block.parentElement;
    }
    if (!block) return null;
    const text = block.innerText || block.textContent || '';
    if (!text) return null;
    // Find absolute offset of click within block text — approximate with node's text offset
    // Fallback: search text and pick sentence containing offset relative to its text node.
    const nodeText = node.nodeType === 3 ? node.textContent : '';
    const idx = text.indexOf(nodeText);
    const abs = idx >= 0 ? idx + (offset || 0) : -1;
    if (abs < 0) return null;

    const boundaries = [0];
    let m;
    SENT_BOUND.lastIndex = 0;
    while ((m = SENT_BOUND.exec(text)) !== null) {
      boundaries.push(m.index + m[0].length);
    }
    boundaries.push(text.length);
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (abs >= boundaries[i] && abs <= boundaries[i + 1]) {
        const s = text.slice(boundaries[i], boundaries[i + 1]).trim();
        if (s) return s;
      }
    }
    return null;
  };

  // Keydown — Alt handling
  window.addEventListener('keydown', (e) => {
    if (!extensionEnabled) return;
    if (e.key === 'Alt') {
      const now = Date.now();
      if (mode === 'locked') {
        // single Alt press while locked → exit
        exitMode();
        return;
      }
      if (now - lastAltDownAt < DOUBLE_TAP_WINDOW) {
        enterMode('locked');
        lastAltDownAt = 0;
        return;
      }
      lastAltDownAt = now;
      if (mode === 'off') enterMode('temp');
    }
  }, true);

  window.addEventListener('keyup', (e) => {
    if (!extensionEnabled) return;
    if (e.key === 'Alt' && mode === 'temp') {
      exitMode();
    }
  }, true);

  window.addEventListener('blur', () => {
    if (active()) exitMode();
  });

  // Mouseover — highlight + debounce hover-speak
  document.addEventListener('mouseover', (e) => {
    if (!active()) return;
    const el = e.target;
    if (!el || isEditable(el)) return;
    setHighlight(el);
    clearHoverTimer();
    hoverTimer = setTimeout(() => {
      const text = el.innerText || el.textContent || '';
      speak(text, el);
    }, HOVER_DELAY);
  }, true);

  document.addEventListener('mouseout', (e) => {
    if (!active()) return;
    if (e.target === hovered) {
      clearHoverTimer();
      clearHighlight();
    }
  }, true);

  // Click — capture phase
  document.addEventListener('click', (e) => {
    if (!active()) return;
    const el = e.target;
    if (!el || isEditable(el)) return;
    e.preventDefault();
    e.stopPropagation();
    clearHoverTimer();
    if (mode === 'temp') mode = 'locked';
    if (e.shiftKey) {
      const s = getSentenceAtPoint(e.clientX, e.clientY);
      speak(s || el.innerText || el.textContent || '', el);
    } else {
      speak(el.innerText || el.textContent || '', el);
    }
  }, true);

  document.addEventListener('mousedown', (e) => {
    if (!active()) return;
    if (isEditable(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);
})();
