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

  const container = document.getElementById('join-container');
  const emoji = document.createElement('div');
  emoji.className = 'join-emoji';

  const emojis = ['👋', '🎉', '🔥', '🐸', '💥'];
  emoji.textContent = `${emojis[Math.floor(Math.random() * emojis.length)]} ${username}`;

  // Random horizontal start position
  const startX = Math.random() * 90;
  emoji.style.left = `${startX}%`;

  container.appendChild(emoji);

  // After falling, make it wander
  setTimeout(() => {
    emoji.style.animation = ''; // Stop fall animation
    startWandering(emoji);
  }, 1600);
});

function startWandering(emoji) {
  let x = parseFloat(emoji.style.left);
  const direction = Math.random() < 0.5 ? -1 : 1;

  function wanderStep() {
    // Change direction randomly
    if (Math.random() < 0.05) {
      direction *= -1;
    }

    // Move a little
    x += direction * 0.5;
    if (x < 0) x = 0;
    if (x > 95) x = 95;

    emoji.style.left = `${x}%`;

    // Repeat
    requestAnimationFrame(wanderStep);
  }

  wanderStep();
}


// Attach testDrop to the global window object so HTML can call it
window.testDrop = function () {
  const container = document.getElementById('join-container');
  const emoji = document.createElement('div');
  emoji.className = 'join-emoji';
  emoji.textContent = '🐸 test';
  emoji.style.left = `${Math.random() * 90}%`;
  container.appendChild(emoji);

  setTimeout(() => {
    emoji.remove();
  }, 2500);
};