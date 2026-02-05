// ==========================================================
// ========== UI VERSION LABEL ===============================
// ==========================================================

const VERSION_LABEL = "js v0.01";

const testDropBtn = document.getElementById("test-drop-btn");
if (testDropBtn && !testDropBtn.textContent.includes(VERSION_LABEL)) {
  testDropBtn.textContent += ` ${VERSION_LABEL}`;
}

// ==========================================================
// ========== TWITCH CHAT CLIENT SETUP ======================
// ==========================================================

const client = new tmi.Client({
  connection: {
    secure: true,
    reconnect: true
  },
  channels: ['thesleepyfox'] // Replace with your channel
});

client.connect();


// ==========================================================
// ========== GLOBAL STATE STORAGE ===========================
// ==========================================================

// Active user DOM references
const activeUsers = {}; // usernameKey -> userDiv

// Inactivity timers
const userTimers = {}; // usernameKey -> timeout ID

// Simple presence state
const userStates = {}; // usernameKey -> "active" | "idle"


// ==========================================================
// ========== CHAT MESSAGE HANDLER ===========================
// ==========================================================

client.on('message', (channel, tags, message, self) => {
  if (self) return;

  const username = tags['display-name'] || tags.username;
  const usernameKey = username.toLowerCase();

  // Spawn user if they are not already active
  if (!activeUsers[usernameKey]) {
    dropUser(username);
  }

  const userDiv = activeUsers[usernameKey];

  // --------------------------------------------------------
  // Speech bubble display
  // --------------------------------------------------------
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

  // Reset idle timer on activity
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
// ========== USER SPAWN / DROP-IN ===========================
// ==========================================================

function dropUser(username) {
  console.log("Dropped user:", username);
  const usernameKey = username.toLowerCase();
  const container = document.getElementById("join-container");

  // Root container for this avatar
  const userDiv = document.createElement("div");
  userDiv.className = "user-container";
  userDiv.style.position = "absolute";
  userDiv.style.top = "-100px"; // Start off-screen
  userDiv.style.left = `${Math.random() * 90}%`;

  // Username label
  const usernameDiv = document.createElement("div");
  usernameDiv.className = "join-username";
  usernameDiv.textContent = username;
  usernameDiv.style.color = "#00FFFF"; // Optional: tags.color

  // Avatar image (animated GIFs)
  const avatarImg = document.createElement("img");
  avatarImg.className = "join-emoji";
  avatarImg.src = "assets/idle.gif"; // Default idle animation

  // Speech bubble (hidden until user speaks)
  const speechBubble = document.createElement("div");
  speechBubble.className = "speech-bubble";
  speechBubble.style.display = "none";

  // Assemble DOM
  userDiv.append(usernameDiv, avatarImg, speechBubble);
  container.appendChild(userDiv);

  // Track user
  activeUsers[usernameKey] = userDiv;
  userStates[usernameKey] = "active";

  // Begin inactivity tracking
  resetIdleTimer(usernameKey);

  // --------------------------------------------------------
  // Drop-in animation
  // --------------------------------------------------------
  userDiv.style.animation = "fall 1.6s ease-out forwards";

  // Start wandering after landing
  setTimeout(() => {
    userDiv.style.animation = "";
    if (userStates[usernameKey] !== "idle") {
      startWandering(userDiv);
    }
  }, 1600);
}


// ==========================================================
// ========== RANDOM WANDERING BEHAVIOR ======================
// ==========================================================
function startWandering(element) {
  // Prevent multiple wandering loops
  if (element._isWandering) return;

  element._isWandering = true; // ✅ THIS WAS MISSING

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
// ========== DEV TEST HELPER ================================
// ==========================================================

function testDrop() {
  const testUser = "TestUser" + Math.floor(Math.random() * 1000);
  dropUser(testUser);
}


// ==========================================================
// ========== IDLE / AWAY LOGIC ==============================
// ==========================================================

function resetIdleTimer(usernameKey) {
  clearTimeout(userTimers[usernameKey]);

  // Wake user if they were idle
  if (userStates[usernameKey] === "idle") {
    wakeUserUp(usernameKey);
  }

  // Mark user idle after 30 seconds of inactivity
  userTimers[usernameKey] = setTimeout(() => {
    setUserIdle(usernameKey);
  }, 30000);
}

function setUserIdle(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  userStates[usernameKey] = "idle";
  userDiv._isWandering = false; // ✅ stops loop

  const img = userDiv.querySelector(".join-emoji");
  if (img) img.src = "assets/away.gif";
}


function wakeUserUp(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  userStates[usernameKey] = "active";

  const img = userDiv.querySelector(".join-emoji");
  if (img) img.src = "assets/idle.gif";

  startWandering(userDiv); // ✅ safe to call again
}

  startWandering(userDiv);
  userStates[usernameKey] = "active";
}
