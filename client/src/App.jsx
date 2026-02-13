import { useEffect, useRef, useState } from "react";
import socket from "./socket";
import Whiteboard from "./Whiteboard";

function App() {


  return (<>
       <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Whiteboard />
    </div>   
    </>
  );
}

export default App;