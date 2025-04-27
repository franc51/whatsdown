import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./videocall.css";

export default function VideoCall({ onEndCall, socket }) {
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [stream, setStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);

  const location = useLocation();
  const { friendId, yourUserId } = location.state || {}; // Extract both friendId and yourUserId

  // Handle incoming call
  const handleIncomingCall = (data) => {
    console.log("Received incoming call:", data); // Log to verify
    if (data.friendId === friendId) {
      setIsCalling(false);
      setIsInCall(true);
      if (data.remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = data.remoteStream;
      }
    }
  };

  // Media stream setup and cleanup
  useEffect(() => {
    if (isCalling || isInCall) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((mediaStream) => {
          setStream(mediaStream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = mediaStream;
          }
        })
        .catch((err) => {
          console.error("Failed to access webcam and microphone:", err);
          alert(
            "Failed to access webcam and microphone. Please check your permissions."
          );
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCalling, isInCall]);

  // Start video call
  const startCall = async () => {
    setIsCalling(true);
    console.log("Sending start-call message to friend:", friendId);

    peerConnection.current = new RTCPeerConnection();

    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate: event.candidate,
            to: friendId,
          })
        );
      }
    };

    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });
    }

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.send(JSON.stringify({ type: "offer", offer: offer, to: friendId }));
  };

  // End video call
  const endCall = () => {
    setIsCalling(false);
    setIsInCall(false);
    if (onEndCall) onEndCall();
    socket.send(JSON.stringify({ type: "end-call", friendId, yourUserId })); // Pass yourUserId here
  };

  // Toggle camera on/off
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

  // Handle incoming WebSocket messages
  useEffect(() => {
    const handleMessage = async (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "start-call") {
        handleIncomingCall(data);
      }

      if (data.type === "end-call" && data.friendId === friendId) {
        setIsInCall(false);
      }
      if (data.type === "offer") {
        peerConnection.current = new RTCPeerConnection();

        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.send(
              JSON.stringify({
                type: "ice-candidate",
                candidate: event.candidate,
                to: data.from,
              })
            );
          }
        };

        peerConnection.current.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        if (stream) {
          stream.getTracks().forEach((track) => {
            peerConnection.current.addTrack(track, stream);
          });
        }

        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socket.send(JSON.stringify({ type: "answer", answer, to: data.from }));
      }

      if (data.type === "answer") {
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }

      if (data.type === "ice-candidate") {
        try {
          await peerConnection.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    };

    socket.addEventListener("message", handleMessage);

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
            <div className="control-button" onClick={toggleCamera}>
              {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
            </div>
            <div className="control-button" onClick={endCall}>
              End Call
            </div>
          </>
        )}

        {!isInCall && !isCalling && (
          <div className="control-button" onClick={startCall}>
            Start Call
          </div>
        )}
      </div>
    </div>
  );
}
