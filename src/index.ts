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

const peerConnectionConfig = { iceServers };
const peerConnection = new RTCPeerConnection(peerConnectionConfig);

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

  if (data.type === 'offer') {
    await peerConnection.setRemoteDescription(data);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    signaling.send(JSON.stringify(answer));
  } else if (data.type === 'answer') {
    await peerConnection.setRemoteDescription(data);
  } else if (data.type === 'icecandidate') {
    const candidate = new RTCIceCandidate(data.candidate);
    await peerConnection.addIceCandidate(candidate);
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