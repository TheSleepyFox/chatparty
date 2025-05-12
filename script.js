// Connect to Twitch chat
const client = new tmi.Client({
  channels: ['your_channel_name'] // Replace with your Twitch username
});

client.connect();

// Listen for chat messages
client.on('message', (channel, tags, message, self) => {
  if (message.trim().toLowerCase() === '!jump') {
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
