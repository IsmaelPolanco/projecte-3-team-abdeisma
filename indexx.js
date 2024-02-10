const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const app = express();
const httpServer = createServer(app);

app.use(express.static("public"));

const io = new Server(httpServer, {});

const fs = require("fs");
// Cargar la preguntas desde el arxivo  preguntas.json
const preguntas = JSON.parse(fs.readFileSync("preguntas.json", "utf-8"));
//genera un identificador unico para cada partida creada
const { v4: uuidv4 } = require("uuid");
const users = [];
const socketUsernames = {};
let temps;
//objeto que guarda les estadisticas de cada jugador
const userScores = {};
//objeto que guarda las preguntas de la partida
const preguntasPerSala = {};
//objeto para guardar el indice de las preguntas para cada partida
let currentQuestionIndex = {};
//array que guarda cuantos clicks se hicien para cada respuesta
var clickCounts = [0, 0, 0, 0];
//guarda el registro de las partidas creadas
const partides = {};

io.on("connection", (socket) => {
  console.log("Un cliente conectándose");

  //middleware comprobar si el usuario tiene nickname
  socket.on("nicknameUser", (data) => {
    const nicknameUser = data.nicknameUser;
    // verificar si el usuario proporcionó username
    if (nicknameUser) {
      // el usuari tiene nickname
      usernameUser = nicknameUser;
    } else {
      // en caso de no tener nickname te redirecciona a index.html
      console.log("el usuario no proporcionó nickname todavia.");
      io.to(socket.id).emit("redirect", { redirectUrl: "/index.html" });
    }
  });

  //socket obteniene nickname
  socket.on("nickname", function (data) {
    const socketID = socket.id;
    socket.nickname = data.nickname;
    const nicknameUser = socket.nickname;
    users.push({
      userID: socket.id,
      username: socket.nickname,
    });
    const redirectUrl = "/home.html";
    socket.emit("nickname rebut", {"response": "ok", redirectUrl, socketID, nicknameUser,});
  });
  //enviar array con todos los usuarios, mas que nada para comprobar los que hay
  socket.on("get users", function () {
    socket.emit("users", { users });
  });
  socket.on("crear partida", function (configuracioPartida) {
    try {
      const { title, quantity, topics, nicknameAdmin, time } = configuracioPartida;
      //Array de preguntas per tema
      const preguntasPorTema = {};
      //Agrupar les preguntas segun el tema seleccionado
      preguntas.forEach((pregunta) => {
        const tema = pregunta.modalitat.toLowerCase();
        if (topics.includes(tema)) {
          preguntasPorTema[tema] = preguntasPorTema[tema] || [];
          preguntasPorTema[tema].push(pregunta);
        }
      });
      const preguntasPartida = [];

      // Seleccionar preguntas aleatorias segun el tema seleccionado
      topics.forEach((tema) => {
        const preguntasDelTema = preguntasPorTema[tema] || [];
        // obtenemos la seleción de preguntas aleatòria de este tema
        const preguntasAleatorias = shuffleArray(preguntasDelTema).slice(
          0,
          Math.floor(quantity / topics.length)
        );
        preguntasPartida.push(...preguntasAleatorias);
      });

      // Función para barajar aleatoriamente el array de preguntas
      function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }

      // Si queda un número impar de preguntas, elegir aleatoriamente una pregunta de cualquier tema
      const preguntasRestantes = quantity - preguntasPartida.length;
      if (preguntasRestantes > 0) {
        const temasDisponibles = topics.filter(
          (tema) =>
            preguntasPorTema[tema]?.length >
            Math.floor(quantity / topics.length)
        );
        for (let i = 0; i < preguntasRestantes; i++) {
          const temaAleatorio = temasDisponibles[Math.floor(Math.random() * temasDisponibles.length)];
          const preguntasDelTema = preguntasPorTema[temaAleatorio] || [];
          preguntasPartida.push(preguntasDelTema[Math.floor(Math.random() * preguntasDelTema.length)]);
        }
      }

      //generar identificador unico para la partida
      const idPartida = uuidv4();
      const salaPartida = `partida-${idPartida}`;
      const codiPartida = idPartida.slice(0, 6);
      //unir al usuari que creó la partida a la sala
      socket.join(salaPartida);

      //añadir la partida al objecte de partides
      partides[salaPartida] = {
        codiPartida: codiPartida,
        nicknameAdmin: nicknameAdmin,
        salaGame: idPartida,
      };
      console.log(partides);

      socket.emit("preguntas partida", { idPartida, preguntasPartida, nicknameAdmin, time, codiPartida });
    } catch (error) {
      console.error("Error al procesar la sol·licitud de creació de la partida:", error);
    }
  });

  //Gestionar el codigo de partida enviado por el usuario
  socket.on("codi partida", (codiInputValue) => {
    // Verificar si existe una partida con el codigo proporcionado
    const salaPartidaEncontrada = Object.values(partides).find((partida) => partida.codiPartida === codiInputValue);

    if (salaPartidaEncontrada) {
      //si existe la partida se redirigirá el usuario a la lobby de la partida
      const sala = salaPartidaEncontrada.salaGame;
      const nicknameCreador = salaPartidaEncontrada.nicknameAdmin;
      console.log("La partida esta.");
      socket.emit("unir partida", { sala, nicknameCreador, codiInputValue });
    } else {
      console.log("La partida no esta.");
      socket.emit("no existe");
    }
  });

  //esto es para mostar como se unen los usuarios
  socket.on("join game", function (data) {
    const { idPartida, nicknameUser, socketID } = data;
    const salaPartida = `partida-${idPartida}`;
    socket.join(salaPartida);

    socketUsernames[socket.id] = nicknameUser;
    console.log(`${nicknameUser} se unió a la lobby: ${salaPartida}`);

    // Obtenir la lista de usuarios que se unieron a la sara y sus nicknames
    const usersInRoom = io.sockets.adapter.rooms.get(salaPartida);
    const usernamesArray = usersInRoom ? Array.from(usersInRoom).map((socketID) => socketUsernames[socketID]): [];

    //Enviar la lista de usuarios al client per mostrarlos en la lista
    io.to(salaPartida).emit("users in room", {
      usersArray: Array.from(usersInRoom), usernamesArray,});
  });

  // redirigir a los usuarios de room(data) a game.html
  socket.on("startGame", function (data) {
    const { idPartida } = data;
    const salaPartida = `partida-${idPartida}`;

    // Emitir un evento a todos los usuarios de la sala para redirigirlos a game.html
    io.to(salaPartida).emit("redirectToGame");
  });

  socket.on("preguntas configuradas", function (data) {
    const { idPartida, preguntasPartida, nicknameAdmin, time } = data;
    const salaPartida = `partida-${idPartida}`;
    console.log("partida comenzada" + idPartida);
    io.to(salaPartida).emit("start game", data);
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
 
  //inicializar el objeto de preguntas de la partida
  socket.on("users started", function (data) {
    const { users, roomId, preguntas } = data;
    const salaPartida = `partida-${roomId}`;

    //guardar las preguntas en el objeto global
    preguntasPerSala[salaPartida] = preguntas;

    //cada sala tiene un index independiente para evitar errorescon multiples partidas simultaneas
    currentQuestionIndex[salaPartida] = 0;
  });

  socket.on("game started", function (data) {
    const { time, roomId } = data;
    const salaPartida = `partida-${roomId}`;

    const roomsInfo = io.sockets.adapter.rooms;

    // Verificar si la sala específica existe en la información de las salas
    if (roomsInfo.has(salaPartida)) {
      // Obtener la cantidad de conexiones en la sala específica
      const connectionsInRoom = roomsInfo.get(salaPartida).size;

      console.log("Cantidad de usuarios que se conectaron a la partida " + salaPartida + ":",connectionsInRoom);
    }
    //obtenemos las preguntas del objeto global
    const preguntas = preguntasPerSala[salaPartida];
    //obtenemos el index de la partida
    const currentIndex = currentQuestionIndex[salaPartida];
    const timeNumeric = parseInt(time) * 1000;

    //aqui se comprueba si hay mas preguntas
    if (currentIndex < preguntas.length) {
      // iniciamos temporizador
      let timer = setTimeout(() => {
        console.log("aaaaaa enviado/timesup");
        socket.emit("time's up", { time, roomId });
      }, timeNumeric);

      io.to(salaPartida).emit("new question", {
        question: preguntas[currentIndex], time: time
      });
      console.log(currentQuestionIndex);
      currentQuestionIndex[salaPartida]++;
    } else {
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

  //Cuando acaba el timepo de la pregunta, darle un timpo para qeu comprueve el resultado
  socket.on("extra time", function (data) {
    const { time, roomId } = data;
    const salaPartida = `partida-${roomId}`;

    //añadir un contadro antes de comenzar la siguente pregunta
    setTimeout(() => {
      // Emitir "game started" para que comience la sigueinte
      socket.emit("time finished", { time, roomId });
    }, 7000); // 5000 mil·Lisegons = 5 segundos
  });

  // Recibir las respostas, comprobar el resultado y actualizar el objeto "userScores"
  socket.on("resposta", function (data) {
    const {
      buttonIndex,
      pregunta,
      idPartida,
      nicknameUser,
      tempsResposta,
      tempsPregunta,
    } = data;
    const preguntaObj = JSON.parse(pregunta);

    // Mapear las letras para obtener en format números
    const indexMap = { a: 0, b: 1, c: 2, d: 3 };

    // Obtener el índex numerico
    const numericIndex = indexMap[buttonIndex];

    //incrementa clicks usando index
    clickCounts[numericIndex]++;

    console.log("array: ", clickCounts);
    const username = nicknameUser;
    const salaPartida = `partida-${idPartida}`;

    // Crear puntuación para el usuario
    if (!userScores[nicknameUser]) {
      userScores[nicknameUser] = {
        puntuacio: 0,
        correctes: 0,
        incorrectes: 0,
      };
    }

    //Resposta del usuario y respuesta correcta
    const respostaUsuari = preguntaObj.respostes[buttonIndex];
    const respostaCorrecta = preguntaObj.correcta;

    // Calcular la puntuación basada en el tiempo restante
    let puntuacio = 0;
    let isCorrecta = false;
    if (respostaUsuari === respostaCorrecta) {
      //Respuesta correcta:
      const maxPuntuacio = 700; // Puntuación màxima posible
      const minPuntuacio = 50; //Puntuación mínima posible
      const tempsMaxim = tempsPregunta;
      const tempsMinim = 1;
      const tempsRestantNormalitzat = tempsResposta / tempsMaxim;

      // Calcular la puntuación basandose en el timepo restante
      puntuacio = Math.round(
        minPuntuacio +
          (maxPuntuacio - minPuntuacio) * tempsRestantNormalitzat * 0.5
      );

      // Actualiza la puntuació del usuario
      userScores[nicknameUser].correctes++;

      // Actualiza la puntuación acumulada del usuario
      userScores[nicknameUser].puntuacio += puntuacio;

      // Definir que la resposta es correcta
      isCorrecta = true;
    } else {
      //esto solo aumenta el numero de respuestas incorrectas
      userScores[nicknameUser].incorrectes++;
    }

    // Enviar las puntuaciones actualizadas, el número de clicks y si fue correcta o no
    io.to(salaPartida).emit("noves puntuacions", {
      userScores: userScores[nicknameUser],
      username,
      isCorrecta,
      clickCounts,
    });

    clickCounts = [0, 0, 0, 0];
  });
 
  socket.on("disconnect", function () {
    console.log("desconectado!");
  });

  //volver a jugar
  socket.on("play again", function (data) {
    const { nicknameAdmin, idRoom, nicknameUser, usersArray } = data;
    console.log("data de back to lobyy:: ", data);

    const userList = usersArray[0].usersArray;
    console.log("Lista de id:", userList);

    const usernameList = usersArray[0].usernamesArray;
    console.log("Lista de nombres:", usernameList);
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

    //enviar a todos los usuarios de la sala un mensaje
    io.to(salaPartida).emit("back to lobby", { nicknameAdmin, idRoom });
  });
 
  //reiniciar puntuaciones
  socket.on("restart scores", function (data) {
    const { nicknameAdmin, idRoom, usersArray } = data;

    const userList = usersArray[0].usersArray;
    console.log("Lista de id:", userList);

    const usernameList = usersArray[0].usernamesArray;
    console.log("Lista de nombres:", usernameList);

    // Suponiendo que usernamesArray contiene los nombres de usuario
    usersArray[0].usernamesArray.forEach((username) => {
      // Vaciar el objeto de puntuaciones para cada usuario
      userScores[username] = {
        puntuacio: 0,
        correctes: 0,
        incorrectes: 0,
      };
    });
    console.log("scores: ", userScores);
  });
});

// Crear una función para generar un código alfanumérico corto
function generarCodi() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";

  // esto generará un código de longitud
  for (let i = 0; i < 6; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    codigo += caracteres.charAt(indice);
  }

  return codigo;
}

httpServer.listen(3000, () =>
  console.log(`Server listening at http://localhost:3000`)
);
