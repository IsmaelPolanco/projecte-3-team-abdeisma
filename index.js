const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = express();
const httpServer = createServer(app);

app.use(express.static("public"));

const io = new Server(httpServer, {});

const fs = require("fs");
// Cargar supuestamente las preguntas del .json
const preguntas = JSON.parse(fs.readFileSync("preguntas.json", "utf-8"));
//genera id para cada partida
const { v4: uuidv4 } = require('uuid');
const users = [];
const socketUsernames = {};
let temps;
//objecte que guarda les estadistiques de cada jugador
const userScores = {};
//objecte que guarda les preguntes de la partida
const preguntesPerSala = {};
//objecte per guardar el index de les preguntes per cada partida (pregunta[0]...)
let currentQuestionIndex = {};
//array que guarda quants clics s'han fet a cada resposta
var clickCounts = [0, 0, 0, 0];
//guardar registre de les partides creades
const partides = {};


io.on("connection", (socket) => {
   console.log("Usuario conectado:", socket.id);

   // Manejar desconexión de clientes
   socket.on("disconnect", () => {
       console.log("Usuario desconectado:", socket.id);
   });

   // Manejar mensaje de chat
   socket.on("chatMessage", function(data) {
       const { message } = data;
       const username = getUsername(socket.id); // esto es para ver el nombre del usu
       io.emit("chatMessage", { username, message });
   });

//middleware comprueba si tienen nickname el usuario
  socket.on("nicknameUser", (data) => {
   const nicknameUser = data.nicknameUser;

   // verificar si el usuario ha proporcionado username
   if (nicknameUser) {
       // el usuari té nickname
       usernameUser = nicknameUser;
     
   } else {
       // no tiene nickname = redirecció a index.html
       console.log("El usuario no ha proporcionado nickname.");
       io.to(socket.id).emit("redirect", { redirectUrl: "/index.html" });
   }
});
 
  //socket obtiene nickname
  socket.on("nickname", function(data) {
         const socketID = socket.id;
          socket.nickname = data.nickname;
          const nicknameUser = socket.nickname;
          users.push({
              userID: socket.id,
              username: socket.nickname
          });
          const redirectUrl = "/home.html";
          // respondre a lo que envia
          socket.emit("nickname recibido",{"response":"ok", redirectUrl, socketID, nicknameUser})
  })
  //enviar array con todoos los usus
  socket.on("get users", function() {
    //console.log(users);
      socket.emit("users", { users });
  });

    //socket crear partida, filtra las preguntas que escogieron en el formulario
    socket.on("crear partida", function(configuracioPartida) {
      try {
          const { title, quantity, topics, nicknameAdmin, time } = configuracioPartida;
           //array de preguntas de cada tema
          const preguntasPorTema = {};
           //Agrupar preguntas 
          preguntas.forEach((pregunta) => {
              const tema = pregunta.modalitat.toLowerCase();
              if (topics.includes(tema)) {
                  preguntasPorTema[tema] = preguntasPorTema[tema] || [];
                  preguntasPorTema[tema].push(pregunta);
              }
          });
           // array de las preguntas finals
          const preguntasPartida = [];
            //calcular preguntas x tema
          const cantidadPorTema = Math.floor(quantity / topics.length);
           //Seleccionar preguntas del tema
          topics.forEach((tema) => {
              const preguntasDelTema = preguntasPorTema[tema] || [];
              preguntasPartida.push(...preguntasDelTema.slice(0, cantidadPorTema));
          });

          const preguntasRestantes = quantity - preguntasPartida.length;
          if (preguntasRestantes > 0) {
              const temasDisponibles = topics.filter((tema) => preguntasPorTema[tema]?.length > cantidadPorTema);
              for (let i = 0; i < preguntasRestantes; i++) {
                  const temaAleatorio = temasDisponibles[Math.floor(Math.random() * temasDisponibles.length)];
                  const preguntasDelTema = preguntasPorTema[temaAleatorio] || [];
                  preguntasPartida.push(preguntasDelTema[Math.floor(Math.random() * preguntasDelTema.length)]);
              }
          }
          //generar identificador únic per la partida
          const idPartida = uuidv4();
          const salaPartida = `partida-${idPartida}`;
          //une al usu a su partida creada 
          socket.join(salaPartida);
          socket.emit("preguntas partida", { idPartida, preguntasPartida, nicknameAdmin, time });
      } catch (error) {
          console.error("Error al procesar la solicitud de creación de la partida:", error);
      }
  });
 

// gestiona que el usuario se une por link url
socket.on("join game", function(data) {
   const { idPartida, nicknameUser, socketID } = data;
   const salaPartida = `partida-${idPartida}`;
   socket.join(salaPartida);

   socketUsernames[socket.id] = nicknameUser;
   console.log(`${nicknameUser} se unió a la lobby: ${salaPartida}`);
  
   // Obtenir lista de usurios y sus usernames
   const usersInRoom = io.sockets.adapter.rooms.get(salaPartida);
   const usernamesArray = usersInRoom ? Array.from(usersInRoom).map(socketID => socketUsernames[socketID]) : [];

   //Enviar la lista de usuarios al cliente para mostrarlos en la lista
   io.to(salaPartida).emit("users in room", { usersArray: Array.from(usersInRoom), usernamesArray });
   
});

// redirige los usuarios de data a game.html
socket.on("startGame", function(data) {
   const { idPartida } = data;
   const salaPartida = `partida-${idPartida}`;

   // emite un evento a todos los usuarios para llevarlos a game.html
   io.to(salaPartida).emit("redirectToGame");
});

//pasar les preguntas a game.js
socket.on("preguntas configurades", function(data) {
   const { idPartida, preguntasPartida, nicknameAdmin, time } = data;
   const salaPartida = `partida-${idPartida}`;
    console.log("partida comenzada" + idPartida)
   io.to(salaPartida).emit('start game', data);
});

socket.on("heey", function(data) {
const salaPartida = `partida-${data}`;
    io.to(salaPartida).emit("heeey",{"response":"ok"})
});

socket.on("users started", function(data) {
  const { users, roomId, preguntas } = data;
  const salaPartida = `partida-${roomId}`;
 
  // Inicializar la puntuación para cada usuario
  userScores[salaPartida] = {};
   users.forEach(user => {
    userScores[salaPartida][user] = {
      puntuacio: 0,
      incorrectes: 0,
      correctes: 0,
      percentatge: 0,
    };
  });
 
  // Almacenar las preguntas en el objeto global
  preguntasPerSala[salaPartida] = preguntas;
  });
 
 
 socket.on("game started", function(data) {
  const { time, roomId } = data;
  const salaPartida = `partida-${roomId}`;
  // Obtener las preguntas de la sala desde el objeto global
  const preguntas = preguntasPerSala[salaPartida];
  const timeNumeric = parseInt(time) * 1000;

  // Iniciar el temporizador para la pregunta actual
  let timer = setTimeout(() => {
    console.log("empieza el contador!")
    io.to(salaPartida).emit("time's up", { time, roomId });
    // Puedes realizar otras acciones al agotarse el tiempo
  }, timeNumeric);
 
  // Enviar la primera pregunta al cliente cuando inicia el juego
  io.to(salaPartida).emit("new question", preguntas[currentQuestionIndex]);
  currentQuestionIndex++;
 });

 socket.on("time's up", function(data) {
  const { time, roomId } = data;
  console.log("time's up")
  setTimeout(() => {
    socket.emit("game started", { time, roomId });
  }, 5000); //aqui van 5sec
});

});

httpServer.listen(3000, ()=>
  console.log(`Server listening at http://localhost:3000`)
  //server.listen(port,'0.0.0.0'()=>) {//}
);


