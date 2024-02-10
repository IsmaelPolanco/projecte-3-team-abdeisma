const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = express();
const httpServer = createServer(app);

app.use(express.static("public"));

const io = new Server(httpServer, {});

const fs = require("fs");
// Cargar les preguntas desde l'arxiu preguntas.json
const preguntas = JSON.parse(fs.readFileSync("preguntas.json", "utf-8"));
//generar un identificador únic per cada partida creada
const { v4: uuidv4 } = require('uuid');
const users = [];
const socketUsernames = {};
let temps;
//objecte que guarda les estadistiques de cada jugador
const userScores = {};
//objecte que guarda les preguntas de la partida
const preguntasPerSala = {};
//objecte per guardar el index de les preguntas per cada partida (pregunta[0]...)
let currentQuestionIndex = {};
//array que guarda quants clics s'han fet a cada resposta
var clickCounts = [0, 0, 0, 0];
//guardar registre de les partides creades
const partides = {};


io.on("connection", (socket) => {
   console.log('Connectat un client...')
  //socket.data.nickname = "alice";

//middleware comprovar si usuari té nickname
  socket.on("nicknameUser", (data) => {
   const nicknameUser = data.nicknameUser;


   // verificar si usuari ha proporcionat username
   if (nicknameUser) {
       // el usuari té nickname
       //console.log("nicknameUser:", nicknameUser);
       usernameUser = nicknameUser;
     
   } else {
       // no té nickname = redirecció a index.html
       console.log("Usuari no ha proporcionat nickname.");
       io.to(socket.id).emit("redirect", { redirectUrl: "/index.html" });
   }
});
 
  //socket obtenir nickname
  socket.on("nickname", function(data) {
         const socketID = socket.id;
          socket.nickname = data.nickname;
          const nicknameUser = socket.nickname;
          users.push({
              userID: socket.id,
              username: socket.nickname
          });
          const redirectUrl = "/home.html";
          // respondre al que ha enviat
          socket.emit("nickname rebut",{"response":"ok", redirectUrl, socketID, nicknameUser})
  })
  //enviar array amb tots els usuaris
  socket.on("get users", function() {
    //console.log(users);
      socket.emit("users", { users });
  });

  socket.on("crear partida", function(configuracioPartida) {
    try {
        const { title, quantity, topics, nicknameAdmin, time } = configuracioPartida;
        //Array de preguntas per tema
        const preguntasPorTema = {};
        //Agrupar les preguntas segons el tema seleccionat
        preguntas.forEach((pregunta) => {
          const tema = pregunta.modalitat.toLowerCase();
          if (topics.includes(tema)) {
              preguntasPorTema[tema] = preguntasPorTema[tema] || [];
              preguntasPorTema[tema].push(pregunta);
          }
        });
        // Array de les preguntas finals
        const preguntasPartida = [];
  
        // Seleccionar preguntas aleatòrues segons el tema seleccionat
        topics.forEach((tema) => {
            const preguntasDelTema = preguntasPorTema[tema] || [];
            // Obtenir selecció de preguntas aleatòria d'aquest tema
            const preguntasAleatorias = shuffleArray(preguntasDelTema).slice(0, Math.floor(quantity / topics.length));
            preguntasPartida.push(...preguntasAleatorias);
        });
  
        // Funció per barrejar aleatòriament l'array de preguntas
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }
  
        // Si queda un número impar de preguntas, elegir aleatoriament una pregunta de qualsevol tema
        const preguntasRestantes = quantity - preguntasPartida.length;
        if (preguntasRestantes > 0) {
            const temasDisponibles = topics.filter((tema) => preguntasPorTema[tema]?.length > Math.floor(quantity / topics.length));
            for (let i = 0; i < preguntasRestantes; i++) {
                const temaAleatorio = temasDisponibles[Math.floor(Math.random() * temasDisponibles.length)];
                const preguntasDelTema = preguntasPorTema[temaAleatorio] || [];
                preguntasPartida.push(preguntasDelTema[Math.floor(Math.random() * preguntasDelTema.length)]);
            }
        }
  
          //generar identificador únic per la partida
          const idPartida = uuidv4();
          const salaPartida = `partida-${idPartida}`;
          const codiPartida = idPartida.slice(0, 6);
          //unir a l'usuari que ha creat la partida a la sala
          socket.join(salaPartida);
          
          //afegir aquesta partida al objecte de partides
          partides[salaPartida] = { 
            codiPartida: codiPartida,
            nicknameAdmin: nicknameAdmin,
            salaGame: idPartida,
          };
          console.log(partides)

         //socket.emit("preguntas partida", { idPartida, preguntasPartida, nicknameAdmin, time });
         socket.emit("preguntas partida", { idPartida, preguntasPartida, nicknameAdmin, time, codiPartida });
         
      } catch (error) {
          console.error("Error al procesar la sol·licitud de creació de la partida:", error);
      }
  });
 
//Gestionar el codi de partida enviat per l'usuari
socket.on("codi partida", (codiInputValue) => {
  //console.log("Codi rebut:", codiInputValue);
  
 // Verificar si existeix una partida amb el codi proporcionat
 const salaPartidaEncontrada = Object.values(partides).find(partida => partida.codiPartida === codiInputValue);

 if (salaPartidaEncontrada) {
  //si existeix es redirigira l'usuari a la lobby de la partida
  const sala = salaPartidaEncontrada.salaGame;
  const nicknameCreador = salaPartidaEncontrada.nicknameAdmin;
  console.log("La partida existeix.");
  socket.emit("unir partida", { sala, nicknameCreador, codiInputValue });
    
 } else {
     // Si el codi no existeix li faré saber
     console.log("La partida no existeix.");
     socket.emit("no existeix");
 }
});


// gestionar quan un usuari s'uneix a traves de la URL
socket.on("join game", function(data) {
   const { idPartida, nicknameUser, socketID } = data;
   const salaPartida = `partida-${idPartida}`;
   socket.join(salaPartida);

   // Asociar el socket.id amb el username
   socketUsernames[socket.id] = nicknameUser;
   console.log(`${nicknameUser} s'ha unit a la lobby: ${salaPartida}`);
  
   // Obtenir la llista d'usuaris que s'han unit a la sala i els seus usernames
   const usersInRoom = io.sockets.adapter.rooms.get(salaPartida);
   const usernamesArray = usersInRoom ? Array.from(usersInRoom).map(socketID => socketUsernames[socketID]) : [];

   //Enviar la llista d'usuaris al client per mostrar-los en la llista
   io.to(salaPartida).emit("users in room", { usersArray: Array.from(usersInRoom), usernamesArray });
   
});

// redirigir als usuaris de room(data) a game.html
socket.on("startGame", function(data) {
   const { idPartida } = data;
   const salaPartida = `partida-${idPartida}`;

   // Emitir un event a tots els usuaris de la sala per dirigir-los a game.html
   io.to(salaPartida).emit("redirectToGame");
});

//passar les preguntas a game.js
socket.on("preguntas configurades", function(data) {
   const { idPartida, preguntasPartida, nicknameAdmin, time } = data;
   const salaPartida = `partida-${idPartida}`;
    console.log("partida comensada" + idPartida)
   io.to(salaPartida).emit('start game', data);

   
});

socket.on("holaa", function(data) {
const salaPartida = `partida-${data}`;
//console.log("hola  " + salaPartida);
    io.to(salaPartida).emit("holaaa",{"response":"ok"})
});


//inicialitzar objecte de preguntas d'aquella partida
socket.on("users started", function(data) {
  const { users, roomId, preguntas } = data;
  const salaPartida = `partida-${roomId}`;
 
 
  //guardar les preguntas en l'objecte global
  preguntasPerSala[salaPartida] = preguntas;

  //cada sala té un index independent per evitar errors amb múltiples partides simultanies
  currentQuestionIndex[salaPartida] = 0;
 
  //console.log(userScores[salaPartida][users[0]], preguntasPerSala[salaPartida]);
 });
 
 
 socket.on("game started", function(data) {
  const { time, roomId } = data;
  const salaPartida = `partida-${roomId}`;
  //console.log("sala de la partida ", salaPartida);



  const roomsInfo = io.sockets.adapter.rooms;

    // Verificar si la sala específica existe en la información de las salas
    if (roomsInfo.has(salaPartida)) {
        // Obtener la cantidad de conexiones en la sala específica
        const connectionsInRoom = roomsInfo.get(salaPartida).size;

        // Mostrar la cantidad de conexiones por consola
        console.log("Quantitat de conexions en la sala " + salaPartida + ":", connectionsInRoom);
    }

  //obtenir les preguntas de l'objecte global
  const preguntas = preguntasPerSala[salaPartida];
  //obtenir l'index d'aquella partida
  const currentIndex = currentQuestionIndex[salaPartida];
  const timeNumeric = parseInt(time) * 1000;
  
 //comprovar que hi han més preguntas
 if (currentIndex < preguntas.length) {
  //console.log(preguntas)
  // Iniciar el temporitzador per la pregunta actual
  let timer = setTimeout(() => {
    console.log("times up enviat!")
    socket.emit("time's up", { time, roomId });
  }, timeNumeric);
  
 
    //hi ha més preguntas, enviar-la
    io.to(salaPartida).emit("new question", { question: preguntas[currentIndex], time: time });
    console.log(currentQuestionIndex)
    currentQuestionIndex[salaPartida]++;
  } else {
    // no hi ha més preguntas, enviar "game over"
    io.to(salaPartida).emit("game over");
  }
 });

 //Quan acaba el temps de la pregunta, donar 7 segons per comprovar els resultats
 socket.on("extra time", function(data) {
  const { time, roomId } = data;
  const salaPartida = `partida-${roomId}`;
  //console.log("hola desde time's up")

  //Afegir un contador abans de començar la següent pregunta
  setTimeout(() => {
    //console.log(time, roomId)
    // Emitir "game started" per a que comensi la següent
    socket.emit("time finished", { time, roomId });
  }, 7000); // 5000 mil·Lisegons = 5 segundos
});

// Rebre les respostes, comprovar el resultat i actualitzar objecte "userScores"
socket.on("resposta", function(data) {
  const { buttonIndex, pregunta, idPartida, nicknameUser, tempsResposta, tempsPregunta } = data;
  const preguntaObj = JSON.parse(pregunta);
  
 // Mapejar les lletres per obtenir-les en format números
const indexMap = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };

// Obtindre l'índex numèric
const numericIndex = indexMap[buttonIndex];

// Incrementar el contador en l'array clickCounts utilitzant index
clickCounts[numericIndex]++;

  console.log("array: ", clickCounts)
  //console.log("temps de la resposta: ", tempsResposta)
  const username = nicknameUser;
  const salaPartida = `partida-${idPartida}`;
  //console.log("resposta clicada", preguntaObj.respostes[buttonIndex], "amb temps: ", tempsPregunta);

  // Crear puntuació per l'usuari si encara no la té
  if (!userScores[nicknameUser]) {
    userScores[nicknameUser] = {
      puntuacio: 0,
      correctes: 0,
      incorrectes: 0,
    };
  }

  //Resposta de l'usuari i resposta correcta
  const respostaUsuari = preguntaObj.respostes[buttonIndex];
  const respostaCorrecta = preguntaObj.correcta;

  // Calcular la puntuació basada en el temps restant 
  let puntuacio = 0;
  let isCorrecta = false;
  if (respostaUsuari === respostaCorrecta) {
   //Resposta correcta:
    const maxPuntuacio = 750; // Puntuació màxima possible
    const minPuntuacio = 100; //Puntuació mínima possible
    const tempsMaxim = tempsPregunta; 
    const tempsMinim = 1; 
    const tempsRestantNormalitzat = tempsResposta / tempsMaxim; //normalitzar el temps restant

    // Calcular la puntuació basant-se en el temps restant
    puntuacio = Math.round(minPuntuacio + (maxPuntuacio - minPuntuacio) * tempsRestantNormalitzat * 0.5); // Ajustar el factor de tiempo

    // Actualitzar la puntuació de l'usuari
    userScores[nicknameUser].correctes++;

    // Actualizar la puntuación acumulada del usuario
    userScores[nicknameUser].puntuacio += puntuacio;

    // Definir que la resposta es correcta
    isCorrecta = true;
  } else {
    // Resposta incorrecta: (no suma ni resta punts, només augmenta el número d'incorrectes)
    userScores[nicknameUser].incorrectes++;
  }

  // Enviar els Scores actualitzats, el número de clics i si ha sigut correcta o no
  io.to(salaPartida).emit("noves puntuacions", { userScores: userScores[nicknameUser], username, isCorrecta, clickCounts });

  clickCounts = [0, 0, 0, 0];
});



socket.on('disconnect', function() {
  console.log("desconnectat!")
});

//tornar a jugar (reiniciar puntuacions...)
socket.on("play again", function(data) {
  const { nicknameAdmin, idRoom, nicknameUser, usersArray } = data;
  console.log("data de back to lobyy:: ", data)

  const userList = usersArray[0].usersArray;
console.log("Llista de id:", userList);

const usernameList = usersArray[0].usernamesArray;
console.log("Llista de noms:", usernameList);
  const salaPartida = `partida-${idRoom}`;
  

  // Suponiendo que usernamesArray contiene los nombres de usuario
usersArray[0].usernamesArray.forEach((username) => {
  // Vaciar el objeto de puntuaciones para cada usuario
  userScores[username] = {
      puntuacio: 0,
      correctes: 0,
      incorrectes: 0,
  };
});

  //enviar a tots els de la sala un missatge
  io.to(salaPartida).emit("back to lobby", { nicknameAdmin, idRoom });
  });
  
//reiniciar puntuacions
socket.on("restart scores", function(data) {
  const { nicknameAdmin, idRoom, usersArray } = data;
 // console.log("data de restart scores: ", data)
 
 
  const userList = usersArray[0].usersArray;
  console.log("Llista de id:", userList);
 
 
  const usernameList = usersArray[0].usernamesArray;
  console.log("Llista de noms:", usernameList);
 
 
  // Suponiendo que usernamesArray contiene los nombres de usuario
 usersArray[0].usernamesArray.forEach((username) => {
  // Vaciar el objeto de puntuaciones para cada usuario
  userScores[username] = {
      puntuacio: 0,
      correctes: 0,
      incorrectes: 0,
  };
 });
 console.log("scores: ", userScores)
  });
 

});

/*
var comptador = 1;
setInterval(() => {
  console.log('envio missatge a tots els clients')
  io.emit('salutacio', comptador);
  comptador++;
}, 5000);
*/
// Crear una función para generar un código alfanumérico corto
function generarCodi() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';

  // Generar un código de longitud deseada (por ejemplo, 6 caracteres)
  for (let i = 0; i < 6; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres.charAt(indice);
  }

  return codigo;
}


httpServer.listen(3000, ()=>
  console.log(`Server listening at http://localhost:3000`)
);