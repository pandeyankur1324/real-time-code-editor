import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import {
  useLocation,
  useNavigate,
  Navigate,
  useParams,
} from "react-router-dom";

const EditorPage = () => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();
  const [clients, setClients] = useState([]);

  const [code, setCode] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [textareaValue, setTextareaValue] = useState("");

  const handleDropdownChange = (event) => {
    setSelectedOption(event.target.value);
    console.log(selectedOption);
  };

  const input = document.querySelector("#input");

  const submit = async () => {
    const editorCode = {
      code: code,
      input: input.value,
      lang: selectedOption,
    };
    const oData = await fetch("http://localhost:8000/compile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(editorCode),
    });
    var d = await oData.json();
    setTextareaValue(d.output);
  };

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      function handleErrors(e) {
        console.log("socket error", e);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      // Listening for joined event
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
            console.log(`${username} joined`);
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      // Listening for disconnected
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });
    };
    init();
    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    };
  }, []);

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the Room ID");
      console.error(err);
    }
  }

  function leaveRoom() {
    reactNavigator("/");
  }

  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/code-sync.png" alt="logo" />
          </div>
          <h3>Connected</h3>
          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>
      <div className="editorWrap">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          onCodeChange={(code) => {
            codeRef.current = code;
            setCode(code);
          }}
        />
      </div>
      <div className="rightSide">
        <div className="selectionContainer">
          <button className="runBtn" onClick={submit}>
            Run
          </button>
          <select
            id="options"
            value={selectedOption}
            onChange={handleDropdownChange}
          >
            <option className="opt" Selected>
              Choose
            </option>
            <option className="opt" value="Cpp">
              C++
            </option>
            {/* <option className="opt"  value="Java">Java</option> */}
            <option className="opt" value="Python">
              Python
            </option>
          </select>
        </div>
        <div className="inputField">
          <h3>Input</h3>
          <textarea className="rightTextArea" id="input"></textarea>
        </div>
        <div className="outputField">
          <h3>Output</h3>
          <textarea
            className="rightTextArea"
            id="output"
            value={textareaValue}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
