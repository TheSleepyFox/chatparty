// ========== Twitch Chat Setup ==========
const client = new tmi.Client({
  connection: { secure: true, reconnect: true },
  channels: ['thesleepyfox'] // replace with your Twitch channel name
});

client.connect();

const userEmojis = {};
const activeUsers = {};

const userTimers = {}; // usernameKey -> timeout ID
const userStates = {}; // usernameKey -> 'active' or 'idle'

// ========== Handle Chat Messages ==========
client.on('message', (channel, tags, message, self) => {
  if (self) return;

  const username = tags['display-name'] || tags.username;
  const usernameKey = username.toLowerCase();

  // Drop the user if not yet active
  if (!activeUsers[usernameKey]) {
    const emoji = userEmojis[usernameKey] || "✨";
    dropUser(username, emoji);
  }

  // ✅ SPEECH BUBBLE LOGIC
  const userDiv = activeUsers[usernameKey];
  if (userDiv) {
    const bubble = userDiv.querySelector(".speech-bubble");
    if (bubble) {
      bubble.textContent = message;
      bubble.style.display = "block";
      bubble.style.opacity = "1";

      console.log(`[Speech] ${username} says: ${message}`);

      setTimeout(() => {
        bubble.style.opacity = "0";
      }, 3000);
    }
  }

  // !emoji command support
  if (message.startsWith('!emoji ')) {
    const newEmoji = message.split(' ')[1];
    if (newEmoji && newEmoji.length <= 2) {
      userEmojis[usernameKey] = newEmoji;
      const userDiv = activeUsers[usernameKey];
      if (userDiv) {
        const emojiImg = userDiv.querySelector(".join-emoji");
        if (emojiImg) {
          emojiImg.alt = newEmoji;
        }
      }
    }
  }
});

// ========== Handle User Join ==========
client.on('join', (channel, username, self) => {
  if (self) return;

  const usernameKey = username.toLowerCase();
  if (activeUsers[usernameKey]) return; // Don't duplicate

  const emoji = userEmojis[usernameKey] || "✨";
  dropUser(username, emoji);
});

// ========== Drop User Emoji ==========
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
  usernameDiv.style.color = "#00FFFF"; // Optional: tags.color

  const emojiDiv = document.createElement("img");
  emojiDiv.className = "join-emoji";
  emojiDiv.src = "assets/idle.gif"; // default to idle gif
  emojiDiv.alt = emoji; // optional: fallback emoji

  const speechBubble = document.createElement("div");
  speechBubble.className = "speech-bubble";
  speechBubble.textContent = ""; // Will be filled on message
  speechBubble.style.display = "none";

  userDiv.appendChild(usernameDiv);
  userDiv.appendChild(emojiDiv);
  userDiv.appendChild(speechBubble);
  container.appendChild(userDiv);

  activeUsers[usernameKey] = userDiv;

  resetIdleTimer(usernameKey);

  // Fall animation
  userDiv.style.animation = "fall 1.6s ease-out forwards";

  // Start wandering after landing
  setTimeout(() => {
  userDiv.style.animation = "";

  if (userStates[usernameKey] !== "idle") {
    startWandering(userDiv);
  }
}, 1600);
}

// ========== Wandering With Random Steps and Pauses ==========
function startWandering(element) {
  let pos = parseFloat(element.style.left || "50");
  const img = element.querySelector(".join-emoji");

  function step() {
    const direction = Math.random() < 0.5 ? -1 : 1;
    const distance = 5 + Math.random() * 10; // 5–15%
    const duration = 1000 + Math.random() * 1000;
    const pauseDuration = 500 + Math.random() * 1500;

    const start = Date.now();
    const startPos = pos;
    const endPos = Math.max(0, Math.min(95, startPos + direction * distance));

    // Update gif for movement direction
    img.src = direction === -1 ? "assets/left.gif" : "assets/right.gif";

    function move() {
      const now = Date.now();
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);

      pos = startPos + (endPos - startPos) * t;
      element.style.left = `${pos}%`;

      if (t < 1) {
        requestAnimationFrame(move);
      } else {
        // Switch to idle gif while pausing
        img.src = "assets/idle.gif";
        setTimeout(step, pauseDuration);
      }
    }

    move();
  }

  step();
}

// ========== Test Drop Button Function ==========
function testDrop() {
  const testUser = "TestUser" + Math.floor(Math.random() * 1000);
  const emoji = ["🦊", "🐸", "🦄", "🐱", "👾", "🌟", "🐢", "🍕"][Math.floor(Math.random() * 8)];
  userEmojis[testUser.toLowerCase()] = emoji;
  dropUser(testUser, emoji);
}

// ========== Idle Timer Function ==========
function resetIdleTimer(usernameKey) {
  clearTimeout(userTimers[usernameKey]);

  // Wake them if they were idle
  if (userStates[usernameKey] === "idle") {
    wakeUserUp(usernameKey);
  }

  // Set idle after 30 seconds of inactivity
  userTimers[usernameKey] = setTimeout(() => {
    setUserIdle(usernameKey);
  }, 30000);
}

// ========== Away Function ==========
function setUserIdle(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  userStates[usernameKey] = "idle";

  const emojiImg = userDiv.querySelector(".join-emoji");
  if (emojiImg) {
    emojiImg.src = "assets/away.gif";
  }

  if (userDiv._wanderingFrame) {
    cancelAnimationFrame(userDiv._wanderingFrame);
    userDiv._wanderingFrame = null;
  }
}

function wakeUserUp(usernameKey) {
  const userDiv = activeUsers[usernameKey];
  if (!userDiv) return;

  const emojiImg = userDiv.querySelector(".join-emoji");
  if (emojiImg) {
    emojiImg.src = "assets/idle.gif";
  }

  if (!userDiv._wanderingFrame) {
    startWandering(userDiv);
  }

  userStates[usernameKey] = "active";
}