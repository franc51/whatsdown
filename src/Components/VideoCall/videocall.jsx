import React, { useState, useEffect, useRef, useCallback } from "react";
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

  // Use useCallback to memoize handleIncomingCall to prevent unnecessary re-renders
  const handleIncomingCall = useCallback(async (data) => {
    console.log("Received incoming call:", data);
    console.log("friendId from URL state:", friendId, "message says friendId:", data.friendId);

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
        console.log("Closed existing peer connection.");

        // Create a new peer connection
        peerConnection.current = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
          ],
        });

        // Log peer connection state changes
        peerConnection.current.onconnectionstatechange = () => {
          console.log("Peer connection state change:", peerConnection.current.connectionState);
        };

        peerConnection.current.oniceconnectionstatechange = () => {
          console.log("ICE connection state change:", peerConnection.current.iceConnectionState);
        };

        // Send ICE candidates to the caller
        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Sending ICE candidate:", event.candidate);
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
          console.log("Received remote track.");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Add local tracks to the peer connection
        mediaStream.getTracks().forEach((track) => {
          console.log("Adding track to peer connection:", track.kind);
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
        console.log("Sent answer to the caller.");
      } catch (error) {
        console.error("Error handling incoming call:", error);
        alert(
          "Unable to access camera or microphone for incoming call. Please check your permissions."
        );
      }
    }
  }, [friendId, socket]);

  // Media stream cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        console.log("Stopped media stream tracks.");
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        console.log("Closed peer connection during cleanup.");
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
        console.log("Closed existing peer connection before starting new one.");
      }

      // Initialize peer connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          // Optionally add TURN server here
        ],
      });

      // Log peer connection state changes
      peerConnection.current.onconnectionstatechange = () => {
        console.log("Peer connection state change:", peerConnection.current.connectionState);
      };

      peerConnection.current.oniceconnectionstatechange = () => {
        console.log("ICE connection state change:", peerConnection.current.iceConnectionState);
      };

      setIsCalling(true);
      console.log("Sending start-call message to friend:", friendId);

      // Add media tracks to peer connection
      mediaStream.getTracks().forEach((track) => {
        console.log("Adding track to peer connection:", track.kind);
        peerConnection.current.addTrack(track, mediaStream);
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        console.log("Received remote track during call.");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("Sending ICE candidate:", event.candidate);
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
      console.log("Sent offer to the friend.");
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
      console.log("Stopped media stream tracks on end call.");
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      console.log("Closed peer connection on end call.");
    }

    if (onEndCall) onEndCall();
    socket.send(JSON.stringify({ type: "end-call", friendId, yourUserId }));
    console.log("Sent end-call message.");
  };

  // Toggle camera on/off
  const toggleCamera = () => {
    setIsCameraOn((prev) => !prev);
    if (stream) {
      stream.getTracks().forEach((track) => {
        if (track.kind === "video") {
          track.enabled = !track.enabled;
          console.log("Toggled camera track:", track.enabled ? "On" : "Off");
        }
      });
    }
  };

  // Handle incoming WebSocket messages
  useEffect(() => {
    const handleMessage = async (event) => {
      console.log("WebSocket event listener attached.");

      const data = JSON.parse(event.data);
      console.log("Received WebSocket message:", data);

      if (data.type === "start-call") {
        console.log("Received start-call message");
        handleIncomingCall(data);
      }

      if (data.type === "end-call" && data.friendId === friendId) {
        setIsInCall(false);
        console.log("Ending call as received in WebSocket message.");
      }

      if (data.type === "offer") {
        console.log("Received offer message.");
        if (peerConnection.current) peerConnection.current.close(); // Close existing connection
        peerConnection.current = new RTCPeerConnection();

        // Log peer connection state changes
        peerConnection.current.onconnectionstatechange = () => {
          console.log("Peer connection state change:", peerConnection.current.connectionState);
        };

        peerConnection.current.oniceconnectionstatechange = () => {
          console.log("ICE connection state change:", peerConnection.current.iceConnectionState);
        };

        peerConnection.current.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("Sending ICE candidate:", event.candidate);
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
          console.log("Received remote track during offer processing.");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        if (stream) {
          stream.getTracks().forEach((track) => {
            peerConnection.current.addTrack(track, stream);
            console.log("Added track to peer connection:", track.kind);
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
          console.log("Sent answer after offer.");
        } catch (error) {
          console.error("Error processing WebRTC offer/answer:", error);
        }
      }

      if (data.type === "answer") {
        console.log("Received answer message.");
        await peerConnection.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }

      if (data.type === "ice-candidate") {
        try {
          console.log("Received ICE candidate message.");
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
  }, [friendId, socket, stream, handleIncomingCall]);

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
