const cardsEl = document.getElementById("cards");
const updatedAtEl = document.getElementById("updatedAt");

const COOKIE_KEY = "cards_data";
const COOKIE_DAYS = 365;
const MAX_TEXT_LENGTH = 30;
const MAX_COUNT = 99;
const BASE_COLOR = { r: 0, g: 242, b: 178 };
const BLUE_STEP = 10;
const REPO_UPDATED_AT = "2026-03-19 00:55:00";
const APP_VERSION = "4507a74";

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
    alert("淇濆瓨澶辫触锛欳ookie 鍐欏叆澶辫触銆?);
  }
  render();
}

function updateTimestamp() {
  if (!updatedAtEl) {
    return;
  }
  updatedAtEl.textContent = `仓库更新时间：${REPO_UPDATED_AT} · 版本：${APP_VERSION}`;
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

  const deleteBtn = createButton("馃棏", () => {
    cards = cards.filter((item) => item.id !== card.id);
    if (editingCardId === card.id) {
      editingCardId = "";
    }
    persistAndRender();
  });
  deleteBtn.classList.add("delete-btn");
  deleteBtn.title = "鍒犻櫎杩欏紶鍗＄墖";
  deleteBtn.setAttribute("aria-label", "鍒犻櫎杩欏紶鍗＄墖");

  const editBtn = createButton(isEditing ? "鉁? : "鉁?, () => {
    if (!isEditing) {
      editingCardId = card.id;
      render();
      return;
    }

    const inputEl = row.querySelector(".edit-input");
    const text = clipText((inputEl ? inputEl.value : "").trim());
    if (!text) {
      alert("鏂囨湰涓嶈兘涓虹┖銆?);
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
    editBtn.title = "纭淇敼";
    editBtn.setAttribute("aria-label", "纭淇敼");
  } else {
    editBtn.title = "缂栬緫鏂囨湰";
    editBtn.setAttribute("aria-label", "缂栬緫鏂囨湰");
  }

  const textEl = document.createElement("div");
  textEl.className = "text";
  if (isEditing) {
    const input = document.createElement("input");
    input.className = "edit-input";
    input.type = "text";
    input.maxLength = MAX_TEXT_LENGTH;
    input.value = card.text;
    input.placeholder = "璇疯緭鍏ユ枃鏈紙鏈€澶?0涓腑鏂囧瓧绗︼級";
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
  input.placeholder = "杈撳叆鏂囨湰鍚庡洖杞︽坊鍔狅紙鏈€澶?0涓腑鏂囧瓧绗︼級";
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
    { id: makeId(), text: "璁捐涓婚〉甯冨眬", count: 8 },
    { id: makeId(), text: "浼樺寲鍗＄墖浜や簰鍔ㄧ敾", count: 6 },
    { id: makeId(), text: "瀹屽杽鏁版嵁璇诲彇閫昏緫", count: 4 },
    { id: makeId(), text: "鍑嗗绀轰緥JSON鏂囦欢", count: 2 }
  ];
}

cards = loadCardsFromCookie();
if (cards.length === 0) {
  cards = createInitialCards();
  saveCardsToCookie();
}
render();
