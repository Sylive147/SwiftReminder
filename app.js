const cardsEl = document.getElementById("cards");
const updatedAtEl = document.getElementById("updatedAt");

const COOKIE_KEY = "cards_data";
const COOKIE_DAYS = 365;
const MAX_TEXT_LENGTH = 30;
const MAX_COUNT = 99;
const BASE_COLOR = { r: 0, g: 255, b: 190 };
const BLUE_STEP = 6;

let cards = [];
let idSeed = 1;
let editingCardId = "";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeId() {
  const id = `card-${idSeed}`;
  idSeed += 1;
  return id;
}

function clipText(text, maxLength = MAX_TEXT_LENGTH) {
  return Array.from(text).slice(0, maxLength).join("");
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

function colorForIndex(index) {
  const blue = clamp(BASE_COLOR.b - index * BLUE_STEP, 0, 255);
  return `rgb(${BASE_COLOR.r}, ${BASE_COLOR.g}, ${blue})`;
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

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function updateTimestamp() {
  if (!updatedAtEl) {
    return;
  }
  updatedAtEl.textContent = `更新时间：${formatTimestamp(new Date())}`;
}

function createCountCard(card, index) {
  const row = document.createElement("article");
  row.className = "card";
  row.dataset.id = card.id;
  row.style.backgroundColor = colorForIndex(index);

  const isEditing = editingCardId === card.id;
  if (isEditing) {
    row.classList.add("is-editing");
  }

  const countEl = document.createElement("div");
  countEl.className = "count";
  countEl.textContent = String(card.count);

  const minusBtn = createButton("-", () => {
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

  const deleteBtn = createButton("🗑", () => {
    cards = cards.filter((item) => item.id !== card.id);
    if (editingCardId === card.id) {
      editingCardId = "";
    }
    persistAndRender();
  });
  deleteBtn.classList.add("delete-btn");
  deleteBtn.title = "删除这张卡片";
  deleteBtn.setAttribute("aria-label", "删除这张卡片");

  const editBtn = createButton(isEditing ? "✓" : "✎", () => {
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

function createAddCard() {
  const row = document.createElement("article");
  row.className = "card add-card";
  row.dataset.id = "add-row";
  row.style.backgroundColor = colorForIndex(0);

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
  cardsEl.appendChild(createAddCard());
  cards.forEach((card, index) => {
    cardsEl.appendChild(createCountCard(card, index + 1));
  });
  animateFlip(beforePositions);
  updateTimestamp();
}

function createInitialCards() {
  return [
    { id: makeId(), text: "设计主页布局", count: 8 },
    { id: makeId(), text: "优化卡片交互动画", count: 6 },
    { id: makeId(), text: "完善数据读取逻辑", count: 4 },
    { id: makeId(), text: "准备示例JSON文件", count: 2 }
  ];
}

cards = loadCardsFromCookie();
if (cards.length === 0) {
  cards = createInitialCards();
  saveCardsToCookie();
}
render();
