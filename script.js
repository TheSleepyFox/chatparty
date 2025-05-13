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

  const emoji = document.createElement('div');
  emoji.className = 'join-emoji';
  emoji.textContent = '🐸';

  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'join-username';
  usernameDiv.textContent = username;

  // Set username color (can be dynamic later)
  usernameDiv.style.color = '#00FFFF';

  // Initial position
  const startX = Math.random() * 90;
  emoji.style.left = `${startX}%`;
  usernameDiv.style.left = `${startX}%`;

  // Add both to container
  container.appendChild(usernameDiv);
  container.appendChild(emoji);

  // After drop, start wandering
  setTimeout(() => {
    emoji.style.animation = '';
    usernameDiv.style.animation = '';
    startWandering(emoji);
    startWandering(usernameDiv);
  }, 1600);
});


function getColorForUsername(username) {
  // Example color assignment - could be dynamic based on your own needs
  const colorMap = {
    'username1': '#FF5733', // Red
    'username2': '#33FF57', // Green
    'username3': '#3357FF', // Blue
  };

  return colorMap[username.toLowerCase()] || null;
}



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



window.testDrop = function () {
  const container = document.getElementById('join-container');

  const emoji = document.createElement('div');
  emoji.className = 'join-emoji';
  emoji.textContent = '🐸';

  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'join-username';
  usernameDiv.textContent = 'TestUser';
  usernameDiv.style.color = '#FF00FF';

  const startX = Math.random() * 90;
  emoji.style.left = `${startX}%`;
  usernameDiv.style.left = `${startX}%`;

  container.appendChild(usernameDiv);
  container.appendChild(emoji);

  setTimeout(() => {
    emoji.style.animation = '';
    usernameDiv.style.animation = '';
    startWandering(emoji);
    startWandering(usernameDiv);
  }, 1600);
};