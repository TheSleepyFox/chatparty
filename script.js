const client = new tmi.Client({
  channels: ['thesleepyfox'] // Replace with your Twitch username
});

client.connect();

client.on('message', (channel, tags, message, self) => {
  // Normalize the command
  const command = message.trim().toLowerCase();

  if (command === '!jump') {
    triggerJump(); // Your custom function to react to the command
  }
});

function triggerJump() {
  const el = document.getElementById('reaction');
  el.classList.add('jump');

  // Remove the class after animation completes so it can trigger again
  setTimeout(() => el.classList.remove('jump'), 1000);
}

