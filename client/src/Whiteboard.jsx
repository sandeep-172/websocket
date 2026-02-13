import { useEffect, useRef, useState } from "react";
import socket from "./socket";

function Whiteboard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [eraser, setEraser] = useState(false);

  const lastPos = useRef({ x: 0, y: 0 });

  // =========================
  // INITIALIZE
  // =========================
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    resizeCanvas();

    socket.on("draw", (data) => {
      drawLine(
        data.x0,
        data.y0,
        data.x1,
        data.y1,
        data.color,
        data.width,
        false
      );
    });

    socket.on("clear_canvas", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice_candidate", handleICE);

    window.addEventListener("resize", resizeCanvas);

    return () => {
      socket.off("draw");
      socket.off("clear_canvas");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice_candidate");
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // =========================
  // PERFECT CANVAS SCALING
  // =========================
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
  };

  // =========================
  // GET CORRECT POINTER POSITION
  // =========================
  const getPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;

    if (event.touches) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    setDrawing(true);
    lastPos.current = getPosition(e);
  };

  const draw = (e) => {
    if (!drawing) return;

    const pos = getPosition(e);

    drawLine(
      lastPos.current.x,
      lastPos.current.y,
      pos.x,
      pos.y,
      eraser ? "#FFFFFF" : color,
      brushSize,
      true
    );

    lastPos.current = pos;
  };

  const stopDrawing = () => setDrawing(false);

  const drawLine = (x0, y0, x1, y1, strokeColor, width, emit) => {
    const ctx = ctxRef.current;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.closePath();

    if (!emit) return;

    socket.emit("draw", { x0, y0, x1, y1, color: strokeColor, width });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear_canvas");
  };

  // =========================
  // VOICE CHAT (WEBRTC)
  // =========================
  const startVoice = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerRef.current = peer;

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play();
    };

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", event.candidate);
      }
    };

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    socket.emit("offer", offer);
  };

  const handleOffer = async (offer) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerRef.current = peer;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    peer.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play();
    };

    await peer.setRemoteDescription(offer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit("answer", answer);
  };

  const handleAnswer = async (answer) => {
    await peerRef.current.setRemoteDescription(answer);
  };

  const handleICE = async (candidate) => {
    try {
      await peerRef.current.addIceCandidate(candidate);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Whiteboard + Voice (Mobile Ready)</h2>

      <div style={{ marginBottom: "10px" }}>
        <input
          type="color"
          value={color}
          disabled={eraser}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          type="range"
          min="1"
          max="30"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
        <button onClick={() => setEraser(!eraser)}>
          {eraser ? "Disable Eraser" : "Eraser"}
        </button>
        <button onClick={clearCanvas}>Clear</button>
        <button onClick={startVoice}>Start Voice</button>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          border: "1px solid black",
          width: "95%",
          height: "65vh",
          touchAction: "none",
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => {
          e.preventDefault();
          startDrawing(e);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          draw(e);
        }}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}

export default Whiteboard;