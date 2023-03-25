const clientIdInput = (document.getElementById('client-id') as HTMLInputElement);
const hash = window.location.hash.substring(1);
if (hash) {
  clientIdInput.value = hash;
}

const clientId = () => (document.getElementById('client-id') as HTMLInputElement).value;

let remoteOffer = null;
let remoteStream = null;

const iceServers = [
  {
    urls: 'stun:65.21.6.180:3478',
    username: 'timtime',
    credential: 'blahblah',
  },
  {
    urls: 'turn:65.21.6.180:3478',
    username: 'timtime',
    credential: 'blahblah',
  },
];

const signalingServerUrl = 'wss://peerjs.uqbar.network:443';
const signaling = new WebSocket(signalingServerUrl);

let incomingCall = false;
const acceptCallButton = document.getElementById('accept-call');
const rejectCallButton = document.getElementById('reject-call');

const peerConnectionConfig = { iceServers };
const peerConnection = new RTCPeerConnection(peerConnectionConfig);

const iceCandidateQueue = [];

peerConnection.addEventListener('iceconnectionstatechange', () => {
  if (peerConnection.iceConnectionState === 'completed' || peerConnection.iceConnectionState === 'connected') {
    while (iceCandidateQueue.length) {
      const candidate = iceCandidateQueue.shift();
      peerConnection.addIceCandidate(candidate);
    }
  }
});

async function blobToJson(blob) {
  const text = await blob.text();
  return JSON.parse(text);
}

signaling.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});

// Accept the call
acceptCallButton.addEventListener('click', async () => {
  if (!incomingCall) return;
  incomingCall = false;
  acceptCallButton.style.display = 'none';
  rejectCallButton.style.display = 'none';

  await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  signaling.send(JSON.stringify({ clientId: clientId(), answer }));
});

// Reject the call
rejectCallButton.addEventListener('click', () => {
  if (!incomingCall) return;
  incomingCall = false;
  acceptCallButton.style.display = 'none';
  rejectCallButton.style.display = 'none';

  // Send a rejection message
  clientId();
  signaling.send(JSON.stringify({ clientId: clientId(), rejection: 'Call rejected' }));
});

signaling.addEventListener('message', async (event) => {
  let data;

  if (event.data instanceof Blob) {
    data = await blobToJson(event.data);
  } else {
    data = JSON.parse(event.data);
  }

  console.log(data)

  clientId();
  if (data.clientId === clientId) {
    return; // Ignore messages from the same client
  }

  if (data.offer && !incomingCall) {
    incomingCall = true;
    remoteOffer = data.offer; // Store the remote offer
    acceptCallButton.style.display = 'inline';
    rejectCallButton.style.display = 'inline';
  } else if (data.answer && !incomingCall) {
    console.log("answer", data.answer)
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
  } else if (data.rejection) {
    alert(data.rejection);
  }
   else if (data.type === 'icecandidate') {
    const candidate = new RTCIceCandidate(data.candidate);
    if (
      peerConnection.remoteDescription &&
      (peerConnection.remoteDescription.type === 'offer' || peerConnection.remoteDescription.type === 'answer')
    ) {
      await peerConnection.addIceCandidate(candidate);
    } else {
      iceCandidateQueue.push(candidate);
    }
  }
});

peerConnection.addEventListener('icecandidateerror', (event) => {
  console.error('ICE candidate error:', event);
});

peerConnection.addEventListener('icecandidate', (event) => {
  const candidate = event.candidate;

  clientId();
  if (candidate) {
    signaling.send(
      JSON.stringify({ clientId: clientId(), type: 'icecandidate', candidate: candidate }),
    );
  }
});

peerConnection.addEventListener('track', (event) => {
  // Make sure the remote stream is being updated correctly
  const remoteVideo = (document.getElementById('remote-video') as HTMLVideoElement);
  remoteVideo.srcObject = event.streams[0];
});

document.getElementById('start-button').addEventListener('click', async () => {
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const localVideoElement = (document.getElementById('local-video') as HTMLVideoElement);
  localVideoElement.srcObject = localStream;

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  clientId();
  signaling.send(JSON.stringify({ clientId: clientId(), offer }));
});