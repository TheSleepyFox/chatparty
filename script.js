/************************************************************
 * TWITCH CHAT OVERLAY – WANDERING CHAT AVATARS
 * js v0.01
 ************************************************************/

// ---------------------------
// CHANNEL RESOLUTION
// ---------------------------

// Get channel from URL query (?channelName)
const urlChannel = window.location.search
  .replace("?", "")
  .trim()
  .toLowerCase();

// Fallback channel if none provided
const CHANNEL_NAME = urlChannel || "thesleepyfox";

console.log("Connecting to channel:", CHANNEL_NAME);

// ---------------------------
//  TWITCH CHAT CLIENT SETUP 
// ---------------------------

const client = new tmi.Client({
  connection: { secure: true, reconnect: true },
  channels: [CHANNEL_NAME]
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
const userColors = {};

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
  active: 10,
  lurking: 20,
  idle: 30,
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
// COMMAND REGISTRY
// ---------------------------

const commandRegistry = [
  {
    triggers: ["lurk", "brb", "afk"],
    action: (usernameKey) => setUserLurking(usernameKey)
  },
  {
    triggers: ["leave", "bye"],
    action: (usernameKey) => removeUser(usernameKey)
  },
  {
    triggers: ["sleep", "away"],
    action: (usernameKey) => setUserIdle(usernameKey)
  }
];

// ---------------------------
// COMMAND PROCESSOR
// ---------------------------
function processChatCommands(message, usernameKey) {
  const msg = message.toLowerCase();

  for (const command of commandRegistry) {
    for (const trigger of command.triggers) {

      const regex = new RegExp(`\\!${trigger}\\b`);

      if (regex.test(msg)) {
        command.action(usernameKey);
        return true;
      }

    }
  }

  return false;
}

function processChatCommands(message, usernameKey) {
  const msg = message.toLowerCase();

  for (const command of commandRegistry) {
    for (const trigger of command.triggers) {

      const regex = new RegExp(`\\!${trigger}\\b`);

      if (regex.test(msg)) {
        command.action(usernameKey);
        return true;
      }

    }
  }

  return false;
}
// ---------------------------
//  CHAT MESSAGE HANDLER 
// ---------------------------
client.on('message', (channel, tags, message, self) => {
  if (self) return;

  const username = tags['display-name'] || tags.username;
  const usernameKey = username.toLowerCase();
  const twitchColor = tags.color;
  
  if (twitchColor) {
    userColors[usernameKey] = twitchColor;
  }
  
  if (!activeUsers[usernameKey]) {
    dropUser(username);
  }

  // Process built-in commands
  if (processChatCommands(message, usernameKey)) {
    return;
  }

  // Skin command (e.g. !red anywhere in message)
  const msg = message.toLowerCase();
  const skinMatch = msg.match(/\!(\w+)/);

  if (skinMatch) {
    const requestedSkin = skinMatch[1];

    // Ignore commands already handled by registry
    const reservedCommands = commandRegistry.flatMap(c => c.triggers);

    if (!reservedCommands.includes(requestedSkin)) {
      handleSkinCommand(usernameKey, requestedSkin);
      return;
    }
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
// ---------------------------
//  USER JOIN HANDLER 
// ---------------------------

client.on('join', (channel, username, self) => {
  if (self) return;

  const usernameKey = username.toLowerCase();
  if (activeUsers[usernameKey]) return;

  dropUser(username);
});

// ---------------------------
// COLOUR HELPERS
// ---------------------------
function applyUserColorFilter(img, usernameKey) {
  const skin = userSkins[usernameKey];
  if (skin !== "default") {
    img.style.filter = "";
    return;
  }

  const color = userColors[usernameKey];
  if (!color) {
    img.style.filter = "";
    return;
  }

  img.style.filter = twitchColorToFilter(color);
}

//Convert Twitch hex → CSS filter
function twitchColorToFilter(hex) {
  // Convert hex to approximate hue rotation
  // This keeps luminance & animation intact
  const rgb = hex.replace("#", "");
  const r = parseInt(rgb.substring(0,2), 16);
  const g = parseInt(rgb.substring(2,4), 16);
  const b = parseInt(rgb.substring(4,6), 16);

  const avg = (r + g + b) / 3;
  const brightness = avg / 128;

  return `
    brightness(${brightness})
    sepia(1)
    hue-rotate(${rgbToHue(r, g, b)}deg)
    saturate(4)
  `;
}

function rgbToHue(r, g, b) {
  const max = Math.max(r,g,b);
  const min = Math.min(r,g,b);
  let hue = 0;

  if (max === min) hue = 0;
  else if (max === r) hue = (60 * ((g - b) / (max - min)) + 360) % 360;
  else if (max === g) hue = 60 * ((b - r) / (max - min)) + 120;
  else hue = 60 * ((r - g) / (max - min)) + 240;

  return Math.round(hue);
}

// ---------------------------
//  USER SPAWN 
// ---------------------------
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
  applyUserColorFilter(emojiDiv, usernameKey);

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
  
    // Only start wandering if the user is still active
    if (userStates[usernameKey] === "active") {
      startWandering(userDiv, usernameKey);
    }
  }, 1600);
}

// ---------------------------
//  WANDERING LOGIC 
// ---------------------------

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

    img.src = direction === -1
      ? getUserAsset(usernameKey, "left")
      : getUserAsset(usernameKey, "right");

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


// ---------------------------
//  STATE LOGIC 
// ---------------------------

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
  if (img) img.src = getUserAsset(usernameKey, "away");

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
  if (img) img.src = getUserAsset(usernameKey, "lurk");

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


// ---------------------------
//  REMOVAL + POOF EFFECT 
// ---------------------------

function removeUser(usernameKey) {
  if (userStates[usernameKey] === "lurking") return;

  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  spawnPoofAtUser(userDiv, usernameKey);

  userDiv.remove();

  clearTimeout(userIdleTimers[usernameKey]);
  clearTimeout(userRemovalTimers[usernameKey]);

  delete activeUsers[usernameKey];
  delete userIdleTimers[usernameKey];
  delete userRemovalTimers[usernameKey];
  delete userStates[usernameKey];
}

function spawnPoofAtUser(userDiv, usernameKey) {
  const container = document.getElementById("join-container");
  if (!container) return;

  const rect = userDiv.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const poof = document.createElement("img");
  poof.className = "join-emoji";
  poof.src = `${getUserAsset(usernameKey, "poof")}?${Date.now()}`;
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

// ---------------------------
//  Handling public Skins
// ---------------------------
function handleSkinCommand(usernameKey, skinName) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  // Only allow validated public skins
  if (!validPublicSkins.includes(skinName)) {
    console.log(`Skin "${skinName}" is not a valid public skin.`);
    return;
  }

  // Assign new skin
  userSkins[usernameKey] = skinName;

  console.log(`${usernameKey} switched to skin: ${skinName}`);

  refreshUserAppearance(usernameKey);
}

function refreshUserAppearance(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  const img = userDiv.querySelector(".join-emoji");
  if (!img) return;

  const state = userStates[usernameKey];

  applyUserColorFilter(img, usernameKey);
  
  switch (state) {
    case "idle":
      img.src = getUserAsset(usernameKey, "away");
      break;

    case "lurking":
      img.src = getUserAsset(usernameKey, "lurk");
      break;

    case "active":
    default:
      img.src = getUserAsset(usernameKey, "idle");
      break;
  }
}

// ---------------------------
//  DEV TEST BUTTON 
// ---------------------------

function testDrop() {
  const testUser = "TestUser" + Math.floor(Math.random() * 1000);
  dropUser(testUser);
}

// ---------------------------
//  FINAL CALLS 
// ---------------------------
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

