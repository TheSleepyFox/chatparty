const client = new tmi.Client({
  connection: {
    secure: true,
    reconnect: true
  },
  channels: ['thesleepyfox']  // 🔁 Replace with your Twitch username
});

client.connect().then(() => {
  console.log('✅ Connected to Twitch');
});

// Show a falling emoji when a new user joins chat
client.on('join', (channel, username, self) => {
  if (self) return;

  console.log(`${username} joined the chat`);

  const container = document.getElementById('join-container');
  const emoji = document.createElement('div');
  emoji.className = 'join-emoji';

  // Customize emoji or add username:
  const emojis = ['👋', '🎉', '🔥', '💥', '🌟', '🐸'];
  emoji.textContent = `${emojis[Math.floor(Math.random() * emojis.length)]} ${username}`;

  // Random horizontal position (0–90%)
  const x = Math.random() * 90;
  emoji.style.left = `${x}%`;

  container.appendChild(emoji);

  // Remove after animation ends
  setTimeout(() => {
    emoji.remove();
  }, 2500);
});
