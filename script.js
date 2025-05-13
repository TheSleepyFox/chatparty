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
  let x = parseFloat(emoji.style.left);               // Current X position
  let direction = Math.random() < 0.5 ? -1 : 1;        // Use let so we can change it

  function wanderStep() {
    // Occasionally reverse direction
    if (Math.random() < 0.05) {
      direction *= -1;                                // ✅ This is valid now
    }

    // Move left or right
    x += direction * 0.5;

    // Stay within screen bounds
    if (x < 0) x = 0;
    if (x > 95) x = 95;

    emoji.style.left = `${x}%`;

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