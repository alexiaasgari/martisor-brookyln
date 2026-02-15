/* Mărțișor — WhatsApp-style mock
   Updates:
   - Slower + more sporadic intro (new chats appear at the top with irregular timing)
   - Interactive threads:
       • Hex House (auto-opens after intro) + RSVP popup link (Tally)
       • Art Details (concept sketch + text sequence + optional scans gif)
       • Mărțișor History (history text sequence)
   - Address always shown (no hide/reveal panel)
   - View-only (no contenteditable)
   - Generic chats cycle through avatars + preview lines before repeating
*/

/* -----------------------------
   DOM refs
------------------------------ */
const app = document.getElementById("app");
const chatList = document.getElementById("chatList");
const backBtn = document.getElementById("backBtn");
const replayBtn = document.getElementById("replayBtn");

const chatNameEl = document.getElementById("chatName");
const chatStatusEl = document.getElementById("chatStatus");
const chatAvatarEl = document.getElementById("chatAvatar");
const chatAvatarImg = document.getElementById("chatAvatarImg");

const dynamicMount = document.getElementById("dynamicMount");

/* -----------------------------
   Constants / content
------------------------------ */
const HEX_HOUSE_NAME = "Hex House";
const ART_DETAILS_NAME = "Art Details";
const MARTISOR_HISTORY_NAME = "Mărțișor History";

// Tally popup (RSVP)
const TALLY_POPUP_ID = "KYldG7";
const TALLY_EMOJI_TEXT = "👋";
const TALLY_EMOJI_ANIMATION = "wave";
const TALLY_EMOJI_TEXT_ENCODED = encodeURIComponent(TALLY_EMOJI_TEXT);

// Fixed avatars for interactive threads (not random).
// Swap these to any images you want.
const FIXED_AVATARS = {
  hex: "images/a.jpg",
  art: "images/b.jpg",
  history: "images/c.jpg",
};

// Generic avatar pool (cycled before repeating)
const GENERAL_AVATARS = [
  "images/a.jpg",
  "images/b.jpg",
  "images/c.jpg",
  "images/d.jpg",
  "images/e.jpg",
  "images/f.jpg",
  "images/g.jpg",
  "images/h.jpg",
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

const previewOptions = [
  "Happy Mărțișor!",
  "Noroc, sănătate și multă voie bună!",
  "Happy March 1st!",
  "Happy Spring!!!",
  "Un simbol mic pentru o prietenie mare. Să ai un Martie de vis!",
];

// Used for generic chat list rows.
const timeOptions = [
  "11:08 AM",
  "12:44 AM",
  "9:11 AM",
  "8:33 AM",
  "Yesterday",
  "7:02 AM",
  "6:18 AM",
  "10:29 PM",
];

// Hex House messages (RSVP is appended after this sequence)
const HEX_SEQUENCE = [
  { html: "Celebrate spring the Romanian way!", time: "12:31" },
  {
    html:
      'Experience the live creation of a <strong>large-scale Mărțișor</strong> - a work exploring memory',
    time: "12:32",
  },
  {
    html: "Join us for the performance, food, and community. Open to all",
    time: "12:34",
  },
  { html: "<strong>Sunday, March 1st @ 2:00 PM</strong>", time: "12:35" },
  { html: "<strong>366 Devoe Street, Brooklyn</strong>", time: "12:36" },
];

const ART_DETAILS_SEQUENCE = {
  conceptImageCandidates: [
    "images/conceptsketc.jpg",
    "conceptsketc.jpg",
    // common alternate spelling just in case
    "images/conceptsketch.jpg",
    "conceptsketch.jpg",
  ],
  scansGifCandidates: ["images/martisor-scans.gif", "martisor-scans.gif"],
  lines: [
    "The mărțișor is a Romanian spring tradition: a small braided token of red and white thread, exchanged on March 1st as a symbol of renewal and connection.",
    "Memory is sustained in presence and in practice. Through memory, objects and events become distorted but durational, carried by the collective, across time and place.",
    "Together we will weave a large mărțișor, strung with bead constructed of a large amalgamation of objects related to memory.",
  ],
};

const MARTISOR_HISTORY_LINES = [
  "Mărțișor is an ancient Romanian celebration on March 1st marking the arrival of spring and the victory of light over winter.",
  'The name is a diminutive of Martie, literally translating to "little March."',
  "The core symbol is a red and white twisted string representing the transition from the white of winter to the red vitality of spring.",
  "It was added to the UNESCO Intangible Cultural Heritage list in 2017 to preserve its historical and cultural significance.",
  "Historical roots date back over 2,000 years to Roman and Dacian times, possibly tied to the feast of the god Mars.",
  "One major legend features Baba Dochia, an old woman whose shedding of coats represents the volatile weather of early March.",
  "Another myth tells of a hero who rescued the Sun from a dragon, his red blood staining the white snow to create the first spring flowers.",
  "People traditionally wear the string pinned to their clothing or around their wrist for the first 9 to 12 days of the month.",
  "In modern times, the string is usually attached to small charms like snowdrops, ladybugs, or four-leaf clovers for good luck.",
  "The tradition concludes by tying the red and white string to the branch of a flowering fruit tree to ensure health and prosperity.",
  "It is primarily a gift-giving holiday where men give these talismans to women as a gesture of respect and affection.",
];

/* -----------------------------
   State
------------------------------ */
let runToken = 0; // cancels in-flight async work
let hasPlayedHexThread = false;

// Chat data registry
/** @type {Map<string, any>} */
const chatById = new Map();

/* -----------------------------
   Utilities
------------------------------ */
function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makeCycler(items, { shuffleEachCycle = true } = {}) {
  let deck = [];

  const next = () => {
    if (deck.length === 0) {
      deck = items.slice();
      if (shuffleEachCycle) shuffleInPlace(deck);
    }
    return deck.pop();
  };

  next.reset = () => {
    deck = [];
  };

  return next;
}

const nextGeneralAvatar = makeCycler(GENERAL_AVATARS);
const nextGeneralPreview = makeCycler(previewOptions);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDisplayName(name) {
  // Keep interactive threads as-is.
  if (
    name === HEX_HOUSE_NAME ||
    name === ART_DETAILS_NAME ||
    name === MARTISOR_HISTORY_NAME
  ) {
    return name;
  }

  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return String(name || "").trim();

  const first = parts[0];
  const last = parts[parts.length - 1];
  const initial = last ? `${last.charAt(0)}.` : "";
  return `${first} ${initial}`.trim();
}

function guardToken(token) {
  return token === runToken;
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

function startClock() {
  updateStatusBarTimes();
  window.setInterval(() => updateStatusBarTimes(), 1000);
}

function markAvatarFallback(containerEl, imgEl) {
  if (!containerEl || !imgEl) return;
  containerEl.classList.remove("is-missing");
  imgEl.addEventListener(
    "error",
    () => containerEl.classList.add("is-missing"),
    { once: true },
  );
}

function scrollChatToBottom() {
  const chatScroll = document.querySelector("#pageChat .chat");
  if (!chatScroll) return;
  window.setTimeout(() => {
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }, 20);
}

/* -----------------------------
   Chat list row creation
------------------------------ */
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
        <div class="row__name" spellcheck="false">${chat.name}</div>
        <div class="row__time" spellcheck="false">${chat.time}</div>
      </div>
      <div class="row__bottom">
        <div class="row__preview" spellcheck="false">${chat.preview}</div>
        <div class="row__meta">
          <div class="badge" spellcheck="false">${chat.badge}</div>
        </div>
      </div>
    </div>
  `;

  const avatar = row.querySelector(".avatar");
  const avatarImg = row.querySelector(".avatar img");
  markAvatarFallback(avatar, avatarImg);

  row.addEventListener("click", () => openChat(chat.id));

  return row;
}

function registerChat(chat) {
  chatById.set(chat.id, chat);
  return chat;
}

function makeGenericChat() {
  const id = `c_${Math.random().toString(16).slice(2)}`;
  return registerChat({
    id,
    kind: "generic",
    name: formatDisplayName(pick(romanianNames)),
    preview: nextGeneralPreview(),
    time: pick(timeOptions),
    badge: "99+",
    avatarSrc: nextGeneralAvatar(),
  });
}

function makeSpecialChat(kind) {
  if (kind === "hex") {
    return registerChat({
      id: "hex",
      kind: "hex",
      name: HEX_HOUSE_NAME,
      preview: "Celebrate Spring the Romanian way!",
      time: "12:30 PM",
      badge: "1",
      avatarSrc: FIXED_AVATARS.hex,
    });
  }

  if (kind === "art") {
    return registerChat({
      id: "art",
      kind: "art",
      name: ART_DETAILS_NAME,
      preview: "Concept sketch + process notes",
      time: "12:29 PM",
      badge: "1",
      avatarSrc: FIXED_AVATARS.art,
    });
  }

  // history
  return registerChat({
    id: "history",
    kind: "history",
    name: MARTISOR_HISTORY_NAME,
    preview: "Origins + legends + tradition",
    time: "12:28 PM",
    badge: "1",
    avatarSrc: FIXED_AVATARS.history,
  });
}

function clearChatList() {
  chatById.clear();
  chatList.innerHTML = "";
}

function addRowToList(chat, { prepend = false } = {}) {
  const row = createChatRow(chat);
  if (prepend) chatList.prepend(row);
  else chatList.appendChild(row);

  // animate in
  requestAnimationFrame(() => row.classList.add("is-entered"));
  return row;
}

/* -----------------------------
   Intro animation (slower + sporadic)
------------------------------ */
async function playIntroFlood() {
  const token = runToken;

  // A few existing chats already on screen
  for (let i = 0; i < 10; i += 1) {
    const c = makeGenericChat();
    const row = createChatRow(c);
    row.classList.remove("is-entering");
    row.classList.add("is-entered");
    chatList.appendChild(row);
  }

  // Now animate 5 new chats at the very top:
  // (generic, generic, history, art, hex)
  const incoming = [
    makeGenericChat(),
    makeGenericChat(),
    makeSpecialChat("history"),
    makeSpecialChat("art"),
    makeSpecialChat("hex"),
  ];

  let lastRow = null;

  for (let i = 0; i < incoming.length; i += 1) {
    // slower + irregular timing
    await sleep(randInt(900, 1700));
    if (!guardToken(token)) return;

    const row = addRowToList(incoming[i], { prepend: true });
    lastRow = row;
  }

  // Auto-open Hex House (the one at the very top)
  await sleep(420);
  if (!guardToken(token)) return;

  if (lastRow) lastRow.classList.add("is-selected");
  await sleep(680);
  if (!guardToken(token)) return;

  if (!hasPlayedHexThread) {
    hasPlayedHexThread = true;
    openChat("hex", { autoplay: true });
  }
}

/* -----------------------------
   Message rendering helpers
------------------------------ */
function clearDynamicMessages() {
  dynamicMount.innerHTML = "";
  dynamicMount.dataset.thread = "";
}

function createIncomingTextMsg({ html, timeText = "" }) {
  const msg = document.createElement("div");
  msg.className = "msg msg--incoming";
  msg.innerHTML = `
    <div class="bubble bubble--incoming">
      <div class="bubble__text" spellcheck="false"></div>
      <div class="bubble__meta">
        <span class="bubble__time" spellcheck="false">${timeText}</span>
      </div>
    </div>
  `;
  msg.querySelector(".bubble__text").innerHTML = html;
  return msg;
}

function createIncomingImageMsg({ src, caption = "", timeText = "" }) {
  const msg = document.createElement("div");
  msg.className = "msg msg--incoming";
  msg.innerHTML = `
    <div class="bubble bubble--incoming">
      <div class="photo">
        <img src="${src}" alt="" />
        <div class="photo__missing" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5 11 16.01l3.5-4.5L19 18H5l3.5-4.5Z"/></svg>
        </div>
      </div>
      ${caption ? `<div class="bubble__caption" spellcheck="false">${caption}</div>` : ""}
      <div class="bubble__meta">
        <span class="bubble__time" spellcheck="false">${timeText}</span>
      </div>
    </div>
  `;

  // missing file handling
  const photo = msg.querySelector(".photo");
  const img = msg.querySelector(".photo img");
  img.addEventListener(
    "error",
    () => photo.classList.add("is-missing"),
    { once: true },
  );

  return msg;
}

function appendMsg(msgEl) {
  dynamicMount.appendChild(msgEl);
  scrollChatToBottom();
  return msgEl;
}

function appendIncomingText(html, opts = {}) {
  return appendMsg(createIncomingTextMsg({ html, timeText: opts.timeText || "" }));
}

function appendIncomingImage(src, opts = {}) {
  return appendMsg(
    createIncomingImageMsg({
      src,
      caption: opts.caption || "",
      timeText: opts.timeText || "",
    }),
  );
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

async function showTyping(token, { minMs = 900, maxMs = 1900 } = {}) {
  const typingEl = createTypingMsg();
  dynamicMount.appendChild(typingEl);
  chatStatusEl.textContent = "typing…";
  scrollChatToBottom();

  await sleep(randInt(minMs, maxMs));
  if (!guardToken(token)) return false;

  typingEl.remove();
  chatStatusEl.textContent = "online";
  scrollChatToBottom();
  return true;
}

async function sporadicPause(token, { minMs = 140, maxMs = 760 } = {}) {
  await sleep(randInt(minMs, maxMs));
  return guardToken(token);
}

/* -----------------------------
   Asset existence helpers (for optional gif)
------------------------------ */
function imageExists(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function resolveFirstAvailableImage(token, candidates) {
  for (const src of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await imageExists(src);
    if (!guardToken(token)) return null;
    if (ok) return src;
  }
  return null;
}

/* -----------------------------
   Thread players
------------------------------ */
async function playHexHouseThread(token) {
  hasPlayedHexThread = true;
  dynamicMount.dataset.thread = "hex";
  clearDynamicMessages();

  // First message can appear quickly, then sporadic typing.
  await sporadicPause(token, { minMs: 120, maxMs: 420 });
  if (!guardToken(token)) return;

  appendIncomingText(HEX_SEQUENCE[0].html, { timeText: HEX_SEQUENCE[0].time });

  for (let i = 1; i < HEX_SEQUENCE.length; i += 1) {
    // typing + irregular delays
    // eslint-disable-next-line no-await-in-loop
    const ok = await showTyping(token);
    if (!ok) return;

    appendIncomingText(HEX_SEQUENCE[i].html, { timeText: HEX_SEQUENCE[i].time });

    // eslint-disable-next-line no-await-in-loop
    const still = await sporadicPause(token);
    if (!still) return;
  }

  // RSVP message (Tally popup)
  const ok = await showTyping(token, { minMs: 700, maxMs: 1400 });
  if (!ok) return;

  const rsvpMsg = document.createElement("div");
  rsvpMsg.className = "msg msg--incoming";
  rsvpMsg.innerHTML = `
    <div class="bubble bubble--incoming">
      <div class="bubble__text" spellcheck="false">
        <a
          class="rsvp-link"
          href="#tally-open=${TALLY_POPUP_ID}&tally-emoji-text=${TALLY_EMOJI_TEXT_ENCODED}&tally-emoji-animation=${TALLY_EMOJI_ANIMATION}"
          data-tally-open="${TALLY_POPUP_ID}"
          data-tally-emoji-text="${TALLY_EMOJI_TEXT}"
          data-tally-emoji-animation="${TALLY_EMOJI_ANIMATION}"
        >Click to RSVP:</a>
      </div>
      <div class="bubble__meta">
        <span class="bubble__time" spellcheck="false">12:37</span>
      </div>
    </div>
  `;
  appendMsg(rsvpMsg);

  // If Tally exposes a loader for dynamically added elements, call it (safe/no-op otherwise).
  try {
    if (window.Tally && typeof window.Tally.loadEmbeds === "function") {
      window.Tally.loadEmbeds();
    }
  } catch {
    // ignore
  }
}

async function playArtDetailsThread(token) {
  dynamicMount.dataset.thread = "art";
  clearDynamicMessages();

  // Concept sketch image
  const conceptSrc = await resolveFirstAvailableImage(
    token,
    ART_DETAILS_SEQUENCE.conceptImageCandidates,
  );
  if (!guardToken(token)) return;

  await sporadicPause(token, { minMs: 180, maxMs: 520 });
  if (!guardToken(token)) return;

  if (conceptSrc) {
    appendIncomingImage(conceptSrc, { timeText: "" });
  } else {
    appendIncomingText("<em>(concept sketch image not found)</em>", { timeText: "" });
  }

  // Text lines
  for (const line of ART_DETAILS_SEQUENCE.lines) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await showTyping(token);
    if (!ok) return;

    appendIncomingText(line, { timeText: "" });

    // eslint-disable-next-line no-await-in-loop
    const still = await sporadicPause(token);
    if (!still) return;
  }

  // Optional scans gif (only if present)
  const gifSrc = await resolveFirstAvailableImage(
    token,
    ART_DETAILS_SEQUENCE.scansGifCandidates,
  );
  if (!guardToken(token)) return;

  if (gifSrc) {
    const ok = await showTyping(token, { minMs: 700, maxMs: 1400 });
    if (!ok) return;
    appendIncomingImage(gifSrc, { timeText: "" });
  }
}

async function playMartisorHistoryThread(token) {
  dynamicMount.dataset.thread = "history";
  clearDynamicMessages();

  // A small pause so it feels like the chat "loads"
  await sporadicPause(token, { minMs: 180, maxMs: 600 });
  if (!guardToken(token)) return;

  for (const line of MARTISOR_HISTORY_LINES) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await showTyping(token, { minMs: 800, maxMs: 1700 });
    if (!ok) return;

    appendIncomingText(line, { timeText: "" });

    // eslint-disable-next-line no-await-in-loop
    const still = await sporadicPause(token, { minMs: 120, maxMs: 520 });
    if (!still) return;
  }
}

/* -----------------------------
   Chat open/close
------------------------------ */
function setChatHeader({ name, avatarSrc }) {
  chatNameEl.textContent = name;
  chatStatusEl.textContent = "online";

  chatAvatarEl.classList.remove("is-missing");
  chatAvatarImg.src = avatarSrc;
  chatAvatarImg.onerror = () => chatAvatarEl.classList.add("is-missing");
}

function openChat(chatId, { autoplay = false } = {}) {
  const chat = chatById.get(chatId);
  if (!chat) return;

  // cancel any in-flight animation and start a new one
  runToken += 1;
  const token = runToken;

  setChatHeader({ name: chat.name, avatarSrc: chat.avatarSrc });

  app.classList.add("show-chat");
  scrollChatToBottom();

  // Only special chats have animations.
  if (chat.kind === "hex") {
    if (autoplay) {
      playHexHouseThread(token);
    } else {
      // If user reopens Hex House, show it instantly if it already played once;
      // otherwise animate it.
      if (hasPlayedHexThread) {
        // Render instantly
        clearDynamicMessages();
        dynamicMount.dataset.thread = "hex";
        HEX_SEQUENCE.forEach((m) => appendIncomingText(m.html, { timeText: m.time }));
        // RSVP message (instant)
        const rsvpInstant = document.createElement("div");
        rsvpInstant.className = "msg msg--incoming";
        rsvpInstant.innerHTML = `
          <div class="bubble bubble--incoming">
            <div class="bubble__text" spellcheck="false">
              <a
          class="rsvp-link"
          href="#tally-open=${TALLY_POPUP_ID}&tally-emoji-text=${TALLY_EMOJI_TEXT_ENCODED}&tally-emoji-animation=${TALLY_EMOJI_ANIMATION}"
          data-tally-open="${TALLY_POPUP_ID}"
          data-tally-emoji-text="${TALLY_EMOJI_TEXT}"
          data-tally-emoji-animation="${TALLY_EMOJI_ANIMATION}"
        >Click to RSVP:</a>
            </div>
            <div class="bubble__meta">
              <span class="bubble__time" spellcheck="false">12:37</span>
            </div>
          </div>
        `;
        appendMsg(rsvpInstant);
        try {
          if (window.Tally && typeof window.Tally.loadEmbeds === "function") {
            window.Tally.loadEmbeds();
          }
        } catch {
          // ignore
        }
      } else {
        playHexHouseThread(token);
      }
    }
    return;
  }

  if (chat.kind === "art") {
    playArtDetailsThread(token);
    return;
  }

  if (chat.kind === "history") {
    playMartisorHistoryThread(token);
    return;
  }

  // Generic chat
  clearDynamicMessages();
  dynamicMount.dataset.thread = "generic";
  appendIncomingText("Happy Mărțișor!", { timeText: "" });
}

function closeChat() {
  // cancel in-flight sequence
  runToken += 1;
  app.classList.remove("show-chat");
}

backBtn.addEventListener("click", closeChat);

/* -----------------------------
   Replay
------------------------------ */
function resetExperience() {
  runToken += 1;
  hasPlayedHexThread = false;
  nextGeneralAvatar.reset();
  nextGeneralPreview.reset();

  closeChat();
  clearDynamicMessages();
  clearChatList();
  playIntroFlood();
}

if (replayBtn) {
  replayBtn.addEventListener("click", resetExperience);
}

/* -----------------------------
   Init
------------------------------ */
startClock();
resetExperience();
