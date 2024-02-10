const socket = io();


const createButton = document.getElementById("createButton");
const nicknameInput = document.getElementById("nicknameInput");
const sendButton = document.getElementById("sendButton");
const messageElement = document.getElementById("message");
const startButton = document.getElementById("start-button");


// Gestionar el nickname del usuario
if (sendButton) {
  sendButton.addEventListener("click", send);
}


function send() {
  const nickname = nicknameInput.value;
  socket.emit("nickname", { nickname });
}
// Guardar els valors en sessionStorage para no perderlos al redireccionar
socket.on("nickname rebut", function (data) {
  console.log(data);
  if (data.redirectUrl) {
    sessionStorage.setItem("socketId", data.socketID);
    sessionStorage.setItem("nicknameUser", data.nicknameUser);


    const socketID = sessionStorage.getItem("socketId");
    const nicknameUser = sessionStorage.getItem("nicknameUser");
    console.log("Valor de socketId en sessionStorage:", socketID);
    console.log("Valor de nicknameUser en sessionStorage:", nicknameUser);
    window.location.href = data.redirectUrl;
  }
});


// Declarar el id y username del usuario de forma global
const nicknameUser = sessionStorage.getItem("nicknameUser");
const socketID = sessionStorage.getItem("socketId");


// Enviar la información al servidor
socket.emit("nicknameUser", { nicknameUser });


// Verificar si el usuario tiene nickname o no
const redirected = sessionStorage.getItem("redirected");


// Si no se redirigió, se gestiona desde el servidor
if (!redirected) {
  socket.on("redirect", (data) => {
    const redirectUrl = data.redirectUrl;
    console.log("Redirigiendo a:", redirectUrl);


    // Marcar que ya se hizo hecha la redirecció en sessionStorage
    sessionStorage.setItem("redirected", "true");


    // Realitzamos la redirección a index.html
    console.log(messageElement);
    window.location.href = redirectUrl;
  });
} else {
  // Si ya se redirigió eliminamos la marca de sessionStorage
  sessionStorage.removeItem("redirected");
}


// llamar "get users"
socket.emit("get users");


// Gestionar la respuesta con todos los usuarios
socket.on("users", function (data) {
  const userList = data;
  console.log("Llista d'usuaris:", userList);
});


// Redirige a la pagina para crear partida
if (createButton) {
  createButton.addEventListener("click", function () {
    window.location.href = "admin.html";
  });
}


// Crea la partida
document.addEventListener("DOMContentLoaded", function () {
  // Verificamos si estamos en admin.html
  if (window.location.href.endsWith("admin.html")) {
    const nicknameLocal = sessionStorage.getItem("nicknameUser");


    // Completar automaticament el campo titulo con el nombre del usuario
    const titleInput = document.getElementById("title");
    if (titleInput) {
      titleInput.value = "Partida de " + nicknameLocal;
    }
    document
      .getElementById("adminForm")
      .addEventListener("submit", function (event) {
        event.preventDefault();
        console.log("Formulari enviat");


        // Guardar les datos en el formulario
        const formData = {
          title: document.getElementById("title").value,
          quantity: document.getElementById("quantity").value,
          topics: Array.from(
            document.querySelectorAll('input[name="topic"]:checked')
          ).map((topic) => topic.value),
          nicknameAdmin: sessionStorage.getItem("nicknameUser"),
          time: document.getElementById("time").value,
        };


        // Emitir un evento al servidor con los datos del formulario
        socket.emit("crear partida", formData);
      });
  } else {
  }
});


// Asignamos un titulo a la partida
document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const nickname = params.get("nickname");
  const storedNickname = sessionStorage.getItem("nicknameUser");


  // Modificar el titulo en lobby.html
  const titleLobby = document.getElementById("titleLobby");
  if (titleLobby && nickname) {
    titleLobby.innerText = "Partida de " + nickname;


    // Ocultar el botón "comenzar partida" si el usuario no és el administrador
    const startButton = document.getElementById("start-button");
    if (storedNickname !== nickname) {
      startButton.style.display = "none";
    }
  }
});


// Entrar a una sala a través de la URL
document.addEventListener("DOMContentLoaded", function () {
  // Verificar si estamos en home.html
  if (window.location.href.endsWith("home.html")) {
    const codiInput = document.getElementById("codiInput");


    const entrarButton = document.getElementById("entrarButton");


    // Redirige al usuario quan clickee "enviar" a la url proporcionada
    entrarButton.addEventListener("click", function () {
      const codiInputValue = codiInput.value;
      // Comprueba si el codigo existe
      console.log("CODI INTRODUIT: ", codiInputValue);
      socket.emit("codi partida", codiInputValue);
    });
  } else {
  }


  // Evento "unir partida" enviado por el servidor
  socket.on("unir partida", function (data) {
    // Redirigir a l'usuari a la lobby de la partida
    const { sala, nicknameCreador, codiInputValue } = data;
    const lobbyUrl = `/lobby.html?partida=${sala}&nickname=${nicknameCreador}&codiPartida=${codiInputValue}`;


    window.location.href = lobbyUrl;
  });


  // Manejar el evento "no existe" enviado por el servidor
  socket.on("no existeix", () => {
    console.log("La partida no existe.");
    const message = document.getElementById("error");
    message.textContent = "No existeix cap partida amb aquest codi";
  });
});
// extraemos los paràmetres de la URL, esto se hace para comprobar que el usu entro a una partida
const urlParams = new URLSearchParams(window.location.search);
const idPartida = urlParams.get("partida");
const nicknameUrl = urlParams.get("nickname");


console.log(nicknameUser);
console.log(socketID);


// Enviar mensaje al servidor para unirse a la sala
if (idPartida && nicknameUrl) {
  socket.emit("join game", { idPartida, nicknameUser, socketID });
}


// Recibe la partida configurada
socket.on("preguntas partida", function (dataPartida) {
  const { idPartida, preguntasPartida, nicknameAdmin, time, codiPartida } =
    dataPartida;
  console.log(dataPartida);
  sessionStorage.setItem("idPartida", idPartida);


  sessionStorage.setItem("dataGame", JSON.stringify(dataPartida));
  // redirige a la página lobby.html con el identificador único en la URL
  const lobbyUrl = `/lobby.html?partida=${dataPartida.idPartida}&nickname=${dataPartida.nicknameAdmin}&codiPartida=${codiPartida}`;


  window.location.href = lobbyUrl;
});


// Botó nper comenzar la partida
if (startButton) {
  startButton.addEventListener("click", start);
}


function start() {
  // pedimos las preguntas y se la proporcionamos a los usuarios de la sala
  const json = sessionStorage.getItem("dataGame");
  const dataGame = JSON.parse(json);
  socket.emit("preguntas configurades", dataGame);
}


// Partida comenzada
socket.on("start game", function (data) {
  const { idPartida, preguntasPartida, nicknameAdmin, time } = data;


  const jsonString = JSON.stringify(data);
  sessionStorage.setItem("dataGlobal", jsonString);


  const jsonGlobal = sessionStorage.getItem("dataGlobal");
  const dataGameGlobal = JSON.parse(jsonGlobal);
  sessionStorage.setItem("codiPartida", dataGameGlobal.codiPartida);
  console.log("codi de la partida: ", dataGameGlobal.codiPartida);
  const lobbyUrl = `/game.html?partida=${dataGameGlobal.idPartida}&nickname=${dataGameGlobal.nicknameAdmin}`;
  window.location.href = lobbyUrl;
});


// Obtenemos la lista de usuarios que formen parte de la sala a la que se unieron
socket.on("users in room", function (data) {
  const usernamesArray = data.usernamesArray;
  // Pasamos los usernamesArray al servidor
  console.log("Usuaris en la sala:", usernamesArray);


  const jsonString = JSON.stringify(data);
  sessionStorage.setItem("usersGame", jsonString);


  // Obtiene la referencia de la lista de usuarios que hay
  const userListElement = document.getElementById("user-list");


  if (window.location.pathname.endsWith("lobby.html")) {
    // Limpia la lista actual
    userListElement.innerHTML = "";


    // Actualiza la lista con los nuevos usuarios
    usernamesArray.forEach((username) => {
      const liElement = document.createElement("li");
      liElement.textContent = username;
      userListElement.appendChild(liElement);
    });
  }
});


// JUEGO INICIADO
if (window.location.pathname.endsWith("game.html")) {
  //botón volver a jugar
  const tornarJugar = document.getElementById("tornarJugar");


  let clicksChart = [0, 0, 0, 0];
  // Timepo para cada pregunta
  var tempsPregunta;
  // Tiempo que el usuario tarda en responder
  var tempsResposta;
  // hacer que si el usuario hace f5 le envia a home
  document.addEventListener("DOMContentLoaded", function () {
    // Verificamos si es una recarga
    if (performance.navigation.type === 1) {
      //redirige a home.html
      window.onload = function (e) {
        window.location.href = "home.html";
      };
    }
  });


  // Obtenemos datos de la partida(dataGameGlobal) y de los usuarios de la partida(usersData)
  const jsonGlobal = sessionStorage.getItem("dataGlobal");
  const dataGameGlobal = JSON.parse(jsonGlobal);


  const usersGame = sessionStorage.getItem("usersGame");
  const usersData = JSON.parse(usersGame);
  tempsPregunta = dataGameGlobal.time;


  // Cambaimos el formato de users a array
  const usersArray = Array.isArray(usersData) ? usersData : [usersData];


  // Definimos el admin de la partida
  let userAdmin = dataGameGlobal.nicknameAdmin;


  // Obtenemos el usuario administrador i el del jugador conectado
  const nicknameJugador = sessionStorage.getItem("nicknameUser");
  const nicknameAdmin = userAdmin;
  temps = dataGameGlobal.time;


  if (nicknameAdmin === nicknameJugador) {
    // Inicializamos el objeto usuario y preguntas en servidor
    socket.emit("users started", {
      users: usersArray,
      roomId: dataGameGlobal.idPartida,
      preguntas: dataGameGlobal.preguntasPartida,
    });


    const tiempoEspera = 5000;


    // Inicializar el contador para evitar que algun usuario se quede fuera de la prtida
    setTimeout(() => {
      // Emite game started
      socket.emit("game started", {
        time: dataGameGlobal.time,
        roomId: dataGameGlobal.idPartida,
      });
    }, tiempoEspera);
  }


  // Recibe una nueva pregunta cada vez que vuelva a comenzar el contador
  socket.on("new question", function (pregunta) {
    const { question, time } = pregunta;
    // Guardar el objeto para pasarlo con la respuesta del usuario
    sessionStorage.setItem("currentQuestion", JSON.stringify(question));
    // Mostrar la pregunta por pantalla
    mostrarPregunta(question);
    startCountdown(time);
  });


  // Recibe mensaje cuando se acaba el tiempo de la pregunta
  socket.on("time's up", function (data) {
    const { time, roomId } = data;


    console.log("primer temps acabat!");
    socket.emit("extra time", { time, roomId });
  });


  // Recibe un mensaje cunado se acaba el segun el tiempo
  socket.on("time finished", function (data) {
    const { time, roomId } = data;
    console.log("segon temps acabat!");
    socket.emit("game started", { time, roomId });
  });


  // Recibe las puntuaciones actualizadas despues de que el usuario responda
  socket.on("noves puntuacions", function (data) {
    const { userScores, username, isCorrecta, clickCounts } = data;


    //Actualizar la variable global que guarda los clicks de cada respuesta
    for (let i = 0; i < clickCounts.length; i++) {
      clicksChart[i] += clickCounts[i];
    }
    console.log("array actualitzat: ", clicksChart);


    const nicknameP = username;


    // Actualizamos la tabla
    actualitzarPuntuacions(userScores, nicknameP, isCorrecta);
  });


  socket.on("game over", function () {
    console.log("Game over!");


    // Mostrar botón de volver a jugar
    if (nicknameAdmin == nicknameJugador) {
      tornarJugar.style.display = "flex";
    }


    //reiniciar puntuaciones
    const idRoom = dataGameGlobal.idPartida;
    socket.emit("restart scores", { nicknameAdmin, idRoom, usersArray });
  });


  // Gestiona cuando el usuario clicka una respuesta
  function handleButtonClick(buttonIndex) {
    const storedQuestion = sessionStorage.getItem("currentQuestion");


    if (storedQuestion) {
      // Transforma la pregunta de cadena a objecte
      const pregunta = JSON.parse(storedQuestion);


      // Emite la pregunta y la respuesta al servidor
      console.log("Opció seleccionada:", buttonIndex);
      socket.emit("resposta", {
        buttonIndex,
        pregunta: JSON.stringify(pregunta),
        idPartida,
        nicknameUser,
        tempsResposta,
        tempsPregunta,
      });
    }


    // Obtiene el boton clickado y deshabilita los demas
    const buttons = document.querySelectorAll(".answer-btn");
    buttons.forEach((button, index) => {
      if (index === buttonIndex) {
        button.classList.add("clicked");
      } else {
        button.classList.remove("clicked");
        button.classList.add("disabled");
        button.disabled = true;
      }
    });
  }


  // llena la tabla dinamicamente
  const tbodyElement = document.querySelector("#user-table tbody");


  tbodyElement.innerHTML = "";


  usersData.usernamesArray.forEach((username, index) => {
    // Verificar que l'usuari no sigui administrador
    if (username !== nicknameAdmin) {
      const trElement = document.createElement("tr");


      // Columna de puntos (inicialment en 0)
      const tdPunts = document.createElement("td");
      tdPunts.classList.add("puntuation");
      tdPunts.textContent = "0";
      trElement.appendChild(tdPunts);


      const tdUsername = document.createElement("td");
      tdUsername.textContent = username;


      tdUsername.classList.add("user-italic");


      if (username === nicknameUser) {
        tdUsername.classList.add("user-highlight");
      }
      trElement.appendChild(tdUsername);


      // Columna de aciertos (inicialment en 0)
      const tdAciertos = document.createElement("td");
      tdAciertos.textContent = "0";
      trElement.appendChild(tdAciertos);


      // Columna de fallos (inicialment en 0)
      const tdFallos = document.createElement("td");
      tdFallos.textContent = "0";
      trElement.appendChild(tdFallos);


      // Columna de porcentajes correctas/incorrectas (inicialment a 0)
      const tdPorcentaje = document.createElement("td");
      tdPorcentaje.textContent = "0%";
      trElement.appendChild(tdPorcentaje);


      // Agregar la fila a tbody
      tbodyElement.appendChild(trElement);
    }
  });


  // Función para obtener las puntuaciones de los jugadores y crear el array jugadores
  function obtenerPuntuaciones() {
    const labels = [];
    const data = [];


    // Obtener el elemento de la tabla
    const tabla = document.getElementById("user-table");


    // Obtener todas las filas de la tabla, excluyendo la fila de encabezado
    const filas = tabla.querySelectorAll("tbody tr");


    // Crear un array para almacenar los datos temporales de los usuarios
    const usuariosTemporales = [];


    // Iterar sobre las filas y obtener la información
    filas.forEach((fila) => {
      const puntuation = parseInt(
        fila.querySelector(".puntuation").textContent
      );
      const userItalicElement = fila.querySelector(".user-italic");
      const username = userItalicElement ? userItalicElement.textContent : "";


      // Agregar los datos temporales al array
      usuariosTemporales.push({ username, puntuation });
    });


    // Ordenar los datos por puntuación en orden descendente
    usuariosTemporales.sort((a, b) => b.puntuation - a.puntuation);


    // Limitar a los tres primeros usuarios con la puntuación más alta
    const usuariosTop3 = usuariosTemporales.slice(0, 3);


    // Obtener las etiquetas y los datos de los usuarios Top 3
    usuariosTop3.forEach((usuario) => {
      labels.push(usuario.username);
      data.push(usuario.puntuation);
    });


    // Devolver el objeto con las propiedades necesarias para el gráfico
    return { labels, data };
  }


  function actualitzarPuntuacions(userScores, username, isCorrecta) {
    const table = document.getElementById("user-table");
    const rows = table.getElementsByTagName("tr");


    for (let i = 0; i < rows.length; i++) {
      const usernameCell = rows[i].cells[1];


      if (usernameCell.textContent.trim() === username) {
        const puntosCell = rows[i].cells[0];
        const aciertosCell = rows[i].cells[2];
        const fallosCell = rows[i].cells[3];
        const porcentajeCell = rows[i].cells[4];


        // Calcular el porcentage de aciertos
        const totalRespuestas = userScores.correctes + userScores.incorrectes;
        const porcentajeAciertos =
          totalRespuestas === 0
            ? 0
            : (userScores.correctes / totalRespuestas) * 100;


        // Actualizar la información del usuario específico
        puntosCell.textContent = userScores.puntuacio;
        aciertosCell.textContent = userScores.correctes;
        fallosCell.textContent = userScores.incorrectes;
        porcentajeCell.textContent = porcentajeAciertos.toFixed(2) + "%";


        // Mostrar mensaje segun la respuesta
        const mensajeCell = document.createElement("td");
        mensajeCell.textContent = isCorrecta
          ? "¡Correcte! ✅ "
          : "¡Incorrecte! ❌";
        rows[i].appendChild(mensajeCell);


        // Eliminar el mensaje despues 3 segundos
        setTimeout(() => {
          mensajeCell.remove();
        }, 3000);


        break;
      }
    }
  }


  // Función que muestra la pregunta por pantalla
  function mostrarPregunta(pregunta) {
    // Introduce el contiendo de la respuesta correcta al elemento right-answer-text
    const respCorr = document.getElementById("right-answer-text");
    respCorr.textContent = pregunta.correcta;


    // Introduce el contenido de la primera pregunta al elemento pregunta
    const preguntaElem = document.getElementById("pregunta");
    preguntaElem.textContent = pregunta.pregunta;


    // Introducd el contenido de las respuestas a los elementos respuestax
    const respA = document.getElementById("resposta-a");
    const respB = document.getElementById("resposta-b");
    const respC = document.getElementById("resposta-c");
    const respD = document.getElementById("resposta-d");


    respA.textContent = pregunta.respostes["a"];
    respB.textContent = pregunta.respostes["b"];
    respC.textContent = pregunta.respostes["c"];
    respD.textContent = pregunta.respostes["d"];
  }


  // Función que comienza la cuenta atrás del tiempo para responder cada pregunta
  function startCountdown(initialTime) {
    if (nicknameAdmin == nicknameJugador) {
      // Deshabilitar los botones para el admin
      const buttons = document.querySelectorAll(".answer-btn");
      buttons.forEach((button, index) => {
        button.classList.remove("clicked");
        button.classList.add("disabled");
        button.disabled = true;
      });
    }
    // Variable local que almacena la cantidad de tiempo de la cuenta atrás, se inicialza con el timepo inicial(questionTime)
    let remainingTime = initialTime;


    // Función que actualiza la cuenta atras y modifica la visibilidad de los elementos HTML dependiendo del contador
    function updateCountdown() {
      document.getElementById("countdown").innerText = remainingTime;
      tempsResposta = remainingTime;


      if (remainingTime === 0) {
        updateChart(clicksChart);
        clicksChart = [0, 0, 0, 0];


        // escondemos y mostramos los elementos HTML correspondientes cuando se acaba el tiempo
        showAndHideAfterFirstCountDown();
        // Modificación de los estilos de los botones de respuesta
        enableAllButtons();
        removeClickedStyles();


        getReadyCountDown(waitTime);
      } else if (remainingTime > 0) {
        // escondemos y mostramos los elementos HTML
        showAndHideDuringFirstCountDown();
      }


      if (remainingTime < 0) {
      } else {
        // Reducimos los segundos
        remainingTime--;
        setTimeout(updateCountdown, 1000); // Actualiza los segundos
      }
    }
    // ejecutamos updateCountdown() para asegurarse que los elementos se muestran o desaparecen correctamente
    updateCountdown();
  }


  // Función que comienza la cuenta atrás entre pregunta y pregunta
  function startSecondCountdown(getReadyTime) {
    let remainingTime = getReadyTime;


    // Función que actualiza la cuenta atrás y modifica la visibilidad de los elementos HTML
    function updateCountdown() {
      document.getElementById("second-countdown").innerText = remainingTime;


      if (remainingTime === 0) {
        numPregRestants--;


        if (numPregRestants != 0) {
          // esto esconde y muestra los elementos HTML cuando el tiempo se acabó
          showAndHideAfterSecondCountDown();
        } else {
        }
      }
      if (remainingTime < 0) {
      } else {
        // Reducimos los segundos
        remainingTime--;
        setTimeout(updateCountdown, 1000); // esto actualiza cada segundo
      }
    }


    updateCountdown();
  }


  // Constant que almacena el timepo de espera entre preguntas
  const waitTime = 5;


  // Variable que almacena el numero de preguntas de la partida que faltan
  var numPregRestants = dataGameGlobal.preguntasPartida.length;


  // Función que muestra  el contador del tiempo de espera entre pregunta y pregunta,
  // ademas ejecuta y guarda la funcion startSecondCountdown con el paramentro del tinmepo de espera
  function getReadyCountDown(waitTime) {
    toggleElementVisibility(
      document.getElementById("second-countdown-container"),
      true
    );
    const secondCountdown = startSecondCountdown(waitTime);
  }


  // Grafico de barras
  let myChart;
  function updateChart(clickCounts) {
    //Destruir el grafico anterior si existe
    if (myChart) {
      myChart.destroy();
    }
  }


  // Enviar mensaje al servidor cuando se clicka "¿Otra mas?"
  tornarJugar.addEventListener("click", function () {
    // Devolver los uusarios al lobby y reiniciar los objetos
    const idRoom = dataGameGlobal.idPartida;
    socket.emit("play again", { nicknameAdmin, idRoom, usersArray });
  });


  // Redirige al usuario al lobby
  socket.on("back to lobby", function (data) {
    const { nicknameAdmin, idRoom } = data;
    const codiPartida = sessionStorage.getItem("codiPartida");


    const lobbyUrl = `/lobby.html?partida=${idRoom}&nickname=${nicknameAdmin}&codiPartida=${codiPartida}`;
    window.location.href = lobbyUrl;
  });
}
