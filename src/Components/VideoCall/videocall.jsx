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
  
      try {
        // Request access to camera and microphone
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
  
        // Close any existing peer connection
        if (peerConnection.current) peerConnection.current.close();
  
        // Create a new peer connection
        peerConnection.current = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
          ],
        });
  
        // Send ICE candidates to the caller
        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.send(
              JSON.stringify({
                type: "ice-candidate",
                candidate: event.candidate,
                to: data.yourUserId,
              })
            );
          }
        };
  
        // Receive remote media stream
        peerConnection.current.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };
  
        // Add local tracks to the peer connection
        mediaStream.getTracks().forEach((track) => {
          peerConnection.current.addTrack(track, mediaStream);
        });
  
        // Set the remote offer and respond with an answer
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.offer)
        );
  
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
  
        socket.send(
          JSON.stringify({
            type: "answer",
            answer,
            to: data.yourUserId,
          })
        );
      } catch (error) {
        console.error("Error handling incoming call:", error);
        alert(
          "Unable to access camera or microphone for incoming call. Please check your permissions."
        );
      }
    }
  };
  

// Media stream cleanup
useEffect(() => {
  return () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
  };
}, [stream]);


  // Start video call
  const startCall = async () => {
    try {
      // Request media access first (camera + mic)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream;
      }
  
      // Always create a new peer connection before starting a new call
      if (peerConnection.current) {
        peerConnection.current.close();
      }
  
      // Initialize peer connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          // Optionally add TURN server here
        ],
      });
  
      setIsCalling(true);
      console.log("Sending start-call message to friend:", friendId);
  
      // Add media tracks to peer connection
      mediaStream.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, mediaStream);
      });
  
      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };
  
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
  
      // Create offer and send to friend
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
  
      socket.send(
        JSON.stringify({
          type: "start-call",
          friendId,
          yourUserId,
          offer,
        })
      );
    } catch (error) {
      console.error("Failed to start call:", error);
      alert(
        "Unable to access camera or microphone. Please check your permissions."
      );
    }
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
