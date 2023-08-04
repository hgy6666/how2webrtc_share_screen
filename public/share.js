/// <reference path="../messages.d.ts" />

/**
 * Hides the given element by setting `display: none`.
 * @param {HTMLElement} element The element to hide
 */
 function hideElement(element) {
    element.style.display = "none";
  }
  
  /**
   * Shows the given element by resetting the display CSS property.
   * @param {HTMLElement} element The element to show
   */
  function showElement(element) {
    element.style.display = "";
  }
  
  const shareButton = document.getElementById("share-button");
  const stopButton = document.getElementById('stop-button');
  
  
  /** @type {string} */
  let shareCode;
  
  const username = `shareuser${Math.floor(Math.random() * 100)}`;
  const socketUrl = `wss://${location.host}/ws`;
  const socket = new WebSocket(socketUrl);
  
  /**
   * Sends the message over the socket.
   * @param {WebSocketMessage} message The message to send
   */
  function sendMessageToSignallingServer(message) {
    const json = JSON.stringify(message);
    socket.send(json);
  }
  
  // log in directly after the socket was opened
  socket.addEventListener("open", () => {
    console.log("websocket connected");
    sendMessageToSignallingServer({
      channel: "login",
      name: username,
    });
  });
  
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data.toString());
    handleMessage(message);
  });
  
  /**
   * Processes the incoming message.
   * @param {WebSocketMessage} message The incoming message
   */
  async function handleMessage(message) {
    switch (message.channel) {
      case "start_call":
        console.log(`receiving call from ${message.shareCode}`);
        shareCode = message.shareCode;
        startShareScreen(async()=>{
          const offer = await webrtc.createOffer();
          await webrtc.setLocalDescription(offer);
          sendMessageToSignallingServer({
            channel: "webrtc_offer",
            offer,
            shareCode,
          });
        });
        break;
  
      case "webrtc_ice_candidate":
        console.log("received ice candidate");
        await webrtc.addIceCandidate(message.candidate);
        break;
  
      case "webrtc_offer":
        console.log("received webrtc offer");
        await webrtc.setRemoteDescription(message.offer);
  
        const answer = await webrtc.createAnswer();
        await webrtc.setLocalDescription(answer);
  
        sendMessageToSignallingServer({
          channel: "webrtc_answer",
          answer,
          shareCode,
        });
        break;
  
      case "webrtc_answer":
        console.log("received webrtc answer");
        await webrtc.setRemoteDescription(message.answer);
        break;
  
      default:
        console.log("unknown message", message);
        break;
    }
  }
  
  const webrtc = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.stunprotocol.org",
        ],
      },
    ],
  });
  
  webrtc.addEventListener("icecandidate", (event) => {
    if (!event.candidate) {
      return;
    }
    sendMessageToSignallingServer({
      channel: "webrtc_ice_candidate",
      candidate: event.candidate,
      shareCode,
    });
  });
  
  function startShareScreen(cb){
    navigator.mediaDevices.getDisplayMedia()
    .then((localStream) => {
      /** @type {HTMLVideoElement} */
      for (const track of localStream.getTracks()) {
        webrtc.addTrack(track, localStream);
  
        track.onended = ()=>{
          handleTrackStop();
        }
      }
      cb&&cb();
    }).catch(e=>{
      console.log('user reject share screen: ', e)
    });
  }
  
  shareButton.addEventListener("click", async () => {
    const inputDom = document.getElementById("screen-code");
    const code = inputDom.value;
    if (!code) {
      alert('请输入投屏码');
      return;
    }
  
    shareCode = code;
  
    console.log(`start call ${code}`);
    startShareScreen(async()=>{
      const offer = await webrtc.createOffer();
      await webrtc.setLocalDescription(offer);
      sendMessageToSignallingServer({
        channel: "webrtc_offer",
        offer,
        shareCode,
      });
    });
  });
  
  stopButton.addEventListener("click", async () => {
    handleTrackStop();
  });
  
  
  function handleTrackStop() {
    if (!shareCode) return;
  
    // 通知投屏的屏幕关闭
    sendMessageToSignallingServer({
      channel: "webrtc_close",
      shareCode,
    });
    // 清空输入框
    const inputDom = document.getElementById("screen-code");
    inputDom.value = '';
    shareCode = null;
  }
  