import { useEffect, useRef, useState } from "react";
import socket from "./socket";

function Whiteboard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("black");
  const [brushSize, setBrushSize] = useState(2);
  const [eraser, setEraser] = useState(false);

  const lastPos = useRef({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    resizeCanvas();
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctxRef.current = ctx;

    // Listen for drawing from others
    socket.on("draw", ({ x0, y0, x1, y1, color, width }) => {
      drawLine(x0, y0, x1, y1, color, width, false);
    });

    // Listen for clear canvas
    socket.on("clear_canvas", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Handle window resize
    window.addEventListener("resize", resizeCanvas);

    return () => {
      socket.off("draw");
      socket.off("clear_canvas");
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  // Update brush settings
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = eraser ? "white" : color;
      ctxRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize, eraser]);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Keep existing drawing? optional: you can save image and restore
    canvas.width = window.innerWidth * 0.95;
    canvas.height = window.innerHeight * 0.6;
  };

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setDrawing(true);
    lastPos.current = { x: offsetX, y: offsetY };
  };

  const draw = ({ nativeEvent }) => {
    if (!drawing) return;
    const { offsetX, offsetY } = nativeEvent;
    drawLine(
      lastPos.current.x,
      lastPos.current.y,
      offsetX,
      offsetY,
      eraser ? "white" : color,
      brushSize,
      true
    );
    lastPos.current = { x: offsetX, y: offsetY };
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

    socket.emit("draw", { x0, y0, x1, y1, color: strokeColor, width });
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
      }}
    >
      <h2 style={{ textAlign: "center" }}>Real-Time Whiteboard</h2>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "10px",
          gap: "10px",
        }}
      >
        <label>
          Brush Color:{" "}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={eraser}
          />
        </label>

        <label>
          Brush Size:{" "}
          <input
            type="range"
            min="1"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(e.target.value)}
          />
        </label>

        <button onClick={() => setEraser(!eraser)}>
          {eraser ? "Disable Eraser" : "Eraser"}
        </button>

        <button onClick={clearCanvas}>Clear Canvas</button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          border: "1px solid black",
          touchAction: "none",
          width: "95%", // responsive width
          maxWidth: "1200px",
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => startDrawing({ nativeEvent: e.touches[0] })}
        onTouchMove={(e) => draw({ nativeEvent: e.touches[0] })}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}

export default Whiteboard;