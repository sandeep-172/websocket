import { useEffect, useRef, useState } from "react";
import socket from "./socket";

function Whiteboard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [eraser, setEraser] = useState(false);

  const lastPos = useRef({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    resizeCanvas();

    // Receive drawing from others
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

    // Receive clear
    socket.on("clear_canvas", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    window.addEventListener("resize", resizeCanvas);

    return () => {
      socket.off("draw");
      socket.off("clear_canvas");
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // 🔥 Proper resize (Fixes cursor mismatch)
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;
  };

  // 🔥 Accurate mouse/touch position
  const getPosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (event.touches) {
      return {
        x: (event.touches[0].clientX - rect.left) * scaleX,
        y: (event.touches[0].clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e) => {
    const pos = getPosition(e);
    setDrawing(true);
    lastPos.current = pos;
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

  const stopDrawing = () => {
    setDrawing(false);
  };

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

    socket.emit("draw", {
      x0,
      y0,
      x1,
      y1,
      color: strokeColor,
      width,
    });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear_canvas");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px",
        width: "100%",
      }}
    >
      <h2>Real-Time Whiteboard</h2>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          disabled={eraser}
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
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          border: "1px solid black",
          touchAction: "none",
          width: "95%",
          maxWidth: "1200px",
          height: "65vh",
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