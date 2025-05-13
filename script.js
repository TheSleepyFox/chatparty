// === Twitch Connection ===
const client = new tmi.Client({
  connection: { reconnect: true },
  channels: ['thesleepyfox'] // 👈 Replace with your Twitch channel name
});

client.connect();

// === State ===
const userEmojis = {};              // Stores username -> emoji
const activeUsers = {};            // Stores username -> DOM container

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
  let direction = Math.random() < 0.5 ? -1 : 1;
  let speed = 0.1 + Math.random() * 0.2; // Slow speed
  let pos = parseFloat(element.style.left || "50");
  let isPaused = false;
  let pauseTimer = 0;

  function wander(timestamp) {
    if (isPaused) {
      // Still paused
      if (Date.now() > pauseTimer) {
        isPaused = false;
      }
    } else {
      // Move the element
      pos += direction * speed;

      // Bounce at edges
      if (pos < 0 || pos > 95) {
        direction *= -1;
        pos = Math.max(0, Math.min(95, pos));
      }

      element.style.left = `${pos}%`;

      // Random chance to pause
      if (Math.random() < 0.25) { // ~0.5% chance per frame
        isPaused = true;
        pauseTimer = Date.now() + (500 + Math.random() * 1500); // pause 0.5–2 sec
      }
    }

    requestAnimationFrame(wander);
  }

  wander();
}

}
