/* Mărțișor WhatsApp-style mock
   - 5 new chats animate in at the very top
   - on the 5th new chat, it auto-opens the conversation
   - opened chat plays an incoming message sequence with WhatsApp-style typing dots
   - side toggle swaps the final location message(s)
   - all text is click-to-edit (contenteditable)
*/

const app = document.getElementById("app");
const chatList = document.getElementById("chatList");
const backBtn = document.getElementById("backBtn");
const replayBtn = document.getElementById("replayBtn");

const chatNameEl = document.getElementById("chatName");
const chatStatusEl = document.getElementById("chatStatus");
const chatAvatarEl = document.getElementById("chatAvatar");
const chatAvatarImg = document.getElementById("chatAvatarImg");

const dynamicMount = document.getElementById("dynamicMount");
const altAddressToggle = document.getElementById("altAddressToggle");

const HEX_HOUSE_NAME = "Hex House";

function formatDisplayName(name) {
  if (!name) return "";
  if (name === HEX_HOUSE_NAME) return name;

  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return String(name).trim();

  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = last ? `${last.charAt(0)}.` : "";
  return `${first} ${initial}`.trim();
}


const EVENT_SEQUENCE = [
  {
    html: "Celebrate spring the Romanian way!",
    afterMs: 702,
  },
  {
    html:
      'Experience the live creation of a <strong>large-scale Mărțișor</strong> - a work exploring memory',
    afterMs: 837,
  },
  {
    html: "Join us for the performance, food, and community. Open to all",
    afterMs: 783,
  },
  {
    html: "<strong>Sunday, March 1st @ 2:00 PM</strong>",
    afterMs: 648,
  },
];

const LOCATION_SINGLE_HTML = "<strong>366 Devoe Street, Brooklyn</strong>";
const LOCATION_ALT_TEXTS = [
  "East Williamsburg",
  "address details at alexia.media/martisor",
];

const romanianNames = [
  "Ana Popescu",
  "Mihai Ionescu",
  "Ioana Dumitrescu",
  "Andrei Stan",
  "Elena Marinescu",
  "Radu Petrescu",
  "Cătălina Georgescu",
  "Ștefan Rusu",
  "Cristina Matei",
  "Vlad Popa",
  "Alina Toma",
  "Bogdan Enache",
  "Teodora Ilie",
  "Daria Stoica",
  "Sorin Dobre",
  "Irina Pavel",
  "Rareș Ciobanu",
  "Bianca Șerban",
  "Dragoș Vasile",
  "Maria Nistor",
  "Nicoleta Cristea",
  "Gabriel Munteanu",
  "Oana Sava",
  "Mădălina Răduț",
  "Florin Neagu",
  "Alexia Bălan",
  "Dinu Barbu",
  "Iulia Chiriac",
  "Săndel Păun",
  "Roxana Bîrsan",
];

const previewOptions = ["Happy Mărțișor!", "Imagine atașată"];

const timeOptions = [
  "11:08 AM",
  "12:44 AM",
  "9:11 AM",
  "8:33 AM",
  "Yesterday",
  "Yesterday",
  "Yesterday",
  "7:02 AM",
  "6:18 AM",
  "10:29 PM",
];

let avatarCounter = 0;

let runToken = 0;
let floodIntervalId = null;

let hasPlayedHexSequence = false;
let locationRendered = false;
/** @type {HTMLElement[]} */
let locationNodes = [];

function isHexThreadMounted() {
  return dynamicMount?.dataset?.thread === "hex";
}

function guardToken(token) {
  return token === runToken;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatNowTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function updateStatusBarTimes() {
  const t = formatNowTime();
  document.querySelectorAll(".statusbar__time").forEach((el) => {
    el.textContent = t;
  });
}

function disableEditables() {
  document.querySelectorAll("[contenteditable]").forEach((el) => {
    el.removeAttribute("contenteditable");
  });
  document.querySelectorAll(".editable").forEach((el) => {
    el.classList.remove("editable");
  });
}

function startClock() {
  updateStatusBarTimes();
  // Update shortly after each minute rolls over.
  window.setInterval(() => {
    updateStatusBarTimes();
  }, 1000);
}

function nextAvatarSrc() {
  const letters = "abcdefgh";
  const ch = letters[avatarCounter % letters.length];
  avatarCounter += 1;
  return `images/${ch}.jpg`;
}

function markAvatarFallback(containerEl, imgEl) {
  containerEl.classList.remove("is-missing");
  imgEl.addEventListener(
    "error",
    () => containerEl.classList.add("is-missing"),
    { once: true },
  );
}

function createChatRow(chat) {
  const row = document.createElement("div");
  row.className = "row is-entering";
  row.dataset.chatId = chat.id;

  row.innerHTML = `
    <div class="avatar">
      <img src="${chat.avatarSrc}" alt="" />
      <div class="avatar-fallback" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2-8 4.5V21h16v-2.5C20 16 16.42 14 12 14Z"/></svg>
      </div>
    </div>

    <div class="row__main">
      <div class="row__top">
        <div class="row__name editable" contenteditable="true" spellcheck="false">${chat.name}</div>
        <div class="row__time editable" contenteditable="true" spellcheck="false">${chat.time}</div>
      </div>
      <div class="row__bottom">
        <div class="row__preview editable" contenteditable="true" spellcheck="false">${chat.preview}</div>
        <div class="row__meta">
          <div class="badge editable" contenteditable="true" spellcheck="false">${chat.badge}</div>
        </div>
      </div>
    </div>
  `;

  const avatar = row.querySelector(".avatar");
  const avatarImg = row.querySelector(".avatar img");
  markAvatarFallback(avatar, avatarImg);

  // Click row to open chat, BUT allow editing text without navigating.
  row.addEventListener("click", (e) => {
    if (e.target.closest('[contenteditable="true"]')) return;
    openChat(chat);
  });

  return row;
}

function generateChatData() {
  const id = `c_${Math.random().toString(16).slice(2)}`;
  return {
    id,
    name: formatDisplayName(pick(romanianNames)),
    preview: pick(previewOptions),
    time: pick(timeOptions),
    badge: "99+",
    avatarSrc: nextAvatarSrc(),
  };
}

function addInitialChats() {
  const initial = Array.from({ length: 10 }, () => generateChatData());
  initial.forEach((chat) => {
    const row = createChatRow(chat);
    row.classList.remove("is-entering");
    row.classList.add("is-entered");
    chatList.appendChild(row);
  });
}

function animateFloodThenOpen() {
  let count = 0;
  let lastRow = null;
  let lastChat = null;

  const token = runToken;

  floodIntervalId = window.setInterval(() => {
    if (token !== runToken) return;
    count += 1;

    const chat = generateChatData();

    // Make the 5th one the "Hex House" chat we'll auto-open.
    if (count === 5) {
      chat.name = HEX_HOUSE_NAME;
      chat.preview = "Imagine atașată";
      chat.time = "12:30 PM";
    }

    const row = createChatRow(chat);
    chatList.prepend(row);

    requestAnimationFrame(() => row.classList.add("is-entered"));

    lastRow = row;
    lastChat = chat;

    if (count >= 5) {
      if (floodIntervalId) window.clearInterval(floodIntervalId);
      floodIntervalId = null;

      // Visual "click" cue, then open
      window.setTimeout(() => {
        if (token !== runToken) return;
        if (lastRow) lastRow.classList.add("is-selected");
        window.setTimeout(() => {
        if (token !== runToken) return;
          if (lastChat) openChat(lastChat);
        }, 520);
      }, 360);
    }
  }, 800);
}

function scrollChatToBottom() {
  const chatScroll = document.querySelector("#pageChat .chat");
  if (!chatScroll) return;

  // Use a timeout so layout has time to calculate heights.
  window.setTimeout(() => {
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }, 20);
}

function clearDynamicMessages() {
  dynamicMount.innerHTML = "";
  locationNodes = [];
  locationRendered = false;
}

function createIncomingMsg({ html, timeText = "" }) {
  const msg = document.createElement("div");
  msg.className = "msg msg--incoming";

  msg.innerHTML = `
    <div class="bubble bubble--incoming">
      <div class="bubble__text editable" contenteditable="true" spellcheck="false"></div>
      <div class="bubble__meta">
        <span class="bubble__time editable" contenteditable="true" spellcheck="false">${timeText}</span>
      </div>
    </div>
  `;

  const textEl = msg.querySelector(".bubble__text");
  textEl.innerHTML = html;

  return msg;
}

function appendIncoming(html, opts = {}) {
  const msgEl = createIncomingMsg({ html, timeText: opts.timeText || "" });
  dynamicMount.appendChild(msgEl);
  scrollChatToBottom();
  return msgEl;
}

function createTypingMsg() {
  const msg = document.createElement("div");
  msg.className = "msg msg--incoming msg--typing";

  msg.innerHTML = `
    <div class="bubble bubble--incoming bubble--typing" aria-label="Typing">
      <div class="typing" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;

  return msg;
}

async function showTyping(durationMs = 900) {
  const typingEl = createTypingMsg();
  dynamicMount.appendChild(typingEl);
  chatStatusEl.textContent = "typing…";
  scrollChatToBottom();

  await sleep(durationMs);

  typingEl.remove();
  chatStatusEl.textContent = "online";
  scrollChatToBottom();
}

function removeLocationNodes() {
  locationNodes.forEach((n) => n.remove());
  locationNodes = [];
}

function renderLocationInstant() {
  // Used when toggling after the sequence has already finished.
  removeLocationNodes();

  if (altAddressToggle && altAddressToggle.checked) {
    const n1 = appendIncoming(LOCATION_ALT_TEXTS[0], { timeText: "" });
    const n2 = appendIncoming(LOCATION_ALT_TEXTS[1], { timeText: "" });
    locationNodes = [n1, n2];
  } else {
    const n = appendIncoming(LOCATION_SINGLE_HTML, { timeText: "" });
    locationNodes = [n];
  }

  locationRendered = true;
}

async function playHexHouseSequence() {
  const token = runToken;
  if (hasPlayedHexSequence) return;
  hasPlayedHexSequence = true;

  dynamicMount.dataset.thread = "hex";

  clearDynamicMessages();
  chatNameEl.textContent = HEX_HOUSE_NAME;
  chatStatusEl.textContent = "online";

  // First message appears immediately on open.
  appendIncoming(EVENT_SEQUENCE[0].html, { timeText: "12:31" });
  await sleep(EVENT_SEQUENCE[0].afterMs);
  if (!guardToken(token)) return;

  // Remaining messages arrive with typing dots in between.
  for (let i = 1; i < EVENT_SEQUENCE.length; i += 1) {
    await showTyping(1200);
    if (!guardToken(token)) return;
    appendIncoming(EVENT_SEQUENCE[i].html, { timeText: "12:3" + (1 + i) });
    await sleep(EVENT_SEQUENCE[i].afterMs);
    if (!guardToken(token)) return;
  }

  // Final location step (single vs 2 texts).
  await showTyping(1200);
  if (!guardToken(token)) return;

  if (altAddressToggle && altAddressToggle.checked) {
    const n1 = appendIncoming(LOCATION_ALT_TEXTS[0], { timeText: "12:36" });
    locationNodes.push(n1);
    await sleep(220);
    if (!guardToken(token)) return;
    await showTyping(1000);
    if (!guardToken(token)) return;
    const n2 = appendIncoming(LOCATION_ALT_TEXTS[1], { timeText: "12:36" });
    locationNodes.push(n2);
  } else {
    const n = appendIncoming(LOCATION_SINGLE_HTML, { timeText: "12:36" });
    locationNodes.push(n);
  }

  locationRendered = true;
  scrollChatToBottom();
}

function renderHexHouseFinalState() {
  // Fallback if the user opened other chats (clearing the thread) and then returns to Hex House.
  clearDynamicMessages();
  dynamicMount.dataset.thread = "hex";

  EVENT_SEQUENCE.forEach((m) => {
    appendIncoming(m.html, { timeText: "" });
  });

  removeLocationNodes();

  if (altAddressToggle && altAddressToggle.checked) {
    const n1 = appendIncoming(LOCATION_ALT_TEXTS[0], { timeText: "" });
    const n2 = appendIncoming(LOCATION_ALT_TEXTS[1], { timeText: "" });
    locationNodes = [n1, n2];
  } else {
    const n = appendIncoming(LOCATION_SINGLE_HTML, { timeText: "" });
    locationNodes = [n];
  }

  locationRendered = true;
  scrollChatToBottom();
}

function openChat(chat) {
  // Update header
  chatNameEl.textContent = chat.name;
  chatStatusEl.textContent = "online";

  // Avatar in chat header
  chatAvatarEl.classList.remove("is-missing");
  chatAvatarImg.src = chat.avatarSrc;
  chatAvatarImg.onerror = () => chatAvatarEl.classList.add("is-missing");

  // Show chat page
  app.classList.add("show-chat");
  scrollChatToBottom();

  // Only the Hex House chat plays the full event animation.
  if (chat.name === HEX_HOUSE_NAME) {
    // If the thread was cleared by opening other chats, restore instantly.
    if (hasPlayedHexSequence && !isHexThreadMounted()) {
      renderHexHouseFinalState();
    } else {
      playHexHouseSequence();
    }
  } else {
    clearDynamicMessages();
    dynamicMount.dataset.thread = "other";
    appendIncoming("Happy Mărțișor!", { timeText: "" });
  }
}

function closeChat() {
  app.classList.remove("show-chat");
}

backBtn.addEventListener("click", closeChat);

if (altAddressToggle) {
  altAddressToggle.addEventListener("change", () => {
    if (!locationRendered) return;
    renderLocationInstant();
  });
}


function resetExperience() {
  runToken += 1;

  if (floodIntervalId) {
    window.clearInterval(floodIntervalId);
    floodIntervalId = null;
  }

  // Reset core state
  avatarCounter = 0;
  hasPlayedHexSequence = false;
  locationRendered = false;
  locationNodes = [];

  // Return to list view
  app.classList.remove("show-chat");

  // Clear dynamic chat thread + list
  if (dynamicMount) dynamicMount.innerHTML = "";
  if (dynamicMount?.dataset) dynamicMount.dataset.thread = "";
  chatList.innerHTML = "";

  // Rebuild + replay intro
  addInitialChats();
  animateFloodThenOpen();
}

if (replayBtn) {
  replayBtn.addEventListener("click", resetExperience);
}

// Init
startClock();
disableEditables();
addInitialChats();
animateFloodThenOpen();
