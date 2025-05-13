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

client.on('join', (channel, username, self) => {
  if (self) return;

  const container = document.getElementById('join-container');

  // Create wrapper
  const userDiv = document.createElement('div');
  userDiv.className = 'user-container';

  // Create username div
  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'join-username';
  usernameDiv.textContent = username;
  usernameDiv.style.color = '#00FFFF'; // You can replace with dynamic color

  // Create emoji div
  const emoji = document.createElement('div');
  emoji.className = 'join-emoji';
  emoji.textContent = '🐸';

  // Build the structure
  userDiv.appendChild(usernameDiv);
  userDiv.appendChild(emoji);
  container.appendChild(userDiv);

  // Position horizontally
  const startX = Math.random() * 90;
  userDiv.style.left = `${startX}%`;

  // Animate after fall
  setTimeout(() => {
    userDiv.style.animation = '';
    startWandering(userDiv);
  }, 1600);
});


function startWandering(element) {
  let x = parseFloat(element.style.left);
  let direction = Math.random() < 0.5 ? -1 : 1;

  function wanderStep() {
    if (Math.random() < 0.05) {
      direction *= -1;
    }

    x += direction * 0.5;
    x = Math.max(0, Math.min(x, 95));

    element.style.left = `${x}%`;

    requestAnimationFrame(wanderStep);
  }

  wanderStep();
}

