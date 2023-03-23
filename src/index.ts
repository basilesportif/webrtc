import { Peer } from "peerjs";

const id = Math.floor(Math.random() * 1000000000).toString();
const peer = new Peer(id);
console.log(peer);

document.getElementById("myid").innerHTML = id;
console.log(document.getElementById("myid"));

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
  conn.on('open', () => {
    conn.send(`${(msg)}`);
    console.log(`I sent: ${(msg)}`);
  });
  (document.getElementById('outbox') as HTMLInputElement).value = '';
});

peer.on('connection', conn => {
  conn.on('data', data => {
    document.getElementById('inbox').innerHTML = (data as string);
    console.log(data);
  });
});
