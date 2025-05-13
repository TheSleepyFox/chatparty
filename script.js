// ========== Twitch Chat Setup ==========
const client = new tmi.Client({
  connection: { secure: true, reconnect: true },
  channels: ['thesleepyfox'] // replace with your Twitch channel name
});

client.connect();

const userEmojis = {};
const activeUsers = {};

// ========== Handle Chat Messages ==========
client.on('message', (channel, tags, message, self) => {
  if (self) return;

  const username = tags['display-name'] || tags.username;
  const usernameKey = username.toLowerCase();

  // !emoji 🐸 command
  if (message.startsWith('!emoji ')) {
    const newEmoji = message.split(' ')[1];
    if (newEmoji && newEmoji.length <= 2) {
      userEmojis[usernameKey] = newEmoji;

      // If already active, update the emoji
      const userDiv = activeUsers[usernameKey];
      if (userDiv) {
        const emojiDiv = userDiv.querySelector('.join-emoji');
        if (emojiDiv) emojiDiv.textContent = newEmoji;
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

  const emojiDiv = document.createElement("div");
  emojiDiv.className = "join-emoji";
  emojiDiv.textContent = emoji;

  userDiv.appendChild(usernameDiv);
  userDiv.appendChild(emojiDiv);
  container.appendChild(userDiv);

  activeUsers[usernameKey] = userDiv;

  // Fall animation
  userDiv.style.animation = "fall 1.6s ease-out forwards";

  // Start wandering after landing
  setTimeout(() => {
    userDiv.style.animation = "";
    startWandering(userDiv);
  }, 1600);
}

// ========== Wandering With Random Steps and Pauses ==========
function startWandering(element) {
  let pos = parseFloat(element.style.left || "50");

  function step() {
    const direction = Math.random() < 0.5 ? -1 : 1;
    const distance = 5 + Math.random() * 10; // 5–15%
    const duration = 1000 + Math.random() * 1000;
    const pauseDuration = 500 + Math.random() * 1500;

    const start = Date.now();
    const startPos = pos;
    const endPos = Math.max(0, Math.min(95, startPos + direction * distance));

    function move() {
      const now = Date.now();
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);

      pos = startPos + (endPos - startPos) * t;
      element.style.left = `${pos}%`;

      if (t < 1) {
        requestAnimationFrame(move);
      } else {
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
