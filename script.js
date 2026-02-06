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
  channels: ['thesleepyfox'] // change if needed
});

client.connect();


// ==========================================================
// ========== GLOBAL STATE =================================
// ==========================================================

const activeUsers = {}; // usernameKey -> userDiv
const userTimers  = {}; // usernameKey -> timeout ID
const userStates  = {}; // usernameKey -> "active" | "idle" | "lurking"


// ==========================================================
// ========== CHAT MESSAGE HANDLER ===========================
// ==========================================================

client.on('message', (channel, tags, message, self) => {
  if (self) return;

  const username = tags['display-name'] || tags.username;
  const usernameKey = username.toLowerCase();

  // Spawn user if missing
  if (!activeUsers[usernameKey]) {
    dropUser(username);
  }

  // ---- !lurk command ------------------------------------
  if (message.trim().toLowerCase() === "!lurk") {
    setUserLurking(usernameKey);
    return; // lurk message does nothing else
  }

  const userDiv = activeUsers[usernameKey];

  // Speech bubble
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

  resetIdleTimer(usernameKey);

  // Drop-in animation
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
// ========== IDLE / AWAY / LURK LOGIC =======================
// ==========================================================

const IDLE_TIMEOUT_MS = 30 * 1000;

function resetIdleTimer(usernameKey) {
  clearTimeout(userTimers[usernameKey]);

  if (userStates[usernameKey] === "idle" || userStates[usernameKey] === "lurking") {
    wakeUserUp(usernameKey);
  }

  userTimers[usernameKey] = setTimeout(() => {
    setUserIdle(usernameKey);
  }, IDLE_TIMEOUT_MS);
}

function setUserIdle(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  userStates[usernameKey] = "idle";
  userDiv._isWandering = false;

  const img = userDiv.querySelector(".join-emoji");
  if (img) img.src = "assets/away.gif";
}

function setUserLurking(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  userStates[usernameKey] = "lurking";
  userDiv._isWandering = false;

  clearTimeout(userTimers[usernameKey]);

  const img = userDiv.querySelector(".join-emoji");
  if (img) img.src = "assets/lurk.gif";
}

function wakeUserUp(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  userStates[usernameKey] = "active";

  const img = userDiv.querySelector(".join-emoji");
  if (img) img.src = "assets/idle.gif";

  startWandering(userDiv);
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

const VERSION_LABEL = "js v0.01";

const testDropBtn = document.getElementById("test-drop-btn");
if (testDropBtn && !testDropBtn.textContent.includes(VERSION_LABEL)) {
  testDropBtn.textContent += ` ${VERSION_LABEL}`;
}
