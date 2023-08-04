interface LoginWebSocketMessage {
  channel: "login";
  name: string;
}

interface StartCallWebSocketMessage {
  channel: "start_call";
  shareCode: string;
}

interface CloseCallWebSocketMessage {
  channel: "webrtc_close";
  shareCode: string;
}

interface WebRTCIceCandidateWebSocketMessage {
  channel: "webrtc_ice_candidate";
  candidate: RTCIceCandidate;
  shareCode: string;
}

interface WebRTCOfferWebSocketMessage {
  channel: "webrtc_offer";
  offer: RTCSessionDescription;
  shareCode: string;
}

interface WebRTCAnswerWebSocketMessage {
  channel: "webrtc_answer";
  answer: RTCSessionDescription;
  shareCode: string;
}

type WebSocketCallMessage =
  StartCallWebSocketMessage | CloseCallWebSocketMessage
  | WebRTCIceCandidateWebSocketMessage
  | WebRTCOfferWebSocketMessage
  | WebRTCAnswerWebSocketMessage;

type WebSocketMessage = LoginWebSocketMessage | WebSocketCallMessage;
