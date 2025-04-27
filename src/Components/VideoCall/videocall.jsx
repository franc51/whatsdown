import React, { useState, useEffect, useRef } from "react";

export default function VideoCall({ socket, onEndCall, friendId }) {
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Define the function to handle incoming calls
  const handleIncomingCall = (data) => {
    if (data.friendId === friendId) {
      setIsCalling(false);
      setIsInCall(true);
      // Assuming the remote stream is part of the incoming data
      if (data.remoteStream) {
        remoteVideoRef.current.srcObject = data.remoteStream;
      }
    }
  };

  // Set up the video stream
  useEffect(() => {
    if (isCalling || isInCall) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((mediaStream) => {
          setStream(mediaStream);
          localVideoRef.current.srcObject = mediaStream;
        })
        .catch((err) =>
          console.error("Failed to access webcam and microphone:", err)
        );
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCalling, isInCall]);

  const startCall = () => {
    setIsCalling(true);
    // Sending a start-call message via WebSocket
    socket.send(JSON.stringify({ type: "start-call", friendId }));
  };

  const endCall = () => {
    setIsCalling(false);
    setIsInCall(false);
    if (onEndCall) onEndCall();
    // Sending an end-call message via WebSocket
    socket.send(JSON.stringify({ type: "end-call", friendId }));
  };

  const toggleCamera = () => {
    setIsCameraOn((prev) => !prev);
    if (stream) {
      stream.getTracks().forEach((track) => {
        if (track.kind === "video") {
          track.enabled = !track.enabled;
        }
      });
    }
  };

  // Listening to WebSocket messages directly using the native WebSocket API
  useEffect(() => {
    const handleMessage = (event) => {
      const data = JSON.parse(event.data); // Parse the incoming message

      // Handle the start-call message
      if (data.type === "start-call") {
        handleIncomingCall(data);
      }
      // Handle other message types (e.g., end-call, etc.)
      if (data.type === "end-call" && data.friendId === friendId) {
        console.log("Call ended by the other party.");
        setIsInCall(false);
      }
    };

    // Add WebSocket message listener
    socket.addEventListener("message", handleMessage);

    // Cleanup listener on component unmount or when socket changes
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [friendId, socket]);

  return (
    <div className="video-call">
      <div className="video-call-container">
        <div className="local-video">
          <video ref={localVideoRef} autoPlay muted />
        </div>
        <div className="remote-video">
          <video ref={remoteVideoRef} autoPlay />
        </div>
      </div>
      <div className="video-call-controls">
        {isInCall && (
          <>
            <button onClick={toggleCamera}>
              {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
            </button>
            <button onClick={endCall}>End Call</button>
          </>
        )}
        {!isInCall && !isCalling && (
          <button onClick={startCall}>Start Call</button>
        )}
      </div>
    </div>
  );
}
