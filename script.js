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
