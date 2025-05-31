// Debug logging
console.log('Script loaded. Checking browser support...');

// Check for browser support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  const errorMsg = 'Your browser does not support the required features. Please use Chrome, Firefox, or Edge.';
  console.error(errorMsg);
  alert(errorMsg);
  throw new Error(errorMsg);
}

const socket = io();
const peers = {};
let localStream;
const username = new URLSearchParams(window.location.search).get("username") || 'User' + Math.floor(Math.random() * 1000);

// Show loading state
document.body.insertAdjacentHTML('afterbegin', `
  <div id="media-status" style="
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 15px;
    border-radius: 5px;
    z-index: 1000;
    max-width: 80%;
  ">
    <div>Requesting camera and microphone access...</div>
    <div id="media-error" style="color: #ff6b6b; margin-top: 10px;"></div>
  </div>
`);

// Helper function to show error messages
function showError(message) {
  console.error('Media Error:', message);
  const errorDiv = document.getElementById('media-error');
  if (errorDiv) {
    errorDiv.textContent = message;
  } else {
    alert(message); // Fallback in case the error div doesn't exist
  }
}

// 1. Get local video/audio
console.log('Requesting camera and microphone access...');

// First, enumerate devices to check what's available
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    console.log('Available devices:', devices);
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    console.log('Video devices:', videoDevices);
    console.log('Audio devices:', audioDevices);
    
    if (videoDevices.length === 0) {
      throw new Error('No video devices found');
    }
    if (audioDevices.length === 0) {
      console.warn('No audio devices found');
    }
    
    // Now request media with specific device IDs if available
    const constraints = {
      video: videoDevices.length > 0 ? {
        deviceId: videoDevices[0].deviceId ? { exact: videoDevices[0].deviceId } : undefined
      } : false,
      audio: audioDevices.length > 0
    };
    
    console.log('Using constraints:', JSON.stringify(constraints, null, 2));
    return navigator.mediaDevices.getUserMedia(constraints);
  })
  .then(stream => {
    // Success handler will be here
  })
  .catch(error => {
    console.error('Error accessing media devices:', error);
    
    let errorMessage = 'Failed to access camera/microphone. ';
    
    if (error.name === 'NotAllowedError') {
      errorMessage += 'Permission was denied. Please allow camera and microphone access and try again.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage += 'No camera or microphone found. Please check your device connections.';
    } else if (error.name === 'NotReadableError') {
      errorMessage += 'Could not access the camera/microphone. Another application might be using it.';
    } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
      errorMessage += 'The requested camera/microphone configuration is not supported.';
    } else {
      errorMessage += `Error: ${error.message || 'Unknown error'}`;
    }
    
    showError(errorMessage);
    
    // Add retry button
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry Access';
    retryButton.style.marginTop = '10px';
    retryButton.style.padding = '8px 16px';
    retryButton.style.backgroundColor = '#4CAF50';
    retryButton.style.color = 'white';
    retryButton.style.border = 'none';
    retryButton.style.borderRadius = '4px';
    retryButton.style.cursor = 'pointer';
    retryButton.onclick = () => window.location.reload();
    
    const errorDiv = document.getElementById('media-error');
    errorDiv.appendChild(document.createElement('br'));
    errorDiv.appendChild(retryButton);
    
    throw error; // Stop further execution
  })
  .then(stream => {
  console.log('Successfully obtained media stream');
  document.querySelector('#media-status').style.display = 'none';
  
  // Check if we actually got video and audio tracks
  const videoTracks = stream.getVideoTracks();
  const audioTracks = stream.getAudioTracks();
  
  console.log('Video tracks:', videoTracks.length);
  console.log('Audio tracks:', audioTracks.length);
  
  if (videoTracks.length > 0) {
    console.log('Video track settings:', videoTracks[0].getSettings());
  }
  
  localStream = stream;
  addVideoStream("self", stream, username);

  // Tell server you joined
  socket.emit('join-video-call', { username });
  socket.emit('join-video-stream', { username });
  
  // Log when tracks are ended
  stream.getTracks().forEach(track => {
    track.addEventListener('ended', () => {
      console.error(`Track ${track.kind} ended unexpectedly!`);
      showError(`Your ${track.kind} was disconnected. Please check your device.`);
    });
  });

  // When others already exist
  socket.on('existing-video-users', users => {
    users.forEach(([id, existingUsername]) => {
      const peerConnection = createPeerConnection(id, existingUsername);
      peers[id] = peerConnection;

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      peerConnection.createOffer().then(offer => {
        peerConnection.setLocalDescription(offer);
        socket.emit('offer', { offer, to: id, from: socket.id, username });
      });
    });
  });

  // When a new user joins
  socket.on('user-joined-video', ({ username, id }) => {
    const peerConnection = createPeerConnection(id, username);
    peers[id] = peerConnection;

    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
  });

  socket.on('offer', ({ offer, from, username }) => {
    const peerConnection = createPeerConnection(from, username);
    peers[from] = peerConnection;

    peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    peerConnection.createAnswer().then(answer => {
      peerConnection.setLocalDescription(answer);
      socket.emit('answer', { answer, to: from, from: socket.id });
    });
  });

  socket.on('answer', ({ answer, from }) => {
    peers[from].setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on('ice-candidate', ({ candidate, from }) => {
    if (peers[from]) {
      peers[from].addIceCandidate(new RTCIceCandidate(candidate));
    }
  });
});

function createPeerConnection(peerId, username) {
  const peer = new RTCPeerConnection();

  peer.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('ice-candidate', {
        to: peerId,
        candidate: event.candidate,
        from: socket.id,
      });
    }
  };

  peer.ontrack = event => {
    addVideoStream(peerId, event.streams[0], username);
  };

  return peer;
}

function addVideoStream(id, stream, username) {
  console.log(`Adding video stream for ${username} (${id})`);
  
  // Remove existing video element if it exists
  const existingVideo = document.getElementById(`video-${id}`);
  if (existingVideo) {
    console.log(`Removing existing video element for ${id}`);
    existingVideo.remove();
  }

  const videoContainer = document.createElement('div');
  videoContainer.classList.add('videoContainer');
  videoContainer.id = `video-${id}`;
  
  // Add a class to identify self video
  if (id === 'self') {
    videoContainer.classList.add('self-video');
  }

  const videoElement = document.createElement('video');
  videoElement.id = `video-element-${id}`;
  videoElement.autoplay = true;
  videoElement.playsInline = true;
  videoElement.muted = (id === 'self'); // Mute self video
  
  // Add event listeners for video element
  videoElement.onloadedmetadata = () => {
    console.log(`Video metadata loaded for ${username}`);
    videoElement.play().catch(e => {
      console.error(`Error playing video for ${username}:`, e);
    });
  };
  
  videoElement.onerror = (e) => {
    console.error(`Error with video element for ${username}:`, e);
  };
  
  // Set the stream source
  try {
    videoElement.srcObject = stream;
    console.log(`Set video source for ${username}`, stream);
  } catch (e) {
    console.error(`Error setting video source for ${username}:`, e);
    showError(`Error setting up video: ${e.message}`);
    return;
  }

  const usernameLabel = document.createElement('div');
  usernameLabel.classList.add('username');
  usernameLabel.textContent = username || 'User';
  usernameLabel.style.position = 'absolute';
  usernameLabel.style.bottom = '5px';
  usernameLabel.style.left = '5px';
  usernameLabel.style.background = 'rgba(0,0,0,0.5)';
  usernameLabel.style.color = 'white';
  usernameLabel.style.padding = '2px 5px';
  usernameLabel.style.borderRadius = '3px';
  usernameLabel.style.fontSize = '12px';

  videoContainer.appendChild(videoElement);
  videoContainer.appendChild(usernameLabel);
  
  // Add to video grid
  const videoGrid = document.getElementById('videoGrid');
  if (videoGrid) {
    videoGrid.appendChild(videoContainer);
    console.log(`Added video container for ${username} to the grid`);
  } else {
    console.error('Video grid element not found!');
    document.body.appendChild(videoContainer); // Fallback
  }
}

// Add event listeners for mute/unmute and camera buttons
const muteButton = document.getElementById('muteButton');
const unmuteButton = document.getElementById('unmuteButton');
let cameraButton;

function updateMuteButtons(isMuted) {
  if (isMuted) {
    muteButton.style.display = 'none';
    unmuteButton.style.display = '';
  } else {
    muteButton.style.display = '';
    unmuteButton.style.display = 'none';
  }
}

function updateCameraButton(isCameraOn) {
  if (cameraButton) {
    cameraButton.textContent = isCameraOn ? 'Turn Camera Off' : 'Turn Camera On';
    cameraButton.style.backgroundColor = isCameraOn ? '#d9534f' : '#5cb85c';
  }
}

function toggleMic(mute) {
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !mute;
    });
    updateMuteButtons(mute);
  }
}

function toggleCamera() {
  if (localStream) {
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      updateCameraButton(videoTrack.enabled);
    }
  }
}

// Wait for DOMContentLoaded to add camera button
window.addEventListener('DOMContentLoaded', () => {
  const controls = document.getElementById('controls');
  cameraButton = document.createElement('button');
  cameraButton.id = 'cameraButton';
  cameraButton.textContent = 'Turn Camera Off';
  cameraButton.style.backgroundColor = '#d9534f';
  cameraButton.style.color = 'white';
  cameraButton.style.padding = '10px 20px';
  cameraButton.style.fontSize = '16px';
  cameraButton.style.border = 'none';
  cameraButton.style.borderRadius = '5px';
  cameraButton.style.cursor = 'pointer';
  cameraButton.style.marginLeft = '10px';
  controls.appendChild(cameraButton);

  // Initial state
  updateMuteButtons(false);
  updateCameraButton(true);

  muteButton.addEventListener('click', () => toggleMic(true));
  unmuteButton.addEventListener('click', () => toggleMic(false));
  cameraButton.addEventListener('click', toggleCamera);
});