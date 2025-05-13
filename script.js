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
function startWandering(userDiv) {
  const usernameKey = Object.keys(activeUsers).find(
    key => activeUsers[key] === userDiv
  );

  // ✅ Prevent wandering if user is idle
  if (userStates[usernameKey] === "idle") return;

  let direction = Math.random() < 0.5 ? -1 : 1;
  let distance = Math.random() * 100 + 50; // pixels
  let speed = 0.5; // pixels per frame
  let moved = 0;

  const emojiImg = userDiv.querySelector(".join-emoji");
  if (emojiImg) {
    emojiImg.src = direction === -1 ? "assets/walking-left.gif" : "assets/walking-right.gif";
  }

  function step() {
    // ❗ Cancel if user became idle mid-wander
    if (userStates[usernameKey] === "idle") return;

    let currentLeft = parseFloat(userDiv.style.left || "0");
    let containerWidth = window.innerWidth;
    let elementWidth = userDiv.offsetWidth;

    currentLeft += direction * speed;
    moved += speed;

    // Boundaries
    if (currentLeft < 0) currentLeft = 0;
    if (currentLeft > containerWidth - elementWidth) {
      currentLeft = containerWidth - elementWidth;
      direction *= -1; // bounce
      moved = 0;
    }

    userDiv.style.left = `${currentLeft}px`;

    if (moved < distance) {
      userDiv._wanderingFrame = requestAnimationFrame(step);
    } else {
      // Pause and restart after delay
      emojiImg.src = "assets/idle.gif";
      setTimeout(() => {
        // Only restart if user is still active
        if (userStates[usernameKey] === "active") {
          startWandering(userDiv);
        }
      }, 1000 + Math.random() * 2000);
    }
  }

  step();
}

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