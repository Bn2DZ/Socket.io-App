$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  // Initialise les variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username // Entrée pour nom d'utilisateur
  var $messages = $('.messages'); // Messages area // zone de messages
  var $inputMessage = $('.inputMessage'); // Input message input box // Boîte de saisie du message

  var $loginPage = $('.login.page'); // The login page // La page de connexion
  var $chatPage = $('.chat.page'); // The chatroom page // La page de discussion

  // Prompt for setting a username
  // Invite à définir un nom d'utilisateur
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io();

  const addParticipantsMessage = (data) => {
    var message = '';
    if (data.numUsers === 1) {
      message += "Il y a 1 participant";
    } else {
      message += "Il y a " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  // Définit le nom d'utilisateur du client
  const setUsername = () => {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    // Si le nom d'utilisateur est valide
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      // Indique ton nom d'utilisateur au serveur
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  // Envoie un message de chat
  const sendMessage = () => {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    // Empêche l'injection de balises dans le message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    // s'il y a un message non vide et une connexion socket
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      // dit au serveur d'exécuter 'nouveau message' et d'envoyer un paramètre
      socket.emit('new message', message);
    }
  }

  // Log a message
  // Enregistrer un message
    const log = (message, options) => {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  // Ajoute le message de chat visuel à la liste de messages
  const addChatMessage = (data, options) => {
    // Don't fade the message in if there is an 'X was typing'
    // Ne collez pas le message s'il y a un 'X était en train de taper'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  // Ajoute le message de discussion visuel
  const addChatTyping = (data) => {
    data.typing = true;
    data.message = "est en train d'écrire";
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  // Supprime le message de discussion visuel
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)


  // Ajoute un élément de message aux messages et défile vers le bas
  // el - L'élément à ajouter en tant que message
  // options.fade - Si l'élément doit être en fondu (valeur par défaut = true)
  // options.prepend - Si l'élément doit précéder
  // tous les autres messages (default = false)

  const addMessageElement = (el, options) => {
    var $el = $(el);

    // Setup default options
    // Configurer les options par défaut
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    // Appliquer les options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  // Empêche l'entrée d'avoir du balisage injecté
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }

  // Updates the typing event
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(() => {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  // Obtient les messages 'X est en train de taper' d'un utilisateur
  const getTypingMessages = (data) => {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  // Obtient la couleur d'un nom d'utilisateur via notre fonction de hachage
  const getUsernameColor = (username) => {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    // calculer la couleur
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events
  // événements clavier

  $window.keydown(event => {
    // Auto-focus the current input when a key is typed
    // Mise au point automatique de l'entrée actuelle quand une touche est tapée
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    // Quand le client appuie sur ENTREE sur son clavier
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', () => {
    updateTyping();
  });

  // Click events
  // événements de clic
  
  // Focus input when clicking anywhere on login page
  // Mise au point lorsque vous cliquez n'importe où sur la page de connexion
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  // Concentrez l'entrée lorsque vous cliquez sur la bordure de l'entrée du message
  $inputMessage.click(() => {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  // événements Socket
  socket.on('login', (data) => {
    connected = true;
    // Display the welcome message
    // Afficher le message de bienvenue
    var message = "Bienvenu à Socket.IO Chat– ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  // Chaque fois que le serveur émet un "nouveau message", met à jour le corps du chat
  socket.on('new message', (data) => {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  // Chaque fois que le serveur émet "utilisateur rejoint", enregistrez-le dans le corps de la discussion.
  socket.on('user joined', (data) => {
    log(data.username + ' a rejoint le groupe');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  // Chaque fois que le serveur émet un "utilisateur gauche", enregistrez-le dans le corps de la discussion.
  socket.on('user left', (data) => {
    log('Bifurcation de ' + data.username);
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  // Chaque fois que le serveur émet une "saisie", affiche le message de saisie
  socket.on('typing', (data) => {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  // Chaque fois que le serveur émet un 'arrêt de la saisie', supprime le message de frappe
  socket.on('stop typing', (data) => {
    removeChatTyping(data);
  });

  socket.on('disconnect', () => {
    log('vous avez été déconnecté');
  });

  socket.on('reconnect', () => {
    log('vous avez été reconnecté');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('reconnect_error', () => {
    log('tentative de reconnexion a échoué ');
  });

});
