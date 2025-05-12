// Connect to Twitch chat
const client = new tmi.Client({
  channels: ['thesleepyfox']
});

client.connect();

client.connect().then(() => {
  console.log('✅ Connected to Twitch chat');
});

// Listen for chat messages
client.on('message', (channel, tags, message, self) => {
  console.log(`Chat: ${tags['display-name']}: ${message}`);

  if (message.trim().toLowerCase() === '!jump') {
    console.log('🟢 !jump command detected');
    triggerJump();
  }
});

// Trigger jump animation
function triggerJump() {
  const emoji = document.getElementById('emoji');
  emoji.classList.add('jump');

  // Remove the class after the animation so it can be re-triggered
  setTimeout(() => emoji.classList.remove('jump'), 600);
}
