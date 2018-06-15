// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3001;

server.listen(port, () => {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:3000");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Chatroom

var numUsers = 0;

io.on('connection', (socket) => {
    var addedUser = false;

    // when the client emits 'new message', this listens and executes
    socket.on('new message', (data) => {
        // we tell the client to execute 'new message'
        console.log("new message" + {
            username: socket.username,
            message: data
        });
        socket.to(socket.gameid).emit('new message', { //except sender
            username: socket.username,
            message: data
        });
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', (data) => {

        if (addedUser) return;

        socket.gameid = data.gameId;
        socket.join(socket.gameid);
        console.log("added user here " + data.username + " joined "+ socket.gameid);
        // we store the username in the socket session for this client
        socket.username = data.username;
        ++numUsers;
        addedUser = true;
        io.in(socket.gameid).emit('login', {
            numUsers: numUsers
        });
        console.log(numUsers);
        // echo globally (all clients) that a person has connected
        io.in(socket.gameid).emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', () => {
        io.in(socket.gameid).emit('typing', {
            username: socket.username
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', () => {
        console.log(socket.username+ " stopped typing");
        socket.to(socket.gameid).emit('stop typing', {
            username: socket.username
        });
    });

    socket.on('selected cards', () => {
        console.log(socket.username);
        io.in(socket.gameid).emit('stop typing', {
            username: socket.username
        });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
        if (addedUser) {
            --numUsers;

            // echo globally that this client has left
            io.in(socket.gameid).emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
});