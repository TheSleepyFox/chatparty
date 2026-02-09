/************************************************************
 * TWITCH CHAT OVERLAY – WANDERING CHAT AVATARS
 * js v0.01
 ************************************************************/


// ==========================================================
// ========== TWITCH CHAT CLIENT SETUP ======================
// ==========================================================

const client = new tmi.Client({
  connection: { secure: true, reconnect: true },
  channels: ['thesleepyfox']
});

client.connect();


// ==========================================================
// ========== GLOBAL STATE =================================
// ==========================================================

const activeUsers = {};
const userIdleTimers = {};
const userRemovalTimers = {};
const userStates = {}; // "active" | "idle" | "lurking"


// ==========================================================
// ========== Z-INDEX MANAGEMENT =============================
// ==========================================================

const Z_INDEX = {
  active: 30,
  lurking: 20,
  idle: 10,
  poof: 100
};

function updateUserZIndex(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  const state = userStates[usernameKey] || "active";
  userDiv.style.zIndex = Z_INDEX[state] ?? 10;
}


// ==========================================================
// ========== TIMEOUT CONFIG ================================
// ==========================================================

const IDLE_TIMEOUT_MS   = 600000;
const REMOVE_TIMEOUT_MS = 1200000;


// ==========================================================
// ========== CHAT MESSAGE HANDLER ===========================
// ==========================================================

client.on('message', (channel, tags, message, self) => {
  if (self) return;

  const username = tags['display-name'] || tags.username;
  const usernameKey = username.toLowerCase();

  if (!activeUsers[usernameKey]) {
    dropUser(username);
  }

  if (message.trim().toLowerCase() === "!lurk") {
    setUserLurking(usernameKey);
    return;
  }

  if (message.trim().toLowerCase() === "!leave") {
    removeUser(usernameKey);
    return;
  }

  if (message.trim().toLowerCase() === "!sleep") {
    setUserIdle(usernameKey)
    return;
  }

  if (userStates[usernameKey] !== "active") {
    wakeUserUp(usernameKey);
  }

  const userDiv = activeUsers[usernameKey];
  if (userDiv) {
    const bubble = userDiv.querySelector(".speech-bubble");
    if (bubble) {
      bubble.textContent = message;
      bubble.style.display = "block";
      bubble.style.opacity = "1";

      setTimeout(() => {
        bubble.style.opacity = "0";
      }, 3000);
    }
  }

  resetIdleTimer(usernameKey);
  resetRemovalTimer(usernameKey);
});


// ==========================================================
// ========== USER JOIN HANDLER ==============================
// ==========================================================

client.on('join', (channel, username, self) => {
  if (self) return;

  const usernameKey = username.toLowerCase();
  if (activeUsers[usernameKey]) return;

  dropUser(username);
});


// ==========================================================
// ========== USER SPAWN ====================================
// ==========================================================
function dropUser(username, emoji) {
  const usernameKey = username.toLowerCase();
  const container = document.getElementById("join-container");

  const userDiv = document.createElement("div");
  userDiv.className = "user-container";
  userDiv.style.position = "absolute";
  userDiv.style.top = "-100px";
  userDiv.style.left = `${Math.random() * 90}%`;

  const usernameDiv = document.createElement("div");
  usernameDiv.className = "join-username";
  usernameDiv.textContent = username;

  const emojiDiv = document.createElement("img");
  emojiDiv.className = "join-emoji";
  emojiDiv.src = "assets/idle.gif";

  const speechBubble = document.createElement("div");
  speechBubble.className = "speech-bubble";
  speechBubble.style.display = "none";

  userDiv.appendChild(usernameDiv);
  userDiv.appendChild(emojiDiv);
  userDiv.appendChild(speechBubble);
  container.appendChild(userDiv);

  activeUsers[usernameKey] = userDiv;
  userStates[usernameKey] = "active";

  // START BOTH TIMERS ON SPAWN
  resetIdleTimer(usernameKey);
  resetRemovalTimer(usernameKey);

  // Fall animation
  userDiv.style.animation = "fall 1.6s ease-out forwards";

  setTimeout(() => {
    userDiv.style.animation = "";
    startWandering(userDiv);
  }, 1600);
}

// ==========================================================
// ========== WANDERING LOGIC ================================
// ==========================================================

function startWandering(element) {
  if (element._isWandering) return;
  element._isWandering = true;

  let pos = parseFloat(element.style.left || "50");
  const img = element.querySelector(".join-emoji");

  function step() {
    if (!element._isWandering) return;

    const direction = Math.random() < 0.5 ? -1 : 1;
    const distance = 5 + Math.random() * 10;
    const duration = 1000 + Math.random() * 1000;
    const pause = 500 + Math.random() * 1500;

    const start = Date.now();
    const startPos = pos;
    const endPos = Math.max(0, Math.min(95, startPos + direction * distance));

    img.src = direction === -1 ? "assets/left.gif" : "assets/right.gif";

    function move() {
      if (!element._isWandering) return;

      const t = Math.min((Date.now() - start) / duration, 1);
      pos = startPos + (endPos - startPos) * t;
      element.style.left = `${pos}%`;

      if (t < 1) {
        requestAnimationFrame(move);
      } else {
        img.src = "assets/idle.gif";
        setTimeout(step, pause);
      }
    }

    move();
  }

  step();
}


// ==========================================================
// ========== STATE LOGIC ===================================
// ==========================================================

function resetIdleTimer(usernameKey) {
  if (userStates[usernameKey] === "lurking") return;

  clearTimeout(userIdleTimers[usernameKey]);

  userIdleTimers[usernameKey] = setTimeout(() => {
    setUserIdle(usernameKey);
  }, IDLE_TIMEOUT_MS);
}

function resetRemovalTimer(usernameKey) {
  if (userStates[usernameKey] === "lurking") return;

  clearTimeout(userRemovalTimers[usernameKey]);

  userRemovalTimers[usernameKey] = setTimeout(() => {
    removeUser(usernameKey);
  }, REMOVE_TIMEOUT_MS);
}

function setUserIdle(usernameKey) {
  if (userStates[usernameKey] === "lurking") return;

  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  userStates[usernameKey] = "idle";
  userDiv._isWandering = false;

  const img = userDiv.querySelector(".join-emoji");
  if (img) img.src = "assets/away.gif";

  updateUserZIndex(usernameKey);
}

function setUserLurking(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  clearTimeout(userIdleTimers[usernameKey]);
  clearTimeout(userRemovalTimers[usernameKey]);

  userStates[usernameKey] = "lurking";
  userDiv._isWandering = false;

  const img = userDiv.querySelector(".join-emoji");
  if (img) img.src = "assets/lurk.gif";

  updateUserZIndex(usernameKey);
}

function wakeUserUp(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  userStates[usernameKey] = "active";

  const img = userDiv.querySelector(".join-emoji");
  if (img) img.src = "assets/idle.gif";

  updateUserZIndex(usernameKey);
  startWandering(userDiv);

  // RESTART TIMERS
  resetIdleTimer(usernameKey);
  resetRemovalTimer(usernameKey);
}


// ==========================================================
// ========== REMOVAL + POOF EFFECT =========================
// ==========================================================

function removeUser(usernameKey) {
  if (userStates[usernameKey] === "lurking") return;

  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  spawnPoofAtUser(userDiv);

  userDiv.remove();

  clearTimeout(userIdleTimers[usernameKey]);
  clearTimeout(userRemovalTimers[usernameKey]);

  delete activeUsers[usernameKey];
  delete userIdleTimers[usernameKey];
  delete userRemovalTimers[usernameKey];
  delete userStates[usernameKey];
}

function spawnPoofAtUser(userDiv) {
  const container = document.getElementById("join-container");
  if (!container) return;

  const rect = userDiv.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const poof = document.createElement("img");
  poof.className = "join-emoji";
  poof.src = `assets/poof.gif?${Date.now()}`;
  poof.style.position = "absolute";
  poof.style.left = `${rect.left - containerRect.left}px`;
  poof.style.top = `${rect.top - containerRect.top}px`;
  poof.style.zIndex = Z_INDEX.poof;
  poof.style.pointerEvents = "none";

  container.appendChild(poof);

  setTimeout(() => {
    poof.remove();
  }, 1000);
}


// ==========================================================
// ========== DEV TEST BUTTON ================================
// ==========================================================

function testDrop() {
  const testUser = "TestUser" + Math.floor(Math.random() * 1000);
  dropUser(testUser);
}


// ==========================================================
// ========== VERSION LABEL =================================
// ==========================================================

const VERSION_LABEL = "js v0.07";
const testDropBtn = document.getElementById("test-drop-btn");
if (testDropBtn && !testDropBtn.textContent.includes(VERSION_LABEL)) {
  testDropBtn.textContent += ` ${VERSION_LABEL}`;
}
