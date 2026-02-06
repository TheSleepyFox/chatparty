/************************************************************
 * TWITCH CHAT OVERLAY – WANDERING CHAT AVATARS
 * js v0.01
 ************************************************************/


// ==========================================================
// ========== TWITCH CHAT CLIENT SETUP ======================
// ==========================================================

const client = new tmi.Client({
  connection: {
    secure: true,
    reconnect: true
  },
  channels: ['thesleepyfox']
});

client.connect();


// ==========================================================
// ========== GLOBAL STATE =================================
// ==========================================================

const activeUsers = {};         // usernameKey -> userDiv
const userTimers = {};          // idle timers
const userRemovalTimers = {};   // removal timers
const userStates = {};          // "active" | "idle" | "lurking"


// ==========================================================
// ========== Z-INDEX MANAGEMENT =============================
// ==========================================================

const Z_INDEX = {
  active: 30,
  lurking: 20,
  idle: 10
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

const IDLE_TIMEOUT_MS   = 30 * 1000; // 30 seconds
const REMOVE_TIMEOUT_MS = 60 * 1000; // 60 seconds


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

  // ---- !lurk command ------------------------------------
  if (message.trim().toLowerCase() === "!lurk") {
    setUserLurking(usernameKey);
    resetRemovalTimer(usernameKey);
    return;
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

function dropUser(username) {
  const usernameKey = username.toLowerCase();
  const container = document.getElementById("join-container");
  if (!container) return;

  const userDiv = document.createElement("div");
  userDiv.className = "user-container";
  userDiv.style.position = "absolute";
  userDiv.style.top = "-100px";
  userDiv.style.left = `${Math.random() * 90}%`;

  const usernameDiv = document.createElement("div");
  usernameDiv.className = "join-username";
  usernameDiv.textContent = username;
  usernameDiv.style.color = "#00FFFF";

  const avatarImg = document.createElement("img");
  avatarImg.className = "join-emoji";
  avatarImg.src = "assets/idle.gif";

  const speechBubble = document.createElement("div");
  speechBubble.className = "speech-bubble";
  speechBubble.style.display = "none";

  userDiv.append(usernameDiv, avatarImg, speechBubble);
  container.appendChild(userDiv);

  activeUsers[usernameKey] = userDiv;
  userStates[usernameKey] = "active";

  updateUserZIndex(usernameKey);
  resetIdleTimer(usernameKey);
  resetRemovalTimer(usernameKey);

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
    const pauseDuration = 500 + Math.random() * 1500;

    const startTime = Date.now();
    const startPos = pos;
    const endPos = Math.max(0, Math.min(95, startPos + direction * distance));

    img.src = direction === -1 ? "assets/left.gif" : "assets/right.gif";

    function move() {
      if (!element._isWandering) return;

      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      pos = startPos + (endPos - startPos) * t;
      element.style.left = `${pos}%`;

      if (t < 1) {
        requestAnimationFrame(move);
      } else {
        img.src = "assets/idle.gif";
        setTimeout(step, pauseDuration);
      }
    }

    move();
  }

  step();
}


// ==========================================================
// ========== IDLE / LURK / REMOVE ==========================
// ==========================================================

function resetIdleTimer(usernameKey) {
  clearTimeout(userTimers[usernameKey]);

  if (userStates[usernameKey] !== "active") {
    wakeUserUp(usernameKey);
  }

  userTimers[usernameKey] = setTimeout(() => {
    setUserIdle(usernameKey);
  }, IDLE_TIMEOUT_MS);
}

function resetRemovalTimer(usernameKey) {
  clearTimeout(userRemovalTimers[usernameKey]);

  userRemovalTimers[usernameKey] = setTimeout(() => {
    removeUser(usernameKey);
  }, REMOVE_TIMEOUT_MS);
}

function setUserIdle(usernameKey) {
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
}

function removeUser(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  userDiv.remove();

  clearTimeout(userTimers[usernameKey]);
  clearTimeout(userRemovalTimers[usernameKey]);

  delete activeUsers[usernameKey];
  delete userTimers[usernameKey];
  delete userRemovalTimers[usernameKey];
  delete userStates[usernameKey];
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

const VERSION_LABEL = "js v0.05";

const testDropBtn = document.getElementById("test-drop-btn");
if (testDropBtn && !testDropBtn.textContent.includes(VERSION_LABEL)) {
  testDropBtn.textContent += ` ${VERSION_LABEL}`;
}
