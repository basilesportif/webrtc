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

signaling.addEventListener('message', async (event) => {
  let data;

  if (event.data instanceof Blob) {
    data = await blobToJson(event.data);
  } else {
    data = JSON.parse(event.data);
  }

  console.log(data)
  // Handle the incoming offer
  if (data.offer && !incomingCall) {
    incomingCall = true;
    acceptCallButton.style.display = 'inline';
    rejectCallButton.style.display = 'inline';

    // Accept the call
    acceptCallButton.addEventListener('click', async () => {
      incomingCall = false;
      acceptCallButton.style.display = 'none';
      rejectCallButton.style.display = 'none';

      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      signaling.send(JSON.stringify({ answer: answer }));
    });

    // Reject the call
    rejectCallButton.addEventListener('click', () => {
      incomingCall = false;
      acceptCallButton.style.display = 'none';
      rejectCallButton.style.display = 'none';

      // Send a rejection message
      signaling.send(JSON.stringify({ rejection: 'Call rejected' }));
    });
  } else if (data.answer && !incomingCall) {
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

  if (candidate) {
    signaling.send(
      JSON.stringify({ type: 'icecandidate', candidate: candidate }),
    );
  }
});

peerConnection.addEventListener('track', (event) => {
  console.log("track", event)
  const remoteStream = event.streams[0];
  const remoteVideoElement = (document.getElementById('remote-video') as HTMLVideoElement);
  remoteVideoElement.srcObject = remoteStream;
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

  signaling.send(JSON.stringify(offer));
});