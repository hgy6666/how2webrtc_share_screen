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
  
  const videoContainer = document.getElementById("video-container");
  const staticPage = document.getElementById("static-page");
  
  /**
   * Hides both local and remote video, but shows the "call" button.
   */
  function hideVideoCall() {
    hideElement(videoContainer);
    showElement(staticPage);
  }
  
  /**
   * Shows both local and remote video, and hides the "call" button.
   */
  function showVideoCall() {
    hideElement(staticPage);
    showElement(videoContainer);
  }
  
  /** @type {string} */
  let shareCode;
  let username = null;
  let socket = null;
  /**
   * get unique id from each screen.
   */
  function generateUniqueId() {
    const randomNumber = Math.random().toString(36).substring(2, 5);
    const timestamp = Date.now().toString(36).substring(2, 5);
    return randomNumber + timestamp;
  }
  
  /**
   * Sends the message over the socket.
   * @param {WebSocketMessage} message The message to send
   */
  function sendMessageToSignallingServer(message) {
    const json = JSON.stringify(message);
    socket.send(json);
  }
  
  /**
   * Processes the incoming message.
   * @param {WebSocketMessage} message The incoming message
   */
  async function handleMessage(message) {
    switch (message.channel) {
      case "start_call":
        console.log(`receiving call from ${message.with}`);
        shareCode = message.shareCode;
        showVideoCall();
  
        const offer = await webrtc.createOffer();
        await webrtc.setLocalDescription(offer);
        sendMessageToSignallingServer({
          channel: "webrtc_offer",
          offer,
          shareCode,
        });
        break;
  
      case "webrtc_ice_candidate":
        console.log("received ice candidate");
        await webrtc.addIceCandidate(message.candidate);
        break;
  
      case "webrtc_offer":
        console.log("received webrtc offer");
        shareCode = message.shareCode;
        showVideoCall();
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
      
      case "webrtc_close":
        console.log("close webrtc");
        closeHandler();
        break;
  
      default:
        console.log("unknown message", message);
        break;
    }
  }
  
  /**
   * Sharing close.
   */
  function closeHandler() {
    if (webrtc) {
      const localVideo = document.getElementById("video-container");
      localVideo.srcObject && localVideo.srcObject.getTracks().forEach(v => {
        v.stop();
      });
      localVideo.srcObject = null;
      hideVideoCall();
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
  
  webrtc.onaddstream = (e) => {
    console.log('onaddstream,e', e);
    const remoteVideo = document.getElementById("video-container");
    // fix android webview v62 track事件不会触发导致不能播放的问题
    remoteVideo.srcObject = event.stream;
  }
  
  webrtc.addEventListener("icecandidate", (event) => {
    if (!event.candidate) {
      return;
    }
    console.log("onIcecandidate", event.candidate);
    //alert(JSON.stringify(event.candidate));
    sendMessageToSignallingServer({
      channel: "webrtc_ice_candidate",
      candidate: event.candidate,
      shareCode,
    });
  });
  
  webrtc.addEventListener("track", (event) => {
    /** @type {HTMLVideoElement} */
    console.log("track,event", event);
    const remoteVideo = document.getElementById("video-container");
    if (remoteVideo.srcObject) return;
    remoteVideo.srcObject = event.streams[0];
  });
  
  function init() {
    hideVideoCall();
    username = generateUniqueId();
    document.getElementById("unique-code").innerHTML = username;
  
    const socketUrl = `wss://${location.host}/ws`;
    socket = new WebSocket(socketUrl);
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
  }
  
  init();
  