const client = new tmi.Client({
  channels: ['thesleepyfox'] // Replace with your Twitch username
});

client.connect().then(() => {
  console.log('✅ Connected to Twitch');
});

client.on('message', (channel, tags, message, self) => {
  console.log(`${tags['display-name']}: ${message}`);

  if (message.toLowerCase() === '!jump') {
    const emoji = document.getElementById('emoji');
    emoji.classList.add('jump');
    setTimeout(() => emoji.classList.remove('jump'), 600);
  }
});