const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions");
const compiler = require("compilex");
const bodyParser = require("body-parser");
var options = { stats: true };
compiler.init(options);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server);

app.post("/compile", (req, res) => {
  const { code, input, lang } = req.body;
  try {
    if (lang === "Cpp") {
      const envData = { OS: "linux", cmd: "gcc", options: { timeout: 10000 } };
      if (!input) {
        compiler.compileCPP(envData, code, function (data) {
          if (data.output) {
            res.send(data);
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          } else {
            res.send({ output: "error in code" });
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          }
        });
      } else {
        compiler.compileCPPWithInput(envData, code, input, function (data) {
          if (data.output) {
            res.send(data);
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          } else {
            res.send({ output: "error in code" });
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          }
        });
      }
    } else if (lang === "Java") {
      const envData = { OS: "linux", options: { timeout: 10000 } };
      if (!input) {
        compiler.compileJava(envData, code, function (data) {
          if (data.output) {
            res.send(data);
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          } else {
            res.send({ output: "error in code" });
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          }
        });
      } else {
        compiler.compileJavaWithInput(envData, code, input, function (data) {
          if (data.output) {
            res.send(data);
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          } else {
            res.send({ output: "error in code" });
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          }
        });
      }
    } else if (lang === "Python") {
      const envData = { OS: "linux", options: { timeout: 10000 } };
      if (!input) {
        compiler.compilePython(envData, code, function (data) {
          if (data.output) {
            res.send(data);
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          } else {
            res.send({ output: "error in code" });
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          }
        });
      } else {
        compiler.compilePythonWithInput(envData, code, input, function (data) {
          if (data.output) {
            res.send(data);
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          } else {
            res.send({ output: "error in code" });
            compiler.flush(function () {
              console.log("All temporary files flushed !");
            });
          }
        });
      }
    }
  } catch (e) {
    console.log("err", e);
  }
});

app.use(express.static("build"));
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
  // Map
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
