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
// ---------------------------
//  SKIN REGISTERY DATA 
// ---------------------------
let registeredPublicSkins = [];
let registeredUserOnlySkins = [];
let registryLoaded = false;

// ---------------------------
// Validated Skins
// ---------------------------

let validPublicSkins = [];
let validUserOnlySkins = [];

const REQUIRED_SKIN_FILES = [
  "idle.gif",
  "away.gif",
  "left.gif",
  "right.gif",
  "lurk.gif",
  "poof.gif"
];

// File Existence Checker
async function fileExists(path) {
  try {
    const response = await fetch(path, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

// Skin Validator
async function validateSkin(skinName) {
  for (const file of REQUIRED_SKIN_FILES) {
    const path = `assets/${skinName}/${file}`;
    const exists = await fileExists(path);

    if (!exists) {
      console.warn(`Skin "${skinName}" missing file: ${file}`);
      return false;
    }
  }

  return true;
}

// Validate All Registered Skins
async function validateAllSkins() {
  validPublicSkins = [];
  validUserOnlySkins = [];

  // Validate public skins
  for (const skin of registeredPublicSkins) {
    const isValid = await validateSkin(skin);
    if (isValid) {
      validPublicSkins.push(skin);
    } else {
      console.warn(`Public skin "${skin}" rejected.`);
    }
  }

  // Validate user-only skins
  for (const skin of registeredUserOnlySkins) {
    const isValid = await validateSkin(skin);
    if (isValid) {
      validUserOnlySkins.push(skin);
    } else {
      console.warn(`User-only skin "${skin}" rejected.`);
    }
  }

  console.log("Valid public skins:", validPublicSkins);
  console.log("Valid user-only skins:", validUserOnlySkins);
}


// ---------------------------
// GLOBAL STATE 
// ---------------------------
const activeUsers = {};
const userIdleTimers = {};
const userRemovalTimers = {};
const userStates = {}; // "active" | "idle" | "lurking"
let userSkins = {};

// ---------------------------
//  REGISTRY LOADER 
// ---------------------------
async function loadSkinRegistry() {
  try {
    const response = await fetch("assets/skins.txt");

    if (!response.ok) {
      console.warn("Could not load skins.txt");
      return;
    }

    const text = await response.text();

    const lines = text.split("\n");

    registeredPublicSkins = [];
    registeredUserOnlySkins = [];

    lines.forEach(line => {
      const trimmed = line.trim().toLowerCase();

      // Ignore blank lines and comments
      if (!trimmed || trimmed.startsWith("#")) return;

      // User-only skins start with @
      if (trimmed.startsWith("@")) {
        const username = trimmed.substring(1);
        if (username) {
          registeredUserOnlySkins.push(username);
        }
      } else {
        registeredPublicSkins.push(trimmed);
      }
    });

    registryLoaded = true;

    console.log("Skin registry loaded.");
    console.log("Registered public skins:", registeredPublicSkins);
    console.log("Registered user-only skins:", registeredUserOnlySkins);

// Now validate them
await validateAllSkins();

  } catch (error) {
    console.error("Error loading skin registry:", error);
  }
}
// ---------------------------
// Skin Assignment Helper
// ---------------------------
function assignInitialSkin(usernameKey) {
  // User-only skin match
  if (validUserOnlySkins.includes(usernameKey)) {
    console.log(`User "${usernameKey}" assigned user-only skin.`);
    return usernameKey;
  }

  // Default fallback
  if (validPublicSkins.includes("default")) {
    return "default";
  }

  console.warn("No valid default skin found. User will have no skin.");
  return null;
}


// ---------------------------
//  Z-INDEX MANAGEMENT 
// ---------------------------
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


// ---------------------------
//  TIMEOUT CONFIG 
// ---------------------------
const IDLE_TIMEOUT_MS   = 600000;
const REMOVE_TIMEOUT_MS = 1200000;

// ---------------------------
//  CHAT MESSAGE HANDLER 
// ---------------------------
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
  
  // Assign skin
  const assignedSkin = assignInitialSkin(usernameKey);
  userSkins[usernameKey] = assignedSkin;
  console.log(`Skin for ${usernameKey}:`, assignedSkin);
  
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
  emojiDiv.src = getUserAsset(usernameKey, "idle");

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
    startWandering(userDiv, usernameKey);
  }, 1600);
}

// ==========================================================
// ========== WANDERING LOGIC ================================
// ==========================================================

function startWandering(element, usernameKey) {
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
        img.src = getUserAsset(usernameKey, "idle");
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
  if (img) img.src = getUserAsset(usernameKey, "idle");

  updateUserZIndex(usernameKey);
  startWandering(userDiv, usernameKey);

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
// ========== FINAL CALLS ================================
// ==========================================================
loadSkinRegistry();

//----------------------------------
// Asset Resolver
//----------------------------------
function getUserAsset(usernameKey, animationName) {
  const skin = userSkins[usernameKey];

  if (!skin) {
    console.warn(`No skin assigned for ${usernameKey}`);
    return null;
  }

  return `assets/${skin}/${animationName}.gif`;
}

// ==========================================================
// ========== VERSION LABEL =================================
// ==========================================================

const VERSION_LABEL = "js v0.07";
const testDropBtn = document.getElementById("test-drop-btn");
if (testDropBtn && !testDropBtn.textContent.includes(VERSION_LABEL)) {
  testDropBtn.textContent += ` ${VERSION_LABEL}`;
}
