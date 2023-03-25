import { Peer } from "peerjs";

const r = Math.floor(Math.random() * 10).toString();
const id = document.location.hash == "" ? "4" + r : "5" + r;

const peer = new Peer({
  host: "peerjs.uqbar.network",
  port: 443,
  secure: true,
  config: {
    iceServers: [
  { urls: 'stun:65.21.6.180:3478' },
  {
    urls: 'turn:65.21.6.180:3478',
    username: 'timtime',
    credential: 'blahblah',
  },
],
  }
});

console.log(peer);

document.getElementById("myid").innerHTML = id;

//@ts-ignore
window.copyId = () => {
  const id = document.getElementById("myid").innerHTML;
  navigator.clipboard.writeText(id);
};

//@ts-ignore
window.pasteId = () => {
  navigator.clipboard
    .readText()
   .then((clipText) => (document.getElementById("peerid").innerText = clipText));
}

document.querySelector('form').addEventListener('submit', ev => {
  ev.preventDefault();
  const msg = (document.getElementById('outbox') as HTMLInputElement).value;
  console.log(msg);
  const peerId = (document.getElementById('peerid') as HTMLInputElement).value;
  if (peerId === id) {
    alert('You cannot connect to yourself');
    return;
  }
  if (peerId === '') {
    alert('Please enter a peer ID');
    return;
  }
  const conn = peer.connect(peerId);
  conn.on('error', err => console.log(err));

  // todo: it's never getting the open message. Need to see what's happening
  // on the TURN server directly
  conn.on('open', () => {
    conn.send(`${(msg)}`);
    console.log(`I sent: ${(msg)}`);
  });

  conn.on('error', err => console.log(err));
  (document.getElementById('outbox') as HTMLInputElement).value = '';
});

peer.on('connection', conn => {
  const rtcPeerConnection = conn.peerConnection;

  rtcPeerConnection.addEventListener('icecandidate', event => {
    const iceCandidate = event.candidate;
    if (iceCandidate) {
      console.log('ICE Candidate:', iceCandidate);
    } else {
      console.log('All ICE Candidates gathered.');
    }
  });
  conn.on('data', data => {
    document.getElementById('inbox').innerHTML = (data as string);
    console.log(data);
  });
});

/** from tutorial at https://medium.com/@otterlord/learn-peer-js-video-chat-app-bfaa0e976263
 *
**/

//@ts-ignore
async function callUser(peerId: string) {
  // grab the camera and mic
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  // switch to the video call and play the camera preview
  document.getElementById("menu").style.display = "none";
  document.getElementById("live").style.display = "block";
  const lv = (document.getElementById("local-video") as HTMLVideoElement);
  lv.srcObject = stream;
  lv.play();

  // make the call
  const call = peer.call(peerId, stream);
  call.on("stream", (stream) => {
    const rv = (document.getElementById("remote-video") as HTMLVideoElement);
    rv.srcObject = stream;
    rv.play();
  });
  call.on("error", (err) => {
    console.log(err);
  });
}

peer.on('error', err => console.log(err));