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

  const color = normalizeHex(userColors[usernameKey]);

  // Twitch preset color skins
  if (color === "#8a2be2") {
    return "purple";
  }
  if (color === "#1e90ff") {
    return "dodger_blue";
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

     if (activeUsers[usernameKey]) {
      const newSkin = assignInitialSkin(usernameKey);
  
      if (newSkin && userSkins[usernameKey] !== newSkin) {
        userSkins[usernameKey] = newSkin;
        refreshUserAppearance(usernameKey);
      }
    }
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
const TWITCH_COLOR_HSL = {
  "#ff0000": { h: 0, s: 1, l: 0.5 },      // Red
  "#0000ff": { h: 240, s: 1, l: 0.5 },    // Blue
  "#008000": { h: 120, s: 1, l: 0.25 },   // Green
  "#b22222": { h: 0, s: 0.68, l: 0.41 },  // Firebrick
  "#ff7f50": { h: 16, s: 1, l: 0.66 },    // Coral
  "#9acd32": { h: 80, s: 0.61, l: 0.5 },  // YellowGreen
  "#ff4500": { h: 16, s: 1, l: 0.5 },     // OrangeRed
  "#2e8b57": { h: 146, s: 0.5, l: 0.36 }, // SeaGreen
  "#daa520": { h: 43, s: 0.74, l: 0.49 }, // GoldenRod
  "#d2691e": { h: 25, s: 0.75, l: 0.47 }, // Chocolate
  "#5f9ea0": { h: 182, s: 0.25, l: 0.5 }, // CadetBlue
  "#1e90ff": { h: 210, s: 1, l: 0.56 },   // DodgerBlue
  "#ff69b4": { h: 330, s: 1, l: 0.71 },   // HotPink
  "#8a2be2": { h: 271, s: 0.76, l: 0.53 },// BlueViolet
  "#00ff7f": { h: 150, s: 1, l: 0.5 }     // SpringGreen
};

function normalizeHex(hex) {
  if (!hex) return null;
  return hex.trim().toLowerCase();
}

function getHSLFromHex(hex) {
  const normalized = normalizeHex(hex);

  if (TWITCH_COLOR_HSL[normalized]) {
    return TWITCH_COLOR_HSL[normalized];
  }

  return hexToHSL(normalized);
}

function hexToHSL(hex) {
  let r = parseInt(hex.substr(1,2),16) / 255;
  let g = parseInt(hex.substr(3,2),16) / 255;
  let b = parseInt(hex.substr(5,2),16) / 255;

  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h *= 60;
  }

  return { h, s, l };
}

function applyUserColorFilter(img, usernameKey) {
  const skin = userSkins[usernameKey];
  if (skin !== "default") {
    img.style.filter = "";
    console.log("userColors[usernameKey]",usernameKey," ", userColors[usernameKey]);
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
  const { h, s, l } = getHSLFromHex(hex);
  const BASE_HUE = 60;

  let adjustedHue = h;

  if (h < 60) {
    adjustedHue = h * 0.75;
  }

  const rotate = adjustedHue - BASE_HUE;

  return `
    hue-rotate(${Math.round(rotate)}deg)
    saturate(${Math.max(1.6, s * 2)})
    brightness(${0.95 + l * 0.1})
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

