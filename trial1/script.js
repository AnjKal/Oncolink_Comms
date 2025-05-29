const socket = io();

// Get the username from the URL query parameters
const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');

// Display the username when the user joins
const startBtn = document.getElementById('startCall');
const hangUpBtn = document.getElementById('hangUp');
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendMessage');

let localConnection;
let dataChannel;
let localStream;

startBtn.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  localConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  localConnection.onicecandidate = e => {
    if (e.candidate) socket.emit('ice-candidate', e.candidate);
  };

  localStream.getTracks().forEach(track => {
    localConnection.addTrack(track, localStream);
  });

  dataChannel = localConnection.createDataChannel('chat');
  setupDataChannel();

  const offer = await localConnection.createOffer();
  await localConnection.setLocalDescription(offer);

  socket.emit('offer', { offer, username });

  // Save voice call log to database
  fetch('/api/calllog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: username, timestamp: new Date().toISOString() })
  });

  // Save call log to database (start)
  const startTime = new Date().toISOString();
  window._callStartTime = startTime;
  fetch('/api/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'voice',
      participants: [username],
      startTime,
      endTime: startTime // Will update on hang up
    })
  });
};

sendBtn.onclick = () => {
  const msg = messageInput.value;
  dataChannel.send(`${username}: ${msg}`);
  chatBox.innerHTML += `<p><b>You:</b> ${msg}</p>`;
  messageInput.value = '';
};

hangUpBtn.onclick = () => {
  localConnection.close();
  chatBox.innerHTML += "<p><i>Call ended</i></p>";

  // Update call log with end time
  const endTime = new Date().toISOString();
  fetch('/api/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'voice',
      participants: [username],
      startTime: window._callStartTime,
      endTime
    })
  });
};

// Handle Incoming Data Channel
function setupDataChannel() {
  dataChannel.onmessage = e => {
    chatBox.innerHTML += `<p>${e.data}</p>`;
  };
}

// --- Socket.io Signaling ---

socket.on('offer', async ({ offer, username: remoteUsername }) => {
  localConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  localConnection.onicecandidate = e => {
    if (e.candidate) socket.emit('ice-candidate', e.candidate);
  };

  localConnection.ondatachannel = e => {
    dataChannel = e.channel;
    setupDataChannel();
  };

  localConnection.ontrack = e => {
    const remoteAudio = new Audio();
    remoteAudio.srcObject = e.streams[0];
    remoteAudio.play();
  };

  await localConnection.setRemoteDescription(new RTCSessionDescription(offer));
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localStream.getTracks().forEach(track => {
    localConnection.addTrack(track, localStream);
  });

  const answer = await localConnection.createAnswer();
  await localConnection.setLocalDescription(answer);

  socket.emit('answer', { answer, username });
  chatBox.innerHTML += `<p><i>${remoteUsername} joined the call</i></p>`;
});

socket.on('answer', async ({ answer, username: remoteUsername }) => {
  await localConnection.setRemoteDescription(new RTCSessionDescription(answer));
  chatBox.innerHTML += `<p><i>${remoteUsername} joined the call</i></p>`;
});

socket.on('ice-candidate', async candidate => {
  if (candidate) {
    await localConnection.addIceCandidate(candidate);
  }
});

// For video call, similar logic should be added in scr_video.js when a user joins