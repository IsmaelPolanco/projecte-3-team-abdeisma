const socket = io();

const createButton = document.getElementById("createButton");
const nicknameInput = document.getElementById("nicknameInput");
const sendButton = document.getElementById("sendButton");
const messageElement = document.getElementById('message');
const startButton = document.getElementById('start-button');

if (sendButton) {
  sendButton.addEventListener("click", send);
}

function send() {
  const nickname = nicknameInput.value;
  socket.emit("nickname", { nickname });
}

socket.on('nickname recibido', function(data) {

  console.log(data)
  if (data.redirectUrl) {
       sessionStorage.setItem('socketId', data.socketID);
       sessionStorage.setItem('nicknameUser', data.nicknameUser);
       const socketID = sessionStorage.getItem('socketId');
       const nicknameUser = sessionStorage.getItem('nicknameUser');
       console.log("Valor de socketId en sessionStorage:", socketID);
       console.log("Valor de nicknameUser en sessionStorage:", nicknameUser);
      //redirigir a la pàgina home
      window.location.href = data.redirectUrl;
  }
 });

const nicknameUser = sessionStorage.getItem('nicknameUser');
const socketID = sessionStorage.getItem('socketId');

// Enviar la información al servidor independientemente de si el el usu puso el nombre o no
socket.emit("nicknameUser", { nicknameUser });

// Verificar si ya se redirigió 
const redirected = sessionStorage.getItem('redirected');

// Si no se ha redirigido, manejar el evento de redirección desde el servidor
if (!redirected) {
   socket.on("redirect", (data) => {
       const redirectUrl = data.redirectUrl;
       console.log("Redirigiendo a:", redirectUrl);

       // Marcar que ya se ha realizado la redirección en sessionStorage
       sessionStorage.setItem('redirected', 'true');

       // Realizar la redirección del lado del cliente
       console.log(messageElement);
       window.location.href = redirectUrl;
      
   });
} else {
   // Si ya se ha redirigido, eliminar la marca de sessionStorage
   sessionStorage.removeItem('redirected');
}

socket.on("connect", function () {
  console.log("Connexió amb el servidor");
});

//esto llama a "get users"
socket.emit("get users");

// Gestionar la respuesta con todos los uusarios
socket.on("users", function(data) {
  const userList = data;
  console.log("Llista d'usuaris:", userList);
});

if (createButton) {
createButton.addEventListener("click", function() {
  // Redirigir a la pagina admin.html
  window.location.href = "admin.html";
});
}

//crear partida
document.addEventListener("DOMContentLoaded", function () {
  // Verificar si estem en admin.html
  if (window.location.href.endsWith("admin.html")) {
     // Obtener el nickname 
     const nicknameLocal = sessionStorage.getItem("nicknameUser");

     // Completar automáticamente el campo de entrada de título con el nickname
     const titleInput = document.getElementById("title");
     if (titleInput) {
         titleInput.value = "Partida de " + nicknameLocal;
     }
      document.getElementById("createGameForm").addEventListener("submit", function (event) {
          event.preventDefault();
          console.log("Formulario enviado");

          // Guardar los datos en el formulario
          const formData = {
              title: document.getElementById("title").value,
              quantity: document.getElementById("quantity").value,
              topics: Array.from(document.querySelectorAll('input[name="topic"]:checked')).map(topic => topic.value),
              nicknameAdmin: sessionStorage.getItem("nicknameUser"),
               time: document.getElementById("time").value,
          };

          // Emitir un evento al servidor con los datos de los formularios
          socket.emit("crear partida", formData);
      });
  } else {
      //console.log("No estas en admin.html");
  }
 });

//assignar un titulo
document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const nickname = params.get("nickname");
  const storedNickname = sessionStorage.getItem("nicknameUser");
  // Modificar el título en lobby.html
  const titleLobby = document.getElementById("titleLobby");
  if (titleLobby && nickname) {
      titleLobby.innerText = "Partida de " + nickname;

      // Ocultar boton de emepzar si no coincide el nikname
      const startButton = document.getElementById("start-button");
      if (storedNickname !== nickname) {
          startButton.style.display = "none";
      }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  if (window.location.href.endsWith("home.html")) {
   
      // Obtener elementos del DOM
      const linkInput = document.getElementById("linkInput");
      const entrarButton = document.getElementById("entrarButton");

      // Agregar un evento de clic al botón "Entrar"
      entrarButton.addEventListener("click", function () {
          // Obtener la URL ingresada por el usuario
          const lobbyUrl = linkInput.value;
          // Redirigir al lobby
          window.location.href = lobbyUrl;
      });
  } else {
     // console.log("No estas en home.html");
  }
});

// Extraer parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const idPartida = urlParams.get('partida');
const nicknameUrl = urlParams.get('nickname');
console.log(nicknameUser)
console.log(socketID)

if (idPartida && nicknameUrl) {
   socket.emit("join game", { idPartida, nicknameUser, socketID });
}

// partida configuradad
socket.on("preguntas partida", function(dataPartida) {
   const { idPartida, preguntasPartida, nicknameAdmin, time } = dataPartida;
   console.log(dataPartida);
   sessionStorage.setItem('idPartida', idPartida);
   
   sessionStorage.setItem('dataGame', JSON.stringify(dataPartida));
   // Redirigir a la página lobby.html con el identificador único en la URL
   const lobbyUrl = `http://localhost:3000/lobby.html?partida=${dataPartida.idPartida}&nickname=${dataPartida.nicknameAdmin}`;
   window.location.href = lobbyUrl;
   
});

if (startButton) {
   startButton.addEventListener("click", start);
}

function start() {
   const json = sessionStorage.getItem('dataGame');
   const dataGame = JSON.parse(json);
   socket.emit("preguntas configurades", dataGame);
}

//la partida comienza
socket.on("start game", function(data) {
  const { idPartida, preguntasPartida, nicknameAdmin, time } = data;

 const jsonString = JSON.stringify(data);
 sessionStorage.setItem('dataGlobal', jsonString);

 const jsonGlobal = sessionStorage.getItem('dataGlobal');
 const dataGameGlobal = JSON.parse(jsonGlobal);
 const lobbyUrl = `http://localhost:3000/game.html?partida=${dataGameGlobal.idPartida}&nickname=${dataGameGlobal.nicknameAdmin}`;
 window.location.href = lobbyUrl;

});

// obtener la lista de los usuarios en lista
socket.on("users in room", function(data) {
  const usernamesArray = data.usernamesArray;
  //pasas el usernamesArray al server y lo llama en game.js 
  console.log("Usuaris en la sala:", usernamesArray);

  const jsonString = JSON.stringify(data);
  sessionStorage.setItem('usersGame', jsonString);

  const userListElement = document.getElementById("user-list");

  if (window.location.pathname.endsWith("lobby.html")) {
  // Limpia la lista actual
  userListElement.innerHTML = "";

  // Actualiza la lista con los nuevos usuarios
  usernamesArray.forEach(username => {
      const liElement = document.createElement("li");
      liElement.textContent = username;
      userListElement.appendChild(liElement);
  });
}
});

// JUEGO INCIADO
if (window.location.pathname.endsWith("game.html")) {
  const jsonGlobal = sessionStorage.getItem('dataGlobal');
  const dataGameGlobal = JSON.parse(jsonGlobal);
  console.log(dataGameGlobal);

  const usersGame = sessionStorage.getItem('usersGame');
  const usersData = JSON.parse(usersGame);
  console.log(usersData)

const usersArray = Array.isArray(usersData) ? usersData : [usersData];

 socket.emit("users started", {
   users: usersArray,
   roomId: dataGameGlobal.idPartida,
   preguntas: dataGameGlobal.preguntasPartida,
 });
 socket.emit("game started", {
   time: dataGameGlobal.time,
   roomId: dataGameGlobal.idPartida,
  
});

socket.on("new question", function(data) {
  if (data && data.question) {
      const { question } = data;
      console.log("Primer pregunta para todos ", data);
      // Resto del código...
  } else {
      console.error("Data o data.question no definidos");
  }
});


  // Función que envía el contenido de la respuesta seleccionada
  function sendAnswer(option){
    console.log('Opción seleccionada:',option);
    socket.emit('respuestaSeleccionada', { option: option });
  }

  // Función que almacena la cantidad de clics que se ha hecho a cada botón y ejecuta la función que deshabilita el resto de los botones
  function handleButtonClick(buttonIndex) {
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach((button, index) => {
        if (index === buttonIndex) {
               button.classList.add('clicked');
        } else {
            button.classList.remove('clicked');
            button.classList.add('disabled');
            button.disabled = true; 
        }
    });
    // incremenete el contador de clics
    clicks[buttonIndex]++;
//deshabilita los demas botones
    disableAllButtons();
}


  //define el admin de la partida
  let userAdmin = dataGameGlobal.nicknameAdmin;

// esconde el boton si no es admin

const nicknameJugador = sessionStorage.getItem('nicknameUser');
const nicknameAdmin = userAdmin;

// Obtener referencia al botón "Siguiente pregunta"

const nextQuestionButton = document.getElementById("next-question");
if (nextQuestionButton) {
    nextQuestionButton.addEventListener("click", function() {
        // Resto del código...
    });
} else {
    console.error("Elemento 'next-question' no encontrado");
}
// Comparar los nicknames
if (nicknameJugador !== nicknameAdmin) {
    nextQuestionButton.style.display = "none";
}

  const tbodyElement = document.querySelector("#user-table tbody");

  // Limpiar el contenido actual de la tabla
  tbodyElement.innerHTML = "";

  // Rellenar la tabla con los usuarios dinámicamente
  usersData.usernamesArray.forEach((username, index) => {
    const trElement = document.createElement("tr");

    // Columna de puntos, empieza en 0
    const tdPunts = document.createElement("td");
    tdPunts.textContent = "0";
    trElement.appendChild(tdPunts);

    // Columna de nombre de nikcnames
    const tdUsername = document.createElement("td");
    tdUsername.textContent = username;
    trElement.appendChild(tdUsername);

    // Columna de aciertos, empieza en 0
    const tdAciertos = document.createElement("td");
    tdAciertos.textContent = "0";
    trElement.appendChild(tdAciertos);

    // Columna de fallos, empieza en 0
    const tdFallos = document.createElement("td");
    tdFallos.textContent = "0";
    trElement.appendChild(tdFallos);

    // Columna de porcentaje de respuestas correctas/incorrectas, comienza con 0%
    const tdPorcentaje = document.createElement("td");
    tdPorcentaje.textContent = "0%";
    trElement.appendChild(tdPorcentaje);

    // Agregar fila a tbody
    tbodyElement.appendChild(trElement);
  });

   // funcion que recibe la pregunta del server
   function mostrarPregunta(index) {
    // Introduce el número del countdown 
    const countD = document.getElementById("countdown");
    countD.textContent = dataGameGlobal.time;
    console.log(dataGameGlobal.time);

    // Verifica si la pregunta para el índice dado está definida
    if (dataGameGlobal.preguntasPartida[index]) {
        // Introduce el contenido de la primera pregunta en el elemento "pregunta"
        const pregunta = document.getElementById("pregunta");
        pregunta.textContent = dataGameGlobal.preguntasPartida[index].pregunta;

        const respA = document.getElementById("resposta-a");
        const respB = document.getElementById("resposta-b");
        const respC = document.getElementById("resposta-c");
        const respD = document.getElementById("resposta-d");

        respA.textContent = dataGameGlobal.preguntasPartida[index].respostes['a'];
        respB.textContent = dataGameGlobal.preguntasPartida[index].respostes['b'];
        respC.textContent = dataGameGlobal.preguntasPartida[index].respostes['c'];
        respD.textContent = dataGameGlobal.preguntasPartida[index].respostes['d'];

        // Introduce el contenido de la fuente en el elemento 'referencia'
        const refeR = document.getElementById("referencia");
        refeR.href = dataGameGlobal.preguntasPartida[index].font;
    } else {
        console.error("Pregunta no definida para el índice:", index);
    }
}

// Inicializar con la primera pregunta 
let preguntaIndex = 0;
mostrarPregunta(preguntaIndex);

nextQuestionButton = document.getElementById("next-question");

nextQuestionButton.addEventListener("click", function() {
    // Incrementa el índice
    preguntaIndex++;

    // Mostrar la siguiente pregunta
    mostrarPregunta(preguntaIndex);
});
}
