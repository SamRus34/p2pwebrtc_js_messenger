const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4, validate, version } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Импортируем пакет CORS
const ACTIONS = require('./src/socket/actions');
const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors()); // Используем CORS с настройками по умолчанию

const rooms = {}; // для хранения комнат и времени их создания

// Настройка для хранения загружаемых файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// Убедитесь, что директория для загрузки файлов существует
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Промежуточное ПО для обработки загрузки файлов
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ fileName: req.file.filename });
});

// возвращает список комнат из io.sockets.adapter
function getClientRooms() {
    const { rooms } = io.sockets.adapter;

    return Array.from(rooms.keys()).filter(roomID => validate(roomID) && version(roomID) === 4);
}

// отправляем всем клиентам список комнат
function shareRoomsInfo() {
    io.emit(ACTIONS.SHARE_ROOMS, {
        rooms: getClientRooms()
    });
}

io.on('connection', socket => {
    shareRoomsInfo();

    socket.on(ACTIONS.JOIN, config => {
        const { room: roomID } = config;
        const { rooms: joinedRooms } = socket;

        if (Array.from(joinedRooms).includes(roomID)) {
            return console.warn(`Already joined to ${roomID}`);
        }

        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

        clients.forEach(clientID => {
            io.to(clientID).emit(ACTIONS.ADD_PEER, {
                peerID: socket.id,
                createOffer: false
            });

            socket.emit(ACTIONS.ADD_PEER, {
                peerID: clientID,
                createOffer: true,
            });
        });

        socket.join(roomID);
        shareRoomsInfo();
    });

    socket.on(ACTIONS.SEND_MESSAGE, ({ roomID, message }) => {
        io.to(roomID).emit(ACTIONS.RECEIVE_MESSAGE, { message, user: { id: socket.id } });
    });

    function leaveRoom() {
        const { rooms } = socket;

        Array.from(rooms)
            // LEAVE ONLY CLIENT CREATED ROOM
            .filter(roomID => validate(roomID) && version(roomID) === 4)
            .forEach(roomID => {

                const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

                clients.forEach(clientID => {
                    io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
                        peerID: socket.id,
                    });

                    socket.emit(ACTIONS.REMOVE_PEER, {
                        peerID: clientID,
                    });
                });

                socket.leave(roomID);
            });

        shareRoomsInfo();
    }

    socket.on(ACTIONS.LEAVE, leaveRoom);
    socket.on('disconnecting', leaveRoom);

    socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
        console.log(`Relaying SDP from ${socket.id} to ${peerID}`);
        io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
            peerID: socket.id,
            sessionDescription,
        });
    });

    socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
        console.log(`Relaying ICE from ${socket.id} to ${peerID}`);
        io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
            peerID: socket.id,
            iceCandidate,
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server started at ${PORT}`);
});
