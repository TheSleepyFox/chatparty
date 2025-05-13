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

  // Create a container for the user
  const userDiv = document.createElement('div');
  userDiv.className = 'user-container';

  // Username element
  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'join-username';
  usernameDiv.textContent = username;
  usernameDiv.style.color = '#00FFFF'; // Test color — will show up

  // Emoji element
  const emoji = document.createElement('div');
  emoji.className = 'join-emoji';
  emoji.textContent = '🐸';

  // Assemble
  userDiv.appendChild(usernameDiv);
  userDiv.appendChild(emoji);
  container.appendChild(userDiv);

  // Position
  const startX = Math.random() * 90;
  userDiv.style.left = `${startX}%`;

  // After drop, wander
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

window.testDrop = function () {
  const container = document.getElementById('join-container');
  const userDiv = document.createElement('div');
  userDiv.className = 'user-container';

  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'join-username';
  usernameDiv.textContent = 'TestUser';
  usernameDiv.style.color = '#FF00FF';

  const emoji = document.createElement('div');
  emoji.className = 'join-emoji';
  emoji.textContent = '🐸';

  userDiv.appendChild(usernameDiv);
  userDiv.appendChild(emoji);
  container.appendChild(userDiv);

  const startX = Math.random() * 90;
  userDiv.style.left = `${startX}%`;

  setTimeout(() => {
    userDiv.style.animation = '';
    startWandering(userDiv);
  }, 1600);
};
