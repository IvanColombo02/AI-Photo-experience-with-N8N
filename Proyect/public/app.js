// Referencias DOM
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");
const step4 = document.getElementById("step4");
const step5 = document.getElementById("step5");
const stepLoading = document.getElementById("stepLoading");
const startButton = document.getElementById("startButton");
const nextButton = document.getElementById("nextButton");
const cameraButton = document.getElementById("cameraButton");
const sendButton = document.getElementById("sendButton");
const backToStep1 = document.getElementById("backToStep1");
const backToStep2 = document.getElementById("backToStep2");
const retryButton = document.getElementById("retryButton");
const continueButton = document.getElementById("continueButton");
const finishButton = document.getElementById("finishButton");
const printButton = document.getElementById("printButton");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const photo = document.getElementById("photo");
const resultImage = document.getElementById("resultImage");
const status = document.getElementById("status");
const verResultadoButton = document.getElementById("verResultado");
const loadingVideo = document.getElementById("loadingVideo");
const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${window.location.host}`);

let stream = null;
let photoTaken = false;
let textoGuardado = "";
let rawImageBlob = null;
let finalImageBlob = null;

// Navegación básica
startButton.addEventListener("click", () => {
  step1.classList.add("hidden");
  step2.classList.remove("hidden");
});

nextButton.addEventListener("click", () => {
  const personaje = document.getElementById("texto1").value.trim();
  const ciudad = document.getElementById("texto2").value.trim();
  const accion = document.getElementById("texto3").value.trim();

  if (!personaje || !ciudad || !accion) {
    return alert("Por favor, completa los tres campos.");
  }

  textoGuardado = { personaje, ciudad, accion };

  step2.classList.add("hidden");
  step3.classList.remove("hidden");
});

backToStep1.addEventListener("click", () => {
  step2.classList.add("hidden");
  step1.classList.remove("hidden");
});

backToStep2.addEventListener("click", () => {
  step3.classList.add("hidden");
  step2.classList.remove("hidden");
});

// Cámara
cameraButton.addEventListener("click", async () => {
  if (!stream) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;
      video.style.display = "block";
      cameraButton.textContent = "Sacar Foto";
    } catch (_) {
      alert("Error al acceder a la cámara");
    }
  } else if (!photoTaken) {
    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      photo.blob = blob;
      const url = URL.createObjectURL(blob);
      photo.src = url;
      photo.style.display = "block";
      video.style.display = "none";
      photoTaken = true;
      cameraButton.textContent = "Intentar de nuevo";
      sendButton.classList.remove("hidden");
    }, "image/jpeg", 0.9);
  } else {
    photoTaken = false;
    photo.style.display = "none";
    video.style.display = "block";
    cameraButton.textContent = "Sacar Foto";
    sendButton.classList.add("hidden");
  }
});

// Enviar foto a n8n
sendButton.addEventListener("click", async () => {
  if (!photo.blob) return alert("No hay foto tomada");

  const texto = textoGuardado;
  const formData = new FormData();
  formData.append("texto", JSON.stringify(texto));
  formData.append("foto", photo.blob, "foto.jpg");

  try {
    step3.classList.add("hidden");
    stepLoading.classList.remove("hidden");
    status.textContent = "Esperando la respuesta de la IA...";

    const response = await fetch("url-nodo-webhook-n8n", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Error al enviar los datos");
    await response.json();
  } catch (_) {
    status.textContent = "Error";
    stepLoading.classList.add("hidden");
    step3.classList.remove("hidden");
  }
});

// WebSocket
ws.addEventListener("open", () => console.log("Conectado al WebSocket ✅"));
ws.addEventListener("message", async (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "image" && data.image) {
    try {
      const response = await fetch(data.image);
      rawImageBlob = await response.blob();
      resultImage.src = URL.createObjectURL(rawImageBlob);

      status.textContent = "";
      verResultadoButton.classList.remove("hidden");
    } catch (err) {
      console.error("Error al recibir la imagen:", err);
      status.textContent = "Error al procesar la imagen";
    }
  }
});

// Ver resultado
verResultadoButton.addEventListener("click", () => {
  stepLoading.classList.add("hidden");
  step4.classList.remove("hidden");
  resultImage.style.display = "block";
  verResultadoButton.classList.add("hidden");
  loadingVideo.pause();
  loadingVideo.currentTime = 0;
});

// Reintentar
retryButton.addEventListener("click", () => {
  if (resultImage.src) URL.revokeObjectURL(resultImage.src);
  step4.classList.add("hidden");
  step3.classList.remove("hidden");
  video.style.display = "block";
  photo.style.display = "none";
  photoTaken = false;
  cameraButton.textContent = "Sacar Foto";
  sendButton.classList.add("hidden");
});

// Continuar: aquí se agrega el marco
continueButton.addEventListener("click", async () => {
  if (!rawImageBlob) return;

  try {
    const userImg = new Image();
    userImg.src = URL.createObjectURL(rawImageBlob);
    await new Promise(res => userImg.onload = res);

    const marcoImg = new Image();
    marcoImg.src = '/resources/marco.png';
    await new Promise(res => marcoImg.onload = res);

    // Canvas final 1024x1453
    const anchoFinal = 1024;
    const altoFinal = 1453;
    const canvasTemp = document.createElement('canvas');
    canvasTemp.width = anchoFinal;
    canvasTemp.height = altoFinal;
    const ctx = canvasTemp.getContext('2d');

    // Escalar foto base al ancho del canvas
    const scaleFoto = anchoFinal / userImg.width;
    const alturaFotoEscalada = userImg.height * scaleFoto;

    // El marco ya tiene 1024x1453, así que se dibuja completo
    // Para que la foto y el marco se fusionen, dibujamos la foto en la parte superior
    ctx.drawImage(userImg, 0, 0, anchoFinal, alturaFotoEscalada);

    // Dibujar el marco encima, manteniendo su tamaño original 1024x1453
    // La parte superior del marco cubrirá parcialmente la foto, fusionando ambos
    ctx.drawImage(marcoImg, 0, 0, anchoFinal, altoFinal);

    // Guardar imagen final
    finalImageBlob = await new Promise(res =>
      canvasTemp.toBlob(res, 'image/png') // PNG para transparencia
    );

    // Mostrar paso 5
    step4.classList.add("hidden");
    step5.classList.remove("hidden");

  } catch (err) {
    console.error("Error al agregar marco:", err);
    alert("No se pudo preparar la imagen final");
  }
});

// Enviar correo
finishButton.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) return alert("Por favor, escribe tu correo.");
  if (!finalImageBlob) return alert("No hay imagen para enviar");

  try {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("foto", finalImageBlob, "imagen_final.jpg");

    const response = await fetch("url-n8n-nodo-webhook-envio-mail", {
      method: "POST",
      body: formData
    });

    if (!response.ok) throw new Error("Error al enviar el correo");

    window.location.reload();

  } catch (err) {
    console.error("Error al enviar el correo:", err);
    alert("Error al enviar la imagen por correo");
  }
});

// Imprimir imagen final
printButton.addEventListener("click", () => {
  if (!finalImageBlob) return alert("No hay imagen para imprimir");

  const url = URL.createObjectURL(finalImageBlob);
  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(`
    <html>
      <head>
        <title>Imprimir imagen</title>
        <style>
          body {
            text-align: center;
            margin: 0;
            padding: 20px;
          }
          img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <img src="${url}" alt="Imagen para imprimir">
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
});
