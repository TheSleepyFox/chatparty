// === Twitch Connection ===
const client = new tmi.Client({
  connection: { reconnect: true },
  channels: ['thesleepyfox'] // 👈 Replace with your Twitch channel name
});

client.connect();

// === State ===
const userEmojis = {};              // Stores username -> emoji
const activeUsers = {};            // Stores username -> DOM container

function testDrop(username = "TestUser", emoji = "🦊") {
  const usernameKey = username.toLowerCase();

  // If already active, remove to test from scratch
  if (activeUsers[usernameKey]) {
    activeUsers[usernameKey].remove();
    delete activeUsers[usernameKey];
  }

// === Handle Chat Messages (for !emoji command) ===
client.on('message', (channel, tags, message, self) => {
  if (self) return;

  const username = tags['display-name'] || tags.username;
  const usernameKey = username.toLowerCase();

  if (message.startsWith('!emoji ')) {
    const parts = message.trim().split(' ');
    const newEmoji = parts[1];

    if (newEmoji && newEmoji.length <= 3) {
      userEmojis[usernameKey] = newEmoji;
      console.log(`${username} set their emoji to ${newEmoji}`);

      // 🔄 Update emoji on screen if user is already active
      const userDiv = activeUsers[usernameKey];
      if (userDiv) {
        const emojiElement = userDiv.querySelector('.join-emoji');
        if (emojiElement) {
          emojiElement.textContent = newEmoji;
        }
      }
    }
  }
});

// === Handle User Join ===
client.on('join', (channel, username, self) => {
  if (self) return;

  const usernameKey = username.toLowerCase();
  const container = document.getElementById('join-container');

  // Create a container for username + emoji
  const userDiv = document.createElement('div');
  userDiv.className = 'user-container';

  // Username
  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'join-username';
  usernameDiv.textContent = username;
  usernameDiv.style.color = '#00FFFF'; // Static or dynamic later

  // Emoji
  const emojiDiv = document.createElement('div');
  emojiDiv.className = 'join-emoji';
  const emojiChar = userEmojis[usernameKey] || '🐸';
  emojiDiv.textContent = emojiChar;

  // Assemble
  userDiv.appendChild(usernameDiv);
  userDiv.appendChild(emojiDiv);
  container.appendChild(userDiv);

  // Position horizontally
  const startX = Math.random() * 90;
  userDiv.style.left = `${startX}%`;

  // Store for future emoji updates
  activeUsers[usernameKey] = userDiv;

  // Animate falling in
  setTimeout(() => {
    userDiv.style.animation = '';
    startWandering(userDiv);
  }, 1600);
});

// === Wandering Behavior ===
function startWandering(element) {
  let pos = parseFloat(element.style.left || "50");

  function step() {
    // Pick random direction and distance
    const direction = Math.random() < 0.5 ? -1 : 1;
    const distance = 5 + Math.random() * 10; // move 5–15% of screen width
    const duration = 1000 + Math.random() * 1000; // 1–2 seconds
    const pauseDuration = 500 + Math.random() * 1500; // 0.5–2 sec

    const start = Date.now();
    const startPos = pos;
    const endPos = Math.max(0, Math.min(95, startPos + direction * distance));

    function move() {
      const now = Date.now();
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1); // progress from 0 to 1

      // Simple linear interpolation
      pos = startPos + (endPos - startPos) * t;
      element.style.left = `${pos}%`;

      if (t < 1) {
        requestAnimationFrame(move);
      } else {
        // Pause, then take next step
        setTimeout(step, pauseDuration);
      }
    }

    move();
  }

  step(); // start the first wandering step
}


