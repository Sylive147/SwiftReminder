const cardsEl = document.getElementById("cards");
const updatedAtEl = document.getElementById("updatedAt");

const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const cardStartColorSwatch = document.getElementById("cardStartColorSwatch");
const cardEndColorSwatch = document.getElementById("cardEndColorSwatch");
const bgStartColorSwatch = document.getElementById("bgStartColorSwatch");
const bgEndColorSwatch = document.getElementById("bgEndColorSwatch");
const glossSlider = document.getElementById("glossSlider");
const glossValue = document.getElementById("glossValue");
const pickerOverlay = document.getElementById("pickerOverlay");
const pickerTitle = document.getElementById("pickerTitle");
const pickerPreview = document.getElementById("pickerPreview");
const sliderR = document.getElementById("sliderR");
const sliderG = document.getElementById("sliderG");
const sliderB = document.getElementById("sliderB");
const valueR = document.getElementById("valueR");
const valueG = document.getElementById("valueG");
const valueB = document.getElementById("valueB");
const pickerHexValue = document.getElementById("pickerHexValue");
const pickerCancel = document.getElementById("pickerCancel");
const pickerApply = document.getElementById("pickerApply");
const resetThemeBtn = document.getElementById("resetThemeBtn");

const COOKIE_KEY = "cards_data";
const COOKIE_DAYS = 365;
const META_COOKIE_KEY = "repo_meta_cache";
const META_CACHE_DAYS = 7;
const THEME_COOKIE_KEY = "theme_config";
const MAX_TEXT_LENGTH = 30;
const MAX_COUNT = 99;
const REPO_OWNER = "Sylive147";
const REPO_NAME = "SwiftReminder";
const REPO_BRANCH = "main";
const META_FETCH_TIMEOUT_MS = 5000;

const DEFAULT_THEME = {
  cardStart: { r: 146, g: 241, b: 232 },
  cardEnd: { r: 168, g: 224, b: 209 },
  backgroundStart: { r: 33, g: 111, b: 150 },
  backgroundEnd: { r: 31, g: 150, b: 109 },
  glossStrength: 40
};

let cards = [];
let idSeed = 1;
let editingCardId = "";
let repoUpdatedAtText = "仓库更新时间：加载中... · 版本：加载中...";
let theme = {
  cardStart: { ...DEFAULT_THEME.cardStart },
  cardEnd: { ...DEFAULT_THEME.cardEnd },
  backgroundStart: { ...DEFAULT_THEME.backgroundStart },
  backgroundEnd: { ...DEFAULT_THEME.backgroundEnd },
  glossStrength: DEFAULT_THEME.glossStrength
};
let activePicker = "";
let tempColor = { r: 0, g: 0, b: 0 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clipText(text, maxLength = MAX_TEXT_LENGTH) {
  return Array.from(text).slice(0, maxLength).join("");
}

function makeId() {
  const id = `card-${idSeed}`;
  idSeed += 1;
  return id;
}

function rgbToCss(rgb) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function rgbToHex(rgb) {
  const toHex = (v) => clamp(Number(v), 0, 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function mixColor(start, end, factor) {
  return {
    r: Math.round(start.r + (end.r - start.r) * factor),
    g: Math.round(start.g + (end.g - start.g) * factor),
    b: Math.round(start.b + (end.b - start.b) * factor)
  };
}

function normalizeRgb(obj, fallback) {
  if (!obj || typeof obj !== "object") {
    return { ...fallback };
  }
  return {
    r: clamp(Number(obj.r), 0, 255),
    g: clamp(Number(obj.g), 0, 255),
    b: clamp(Number(obj.b), 0, 255)
  };
}

function setCookie(name, value, days) {
  const expireDate = new Date();
  expireDate.setTime(expireDate.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expireDate.toUTCString()}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const prefix = `${name}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const item = part.trim();
    if (item.startsWith(prefix)) {
      return decodeURIComponent(item.slice(prefix.length));
    }
  }
  return "";
}

function saveThemeToCookie() {
  try {
    setCookie(THEME_COOKIE_KEY, JSON.stringify(theme), COOKIE_DAYS);
  } catch (_error) {
    return;
  }
}

function loadThemeFromCookie() {
  const raw = getCookie(THEME_COOKIE_KEY);
  if (!raw) {
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    theme = {
      cardStart: normalizeRgb(parsed.cardStart, DEFAULT_THEME.cardStart),
      cardEnd: normalizeRgb(parsed.cardEnd, DEFAULT_THEME.cardEnd),
      backgroundStart: normalizeRgb(parsed.backgroundStart, DEFAULT_THEME.backgroundStart),
      backgroundEnd: normalizeRgb(parsed.backgroundEnd, DEFAULT_THEME.backgroundEnd),
      glossStrength: clamp(Number(parsed.glossStrength), 0, 100)
    };
    if (!Number.isFinite(theme.glossStrength)) {
      theme.glossStrength = DEFAULT_THEME.glossStrength;
    }
  } catch (_error) {
    theme = {
      cardStart: { ...DEFAULT_THEME.cardStart },
      cardEnd: { ...DEFAULT_THEME.cardEnd },
      backgroundStart: { ...DEFAULT_THEME.backgroundStart },
      backgroundEnd: { ...DEFAULT_THEME.backgroundEnd },
      glossStrength: DEFAULT_THEME.glossStrength
    };
  }
}

function applyTheme() {
  document.documentElement.style.setProperty("--page-bg-start", rgbToCss(theme.backgroundStart));
  document.documentElement.style.setProperty("--page-bg-end", rgbToCss(theme.backgroundEnd));
  cardStartColorSwatch.style.background = rgbToCss(theme.cardStart);
  cardEndColorSwatch.style.background = rgbToCss(theme.cardEnd);
  bgStartColorSwatch.style.background = rgbToCss(theme.backgroundStart);
  bgEndColorSwatch.style.background = rgbToCss(theme.backgroundEnd);

  const strength = clamp(Number(theme.glossStrength), 0, 100);
  const ratio = strength / 100;
  const glossTop = (0.14 + ratio * 0.22).toFixed(3);
  const glossMid = (0.06 + ratio * 0.12).toFixed(3);
  const glossBorder = (0.12 + ratio * 0.24).toFixed(3);
  const glossGlow = (0.10 + ratio * 0.34).toFixed(3);

  document.documentElement.style.setProperty("--card-gloss-top", `rgba(255, 255, 255, ${glossTop})`);
  document.documentElement.style.setProperty("--card-gloss-mid", `rgba(255, 255, 255, ${glossMid})`);
  document.documentElement.style.setProperty("--card-gloss-border", `rgba(255, 255, 255, ${glossBorder})`);
  document.documentElement.style.setProperty("--card-glow", `rgba(226, 255, 248, ${glossGlow})`);

  if (glossSlider) {
    glossSlider.value = String(strength);
  }
  if (glossValue) {
    glossValue.textContent = `${strength}%`;
  }
}

function toggleSettingsPanel() {
  settingsPanel.classList.toggle("hidden");
  if (settingsPanel.classList.contains("hidden")) {
    pickerOverlay.classList.add("hidden");
  }
}

function syncPickerPreview() {
  tempColor = {
    r: Number(sliderR.value),
    g: Number(sliderG.value),
    b: Number(sliderB.value)
  };
  valueR.textContent = String(tempColor.r);
  valueG.textContent = String(tempColor.g);
  valueB.textContent = String(tempColor.b);
  pickerPreview.style.background = rgbToCss(tempColor);
  pickerHexValue.value = rgbToHex(tempColor);
}

function openPicker(type) {
  activePicker = type;
  let source = theme.cardStart;
  let title = "卡片起点颜色调节";
  if (type === "cardEnd") {
    source = theme.cardEnd;
    title = "卡片终点颜色调节";
  } else if (type === "bgStart") {
    source = theme.backgroundStart;
    title = "背景起点颜色调节";
  } else if (type === "bgEnd") {
    source = theme.backgroundEnd;
    title = "背景终点颜色调节";
  }
  tempColor = { ...source };
  sliderR.value = String(tempColor.r);
  sliderG.value = String(tempColor.g);
  sliderB.value = String(tempColor.b);
  pickerTitle.textContent = title;
  syncPickerPreview();
  pickerOverlay.classList.remove("hidden");
}

function applyPickerColor() {
  if (activePicker === "cardStart") {
    theme.cardStart = { ...tempColor };
  } else if (activePicker === "cardEnd") {
    theme.cardEnd = { ...tempColor };
  } else if (activePicker === "bgStart") {
    theme.backgroundStart = { ...tempColor };
  } else if (activePicker === "bgEnd") {
    theme.backgroundEnd = { ...tempColor };
  }
  saveThemeToCookie();
  applyTheme();
  render();
  pickerOverlay.classList.add("hidden");
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const text = typeof entry.text === "string" ? clipText(entry.text.trim()) : "";
  const count = Number(entry.count);
  if (!text || !Number.isInteger(count) || count <= 0) {
    return null;
  }
  return { id: makeId(), text, count: Math.min(count, MAX_COUNT) };
}

function normalizeData(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(normalizeEntry).filter(Boolean);
}

function toSerializableData() {
  return cards.map((card) => ({ text: card.text, count: card.count }));
}

function saveCardsToCookie() {
  try {
    setCookie(COOKIE_KEY, JSON.stringify(toSerializableData()), COOKIE_DAYS);
    return true;
  } catch (_error) {
    return false;
  }
}

function loadCardsFromCookie() {
  const raw = getCookie(COOKIE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return normalizeData(JSON.parse(raw));
  } catch (_error) {
    return [];
  }
}

function colorForIndex(index, totalItems) {
  const total = Math.max(totalItems - 1, 1);
  const factor = clamp(index / total, 0, 1);
  const mixed = mixColor(theme.cardStart, theme.cardEnd, factor);
  return rgbToCss(mixed);
}

function sortCards() {
  cards.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
}

function createButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-btn";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function playPressAnimations(button, countEl) {
  button.classList.remove("press-pop");
  countEl.classList.remove("pop");
  void button.offsetWidth;
  void countEl.offsetWidth;
  button.classList.add("press-pop");
  countEl.classList.add("pop");
}

function persistAndRender() {
  const ok = saveCardsToCookie();
  if (!ok) {
    alert("保存失败：Cookie 写入失败。");
  }
  render();
}

function updateTimestamp() {
  if (updatedAtEl) {
    updatedAtEl.textContent = repoUpdatedAtText;
  }
}

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function readCachedRepoMeta() {
  const raw = getCookie(META_COOKIE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const cache = JSON.parse(raw);
    if (cache && typeof cache.text === "string" && cache.text) {
      return cache.text;
    }
  } catch (_error) {
    return null;
  }
  return null;
}

function writeCachedRepoMeta(text) {
  try {
    setCookie(META_COOKIE_KEY, JSON.stringify({ text }), META_CACHE_DAYS);
  } catch (_error) {
    return;
  }
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function refreshRepoMeta() {
  const endpoint = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits/${REPO_BRANCH}`;
  try {
    const response = await withTimeout(
      fetch(endpoint, { headers: { Accept: "application/vnd.github+json" } }),
      META_FETCH_TIMEOUT_MS
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const commitDate = payload?.commit?.committer?.date || payload?.commit?.author?.date;
    const sha = payload?.sha ? String(payload.sha).slice(0, 7) : "";
    if (!commitDate || !sha) {
      throw new Error("missing commit info");
    }
    repoUpdatedAtText = `仓库更新时间：${formatTimestamp(new Date(commitDate))} · 版本：${sha}`;
    writeCachedRepoMeta(repoUpdatedAtText);
  } catch (_error) {
    const cached = readCachedRepoMeta();
    repoUpdatedAtText = cached ? `${cached}（缓存）` : "仓库更新时间：获取失败 · 版本：获取失败";
  }
  updateTimestamp();
}

function createCountCard(card, index, totalItems) {
  const row = document.createElement("article");
  row.className = "card";
  row.dataset.id = card.id;
  row.style.background = colorForIndex(index, totalItems);

  const isEditing = editingCardId === card.id;
  if (isEditing) {
    row.classList.add("is-editing");
  }

  const countEl = document.createElement("div");
  countEl.className = "count";
  countEl.textContent = String(card.count);

  const minusBtn = createButton("−", () => {
    playPressAnimations(minusBtn, countEl);
    setTimeout(() => {
      card.count = Math.max(1, card.count - 1);
      persistAndRender();
    }, 150);
  });
  minusBtn.classList.add("minus-btn");

  const plusBtn = createButton("+", () => {
    playPressAnimations(plusBtn, countEl);
    setTimeout(() => {
      card.count = Math.min(MAX_COUNT, card.count + 1);
      persistAndRender();
    }, 150);
  });
  plusBtn.classList.add("plus-btn");

  const deleteBtn = createButton("🗑️", () => {
    cards = cards.filter((item) => item.id !== card.id);
    if (editingCardId === card.id) {
      editingCardId = "";
    }
    persistAndRender();
  });
  deleteBtn.classList.add("delete-btn");
  deleteBtn.title = "删除这张卡片";
  deleteBtn.setAttribute("aria-label", "删除这张卡片");

  const editBtn = createButton(isEditing ? "✅" : "✏️", () => {
    if (!isEditing) {
      editingCardId = card.id;
      render();
      return;
    }
    const inputEl = row.querySelector(".edit-input");
    const text = clipText((inputEl ? inputEl.value : "").trim());
    if (!text) {
      alert("文本不能为空。");
      if (inputEl) {
        inputEl.focus();
      }
      return;
    }
    card.text = text;
    editingCardId = "";
    persistAndRender();
  });
  editBtn.classList.add("edit-btn");
  if (isEditing) {
    editBtn.classList.add("confirm-btn");
    editBtn.title = "确认修改";
    editBtn.setAttribute("aria-label", "确认修改");
  } else {
    editBtn.title = "编辑文本";
    editBtn.setAttribute("aria-label", "编辑文本");
  }

  const textEl = document.createElement("div");
  textEl.className = "text";
  if (isEditing) {
    const input = document.createElement("input");
    input.className = "edit-input";
    input.type = "text";
    input.maxLength = MAX_TEXT_LENGTH;
    input.value = card.text;
    input.placeholder = "请输入文本（最多30个中文字符）";
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        editBtn.click();
      } else if (event.key === "Escape") {
        editingCardId = "";
        render();
      }
    });
    textEl.appendChild(input);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  } else {
    textEl.textContent = card.text;
  }

  row.appendChild(minusBtn);
  row.appendChild(textEl);
  row.appendChild(countEl);
  row.appendChild(plusBtn);
  row.appendChild(editBtn);
  row.appendChild(deleteBtn);
  return row;
}

function createAddCard(totalItems) {
  const row = document.createElement("article");
  row.className = "card add-card";
  row.dataset.id = "add-row";
  row.style.background = colorForIndex(0, totalItems);

  const placeholder = document.createElement("div");
  placeholder.className = "count";
  placeholder.textContent = "+";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "输入文本后回车添加（最多30个中文字符）";
  input.maxLength = MAX_TEXT_LENGTH;

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "action-btn";
  addBtn.textContent = "+";

  function submit() {
    const text = clipText(input.value.trim());
    if (!text) {
      return;
    }
    cards.push({ id: makeId(), text, count: 1 });
    input.value = "";
    saveCardsToCookie();
    render();
  }

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submit();
    }
  });
  addBtn.addEventListener("click", submit);

  const inputWrap = document.createElement("div");
  inputWrap.className = "text";
  inputWrap.appendChild(input);

  row.appendChild(placeholder);
  row.appendChild(inputWrap);
  row.appendChild(document.createElement("div"));
  row.appendChild(addBtn);

  const spacerA = document.createElement("div");
  spacerA.className = "card-spacer";
  const spacerB = document.createElement("div");
  spacerB.className = "card-spacer";
  row.appendChild(spacerA);
  row.appendChild(spacerB);
  return row;
}

function animateFlip(beforePositions) {
  cardsEl.querySelectorAll(".card").forEach((node) => {
    const id = node.dataset.id;
    const beforeRect = beforePositions.get(id);
    if (!beforeRect) {
      if (id !== "add-row") {
        node.classList.add("is-new");
      }
      return;
    }
    const afterRect = node.getBoundingClientRect();
    const dx = beforeRect.left - afterRect.left;
    const dy = beforeRect.top - afterRect.top;
    if (dx !== 0 || dy !== 0) {
      node.style.zIndex = "2";
      node.classList.add("is-moving");
      const animation = node.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(1.01)` },
          { transform: "translate(0, 0) scale(1)" }
        ],
        {
          duration: 680,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)"
        }
      );
      animation.onfinish = () => {
        node.style.zIndex = "";
        node.classList.remove("is-moving");
        node.style.transform = "";
      };
      animation.oncancel = animation.onfinish;
    }
  });
}

function render() {
  const beforePositions = new Map();
  cardsEl.querySelectorAll(".card").forEach((node) => {
    beforePositions.set(node.dataset.id, node.getBoundingClientRect());
  });

  sortCards();
  cardsEl.innerHTML = "";
  const totalItems = cards.length + 1;
  cardsEl.appendChild(createAddCard(totalItems));
  cards.forEach((card, index) => {
    cardsEl.appendChild(createCountCard(card, index + 1, totalItems));
  });
  animateFlip(beforePositions);
  updateTimestamp();
}

function createInitialCards() {
  return [
    { id: makeId(), text: "设计主页布局", count: 8 },
    { id: makeId(), text: "优化卡片交互动画", count: 6 },
    { id: makeId(), text: "完善数据读取逻辑", count: 4 },
    { id: makeId(), text: "准备示例数据", count: 2 }
  ];
}

function bindSettingEvents() {
  settingsBtn.addEventListener("click", toggleSettingsPanel);
  cardStartColorSwatch.addEventListener("click", () => openPicker("cardStart"));
  cardEndColorSwatch.addEventListener("click", () => openPicker("cardEnd"));
  bgStartColorSwatch.addEventListener("click", () => openPicker("bgStart"));
  bgEndColorSwatch.addEventListener("click", () => openPicker("bgEnd"));

  sliderR.addEventListener("input", syncPickerPreview);
  sliderG.addEventListener("input", syncPickerPreview);
  sliderB.addEventListener("input", syncPickerPreview);
  if (glossSlider) {
    glossSlider.addEventListener("input", () => {
      theme.glossStrength = clamp(Number(glossSlider.value), 0, 100);
      applyTheme();
      saveThemeToCookie();
    });
  }

  pickerCancel.addEventListener("click", () => {
    pickerOverlay.classList.add("hidden");
  });
  pickerApply.addEventListener("click", applyPickerColor);

  resetThemeBtn.addEventListener("click", () => {
    theme = {
      cardStart: { ...DEFAULT_THEME.cardStart },
      cardEnd: { ...DEFAULT_THEME.cardEnd },
      backgroundStart: { ...DEFAULT_THEME.backgroundStart },
      backgroundEnd: { ...DEFAULT_THEME.backgroundEnd },
      glossStrength: DEFAULT_THEME.glossStrength
    };
    saveThemeToCookie();
    applyTheme();
    render();
    pickerOverlay.classList.add("hidden");
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (!settingsPanel.contains(target) && target !== settingsBtn) {
      settingsPanel.classList.add("hidden");
      pickerOverlay.classList.add("hidden");
    }
  });
}

cards = loadCardsFromCookie();
if (cards.length === 0) {
  cards = createInitialCards();
  saveCardsToCookie();
}

loadThemeFromCookie();
applyTheme();
bindSettingEvents();

const cachedMetaText = readCachedRepoMeta();
if (cachedMetaText) {
  repoUpdatedAtText = `${cachedMetaText}（缓存）`;
}

render();
refreshRepoMeta();
