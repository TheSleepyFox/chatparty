const client = new tmi.Client({
  channels: ['yourtwitchusername'] // Replace with your actual Twitch username
});

client.connect().then(() => {
  console.log('✅ Connected to Twitch chat');
});

client.on('message', (channel, tags, message, self) => {
  console.log(`${tags['display-name']}: ${message}`);

  if (message.toLowerCase() === '!jump') {
    const emoji = document.getElementById('emoji');
    emoji.classList.add('jump');

    setTimeout(() => {
      emoji.classList.remove('jump');
    }, 600);
  }
});
