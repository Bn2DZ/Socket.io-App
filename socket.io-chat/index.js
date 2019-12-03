// Setup basic express server
//Configuration du serveur express de base

var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing 
// routage
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom
// Tchat
var numUsers = 0;

io.on('connection', (socket) => {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  // quand le client émet un 'nouveau message', ceci écoute et exécute
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  // quand le client émet 'add user', ceci écoute et exécute
  socket.on('add user', (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    // nous stockons le nom d'utilisateur dans la session socket pour ce client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });

    // echo globally (all clients) that a person has connected
    // indique globalement (à tous les clients) qu'une personne s'est connectée
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });


  });

  // when the client emits 'typing', we broadcast it to others
  // quand le client émet 'en tapant', nous le diffusons à d'autres
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  // lorsque le client émet un 'arrêt de la saisie', nous le diffusons à d'autres
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  // quand l'utilisateur se déconnecte .. effectue ceci
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      // répète globalement que ce client est parti
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
