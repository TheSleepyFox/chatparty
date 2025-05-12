const client = new tmi.Client({
  channels: ['yourusername']  // all lowercase!
});

client.connect().then(() => {
  console.log('✅ Connected to Twitch');
});

client.on('message', (channel, tags, message, self) => {
  console.log(`${tags['display-name']}: ${message}`);
  
  if (message.toLowerCase() === '!jump') {
    console.log('Detected !jump');
    document.getElementById('emoji').classList.add('jump');

    setTimeout(() => {
      document.getElementById('emoji').classList.remove('jump');
    }, 600);
  }
});