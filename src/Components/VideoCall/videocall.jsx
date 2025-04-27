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
  const handleIncomingCall = async (data) => {
    console.log("Received incoming call:", data);

    if (data.friendId === friendId) {
      setIsCalling(false);
      setIsInCall(true);

      // Close existing peer connection if any
      if (peerConnection.current) peerConnection.current.close();

      // Create new peer connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          // Optionally add TURN server if required
        ],
      });

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.send(
            JSON.stringify({
              type: "ice-candidate",
              candidate: event.candidate,
              to: data.yourUserId, // Send ICE candidate back to the caller
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

      try {
        // Set the remote offer received from the caller
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );

        // Create an answer and send it back to the caller
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        socket.send(
          JSON.stringify({
            type: "answer",
            answer: answer,
            to: data.yourUserId, // Send answer back to the caller
          })
        );
      } catch (error) {
        console.error("Error processing incoming call offer:", error);
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
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, [isCalling, isInCall]);

  // Start video call
  const startCall = async () => {
    // Always create a new peer connection before starting a new call
    if (peerConnection.current) {
      peerConnection.current.close(); // Close any existing connection
    }

    // Initialize a new peer connection
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        // Optionally add TURN server if required
      ],
    });

    setIsCalling(true);
    console.log("Sending start-call message to friend:", friendId);
    // Create the offer
    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    console.log("Offer created", offer);

    // Send the offer to the friend over WebSocket
    socket.send(
      JSON.stringify({
        type: "start-call",
        friendId: friendId,
        yourUserId: yourUserId, // Make sure yourUserId is passed correctly
        offer: offer,
      })
    );

    // Handle ICE candidates
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

    // Add media tracks to peer connection
    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, stream);
      });
    }

    // Handle the remote stream when it is received
    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
  };

  // End video call
  const endCall = () => {
    setIsCalling(false);
    setIsInCall(false);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    if (onEndCall) onEndCall();
    socket.send(JSON.stringify({ type: "end-call", friendId, yourUserId }));
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
        console.log("Received start-call message");
        handleIncomingCall(data);
      }

      if (data.type === "end-call" && data.friendId === friendId) {
        setIsInCall(false);
      }

      if (data.type === "offer") {
        if (peerConnection.current) peerConnection.current.close(); // Close existing connection
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

        try {
          await peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );
          const answer = await peerConnection.current.createAnswer();
          await peerConnection.current.setLocalDescription(answer);
          socket.send(
            JSON.stringify({ type: "answer", answer, to: data.from })
          );
        } catch (error) {
          console.error("Error processing WebRTC offer/answer:", error);
        }
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
