const loginBtn = document.getElementById('login-btn');
const settings = document.getElementById('settings');
const sel = document.getElementById('voice');
const testBtn = document.getElementById('test');

// --- Login toggle ---

const applyLoginState = (enabled) => {
  if (enabled) {
    loginBtn.textContent = '已登入　登出';
    loginBtn.classList.remove('state-off');
    loginBtn.classList.add('state-on');
    settings.classList.add('visible');
  } else {
    loginBtn.textContent = '登入';
    loginBtn.classList.remove('state-on');
    loginBtn.classList.add('state-off');
    settings.classList.remove('visible');
  }
};

chrome.storage.local.get(['enabled'], (r) => {
  applyLoginState(!!r.enabled);
});

loginBtn.addEventListener('click', () => {
  chrome.storage.local.get(['enabled'], (r) => {
    const next = !r.enabled;
    chrome.storage.local.set({ enabled: next });
    applyLoginState(next);
  });
});

// --- Voice selector ---

const populate = () => {
  const voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  voices.sort((a, b) => a.name.localeCompare(b.name));
  sel.innerHTML = '';
  const def = document.createElement('option');
  def.value = '';
  def.textContent = '(System default)';
  sel.appendChild(def);
  for (const v of voices) {
    const o = document.createElement('option');
    o.value = v.name;
    o.textContent = `${v.name} — ${v.lang}${v.default ? ' ★' : ''}`;
    sel.appendChild(o);
  }
  chrome.storage.local.get(['voiceName'], (r) => {
    if (r && r.voiceName) sel.value = r.voiceName;
  });
};

populate();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populate;
}

sel.addEventListener('change', () => {
  chrome.storage.local.set({ voiceName: sel.value || null });
});

testBtn.addEventListener('click', () => {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance('Hello, this is a test of the selected voice.');
  u.lang = 'en-US';
  u.rate = 0.85;
  if (sel.value) {
    const v = speechSynthesis.getVoices().find(x => x.name === sel.value);
    if (v) u.voice = v;
  }
  speechSynthesis.speak(u);
});
