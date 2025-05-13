const client = new tmi.Client({
  connection: {
    secure: true,
    reconnect: true
  },
  channels: ['thesleepyfox']  // Replace with your Twitch username
});

client.connect().then(() => {
  console.log('✅ Connected to Twitch chat');
});

client.on('message', (channel, tags, message, self) => {
  if (self) return;

  console.log(`${tags['display-name']}: ${message}`);

  if (message.toLowerCase().trim() === '!jump') {
    const emoji = document.getElementById('emoji');
    emoji.classList.add('jump');
    setTimeout(() => emoji.classList.remove('jump'), 600);
  }
});

client.on('join', (channel, username, self) => {
  if (self) return;

  console.log(`${username} joined the chat`);

  const container = document.getElementById('join-container');
  const emoji = document.createElement('div');
  emoji.className = 'join-emoji';

  // Use random emoji or username
  const emojis = ['👋', '🎉', '🔥', '🐸', '💥'];
  emoji.textContent = `${emojis[Math.floor(Math.random() * emojis.length)]} ${username}`;

  // Random left position
  emoji.style.left = `${Math.random() * 90}%`;

  container.appendChild(emoji);

  setTimeout(() => {
    container.removeChild(emoji);
  }, 2500);
});
