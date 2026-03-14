/* ================================================================
   RULETA DE DESCUENTOS — LÓGICA PRINCIPAL
   Archivo: script.js
   ================================================================ */

'use strict';

/* ================================================================
   ╔══════════════════════════════════════════════════════════════╗
   ║          ZONA DE CONFIGURACIÓN — CAMBIA AQUÍ                ║
   ╚══════════════════════════════════════════════════════════════╝
   ================================================================ */

/* ----------------------------------------------------------------
   A) NÚMERO DE WHATSAPP
   ⚠️ IMPORTANTE: Escribe el número con código de país, sin + ni espacios
   Ejemplo Colombia: 573202641496
   ---------------------------------------------------------------- */
const WHATSAPP_NUMERO = '573202641496';

/* ----------------------------------------------------------------
   B) SECCIONES DE LA RULETA
   Cada objeto define:
   - texto:      Lo que aparece en la sección de la ruleta
   - color:      Color de fondo de esa sección (HEX)
   - colorTexto: Color del texto dentro de la sección
   - peso:       Probabilidad de caer aquí (número mayor = más probable)
                 ⚙️ AQUÍ ESTÁ EL "AMAÑO": 30% OFF y 20% OFF tienen peso 30
                 mientras que 50% OFF tiene solo peso 2 (muy raro)
   ---------------------------------------------------------------- */
const SECCIONES = [
  { texto: '10% OFF',  color: '#FF6B35', colorTexto: '#FFFFFF', peso: 10 },
  { texto: '20% OFF',  color: '#FFD700', colorTexto: '#1A0A00', peso: 30 },  // ← FAVORITO
  { texto: '15% OFF',  color: '#FF4500', colorTexto: '#FFFFFF', peso: 12 },
  { texto: '30% OFF',  color: '#FF8C00', colorTexto: '#1A0A00', peso: 30 },  // ← FAVORITO
  { texto: '50% OFF',  color: '#CC0000', colorTexto: '#FFFFFF', peso: 2  },  // ← MUY RARO
  { texto: '25% OFF',  color: '#FFA500', colorTexto: '#1A0A00', peso: 16 },
];

/* ----------------------------------------------------------------
   C) DURACIÓN Y VELOCIDAD DE LA ANIMACIÓN DE GIRO
   - DURACION_GIRO_MS: Tiempo total en milisegundos (3000 = 3 segundos)
   - VUELTAS_MINIMAS:  Cuántas vueltas completas da antes de frenar
   ---------------------------------------------------------------- */
const DURACION_GIRO_MS  = 4500;   // 4.5 segundos de animación
const VUELTAS_MINIMAS   = 5;      // Mínimo 5 vueltas completas

/* ----------------------------------------------------------------
   D) GANADORES RECIENTES (PRUEBA SOCIAL)
   Aparecen en la sección inferior de la página para generar confianza.
   Puedes agregar, quitar o editar filas del array.
   Formato: { avatar, nombre, ciudad, premio, hace }
   ---------------------------------------------------------------- */
const GANADORES_RECIENTES = [
  { avatar: '👩', nombre: 'Laura M.',   ciudad: 'Bogotá',    premio: '30% OFF', hace: 'hace 2 min'   },
  { avatar: '👨', nombre: 'Carlos R.',  ciudad: 'Medellín',  premio: '20% OFF', hace: 'hace 5 min'   },
  { avatar: '👩', nombre: 'Valentina S.',ciudad: 'Cali',     premio: '25% OFF', hace: 'hace 12 min'  },
  { avatar: '👦', nombre: 'Andrés T.',  ciudad: 'Barranquilla',premio:'30% OFF', hace: 'hace 18 min' },
  { avatar: '👧', nombre: 'Sofía L.',   ciudad: 'Cartagena', premio: '20% OFF', hace: 'hace 31 min'  },
];

/* ----------------------------------------------------------------
   E) CONTADOR DE URGENCIA
   Número inicial de "descuentos disponibles" que se muestra en el badge.
   El número disminuye automáticamente con el tiempo.
   ---------------------------------------------------------------- */
const CONTADOR_INICIAL = 7;       // Número inicial
const INTERVALO_BAJAR  = 45000;   // Cada cuánto baja 1 unidad (ms). 45000 = 45 segundos

/* ================================================================
   FIN DE LA ZONA DE CONFIGURACIÓN
   ================================================================ */


/* ================================================================
   VARIABLES DE ESTADO INTERNAS
   (No necesitas cambiar estas)
   ================================================================ */
let anguloActual      = 0;         // Ángulo actual de la ruleta en radianes
let estaGirando       = false;     // Bandera: true mientras gira
let premioGanado      = null;      // Índice de la sección ganadora
let intervalTemporizador = null;   // Referencia al interval del temporizador


/* ================================================================
   INICIALIZACIÓN: Se ejecuta cuando el DOM está listo
   ================================================================ */
document.addEventListener('DOMContentLoaded', function () {

  /* Dibujar la ruleta inicial */
  dibujarRuleta(anguloActual);

  /* Renderizar la lista de ganadores recientes */
  renderizarGanadores();

  /* Iniciar el contador de urgencia */
  iniciarContadorUrgencia();

  /* Crear partículas de fondo decorativas */
  crearParticulas();

  /* ----------------------------------------------------------------
     UNA SOLA JUGADA: Si ya jugó antes, mostrar su premio y bloquear.
     ---------------------------------------------------------------- */
  const premioGuardado = localStorage.getItem('ruleta_premio_ganado');

  if (premioGuardado !== null) {
    /* Ya jugó: restaurar estado sin animación */
    const indiceGuardado = parseInt(premioGuardado, 10);

    const botonGirar = document.getElementById('boton-girar');
    botonGirar.disabled = true;
    botonGirar.classList.add('oculto');

    const textoPremio = SECCIONES[indiceGuardado].texto;
    const mensaje     = generarMensajeWhatsApp(textoPremio);
    const botonWA     = document.getElementById('boton-whatsapp');
    botonWA.href      = 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(mensaje);
    botonWA.classList.remove('oculto');

    lanzarConfeti();
    mostrarModalPremio(indiceGuardado);

  } else {
    /* Primera vez: habilitar clic en canvas para girar */
    document.getElementById('canvas-ruleta').addEventListener('click', function () {
      if (!estaGirando) girarRuleta();
    });
  }

});


/* ================================================================
   FUNCIÓN: dibujarRuleta(angulo)
   Dibuja la ruleta completa en el canvas HTML5 con el ángulo dado.
   - angulo: valor en radianes (rotación actual de la ruleta)
   ================================================================ */
function dibujarRuleta(angulo) {

  const canvas  = document.getElementById('canvas-ruleta');
  const ctx     = canvas.getContext('2d');
  const cx      = canvas.width  / 2;   // Centro X
  const cy      = canvas.height / 2;   // Centro Y
  const radio   = cx - 8;              // Radio de la ruleta (deja margen)

  /* Limpiar el canvas antes de redibujar */
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const totalSecciones = SECCIONES.length;
  const anguloPorSeccion = (2 * Math.PI) / totalSecciones;

  /* ---- DIBUJAR CADA SECCIÓN DE LA RULETA ---- */
  SECCIONES.forEach(function (seccion, indice) {

    const anguloInicio = angulo + indice * anguloPorSeccion - Math.PI / 2;
    const anguloFin    = anguloInicio + anguloPorSeccion;

    /* Sector (trozo de pastel) */
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radio, anguloInicio, anguloFin);
    ctx.closePath();

    /* Relleno de color sólido */
    ctx.fillStyle = seccion.color;
    ctx.fill();

    /* Borde entre secciones */
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    /* ---- TEXTO DEL PREMIO EN LA SECCIÓN ---- */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(anguloInicio + anguloPorSeccion / 2);

    /* Fondo oscuro semitransparente detrás del texto para legibilidad */
    const distTexto = radio * 0.62;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.roundRect(distTexto - 44, -16, 88, 32, 6);
    ctx.fill();

    /* Sombra del texto */
    ctx.shadowColor  = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur   = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    /* Texto principal */
    ctx.fillStyle  = seccion.colorTexto;
    ctx.font       = 'bold 16px Nunito, sans-serif';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(seccion.texto, distTexto, 0);

    ctx.restore();
  });

  /* ---- BORDE EXTERIOR DE LA RULETA (ARO) ---- */
  /* Aro dorado exterior */
  ctx.beginPath();
  ctx.arc(cx, cy, radio, 0, 2 * Math.PI);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth   = 6;
  ctx.stroke();

  /* Segundo aro más oscuro para profundidad */
  ctx.beginPath();
  ctx.arc(cx, cy, radio + 3, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(255, 69, 0, 0.5)';
  ctx.lineWidth   = 2;
  ctx.stroke();

  /* ---- CÍRCULO CENTRAL (HUB) ---- */
  /* Sombra */
  ctx.shadowColor  = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur   = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  /* Círculo dorado central */
  const gradienteHub = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 34);
  gradienteHub.addColorStop(0, '#FFE566');
  gradienteHub.addColorStop(1, '#FF8C00');
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, 2 * Math.PI);
  ctx.fillStyle   = gradienteHub;
  ctx.fill();
  ctx.strokeStyle = '#FF4500';
  ctx.lineWidth   = 3;
  ctx.stroke();

  ctx.shadowBlur = 0; // Resetear sombra
}


/* ================================================================
   FUNCIÓN: seleccionarPremio()
   Decide qué sección ganará usando los PESOS definidos en SECCIONES.
   Retorna el índice de la sección ganadora.

   LÓGICA DEL "AMAÑO":
   Se genera un número aleatorio entre 0 y la suma total de pesos.
   Las secciones con mayor peso tienen mayor probabilidad de ser elegidas.
   ================================================================ */
function seleccionarPremio() {

  /* Calcular la suma total de todos los pesos */
  const pesoTotal = SECCIONES.reduce(function (acc, s) { return acc + s.peso; }, 0);

  /* Número aleatorio entre 0 y pesoTotal */
  let aleatorio = Math.random() * pesoTotal;

  /* Recorrer las secciones hasta encontrar cuál absorbe el número aleatorio */
  for (let i = 0; i < SECCIONES.length; i++) {
    aleatorio -= SECCIONES[i].peso;
    if (aleatorio <= 0) {
      return i;  // Este índice es el ganador
    }
  }

  /* Fallback: última sección (no debería llegar aquí) */
  return SECCIONES.length - 1;
}


/* ================================================================
   FUNCIÓN: girarRuleta()
   Es llamada por el botón "¡GIRAR Y GANAR!" y por clic en el canvas.
   Orquesta toda la animación de giro y el resultado final.
   ================================================================ */
function girarRuleta() {

  /* Evitar giros dobles */
  if (estaGirando) return;
  estaGirando = true;

  /* Indicar visualmente que está girando */
  document.body.classList.add('girando');

  /* Agregar feedback visual al botón */
  const botonGirar = document.getElementById('boton-girar');
  botonGirar.querySelector('.btn-texto').textContent = '¡GIRANDO...';

  /* ---- DETERMINAR EL PREMIO GANADOR ---- */
  premioGanado = seleccionarPremio();

  /* ---- CALCULAR EL ÁNGULO FINAL ---- */
  /*
   * CÓMO FUNCIONA EL DIBUJO:
   * dibujarRuleta(angulo) coloca la sección [i] entre:
   *   inicio = angulo + i * anguloPorSeccion - π/2
   *   fin    = inicio + anguloPorSeccion
   *
   * La flecha está en la parte SUPERIOR del canvas = ángulo -π/2 (o 270°).
   *
   * Para que el CENTRO de la sección [premioGanado] quede justo en -π/2
   * necesitamos que:
   *   angulo + premioGanado * anguloPorSeccion - π/2 + anguloPorSeccion/2 = -π/2
   *
   * Despejando `angulo`:
   *   angulo = -(premioGanado * anguloPorSeccion) - anguloPorSeccion/2
   *
   * Eso es el ángulo destino "limpio" (sin vueltas).
   * Luego normalizamos para que el giro siempre sea hacia adelante (positivo)
   * y añadimos las vueltas mínimas de animación.
   */
  const totalSecciones   = SECCIONES.length;
  const anguloPorSeccion = (2 * Math.PI) / totalSecciones;

  /* Ángulo exacto donde debe quedar la ruleta al detenerse */
  const anguloDestinoLimpio = -(premioGanado * anguloPorSeccion) - (anguloPorSeccion / 2);

  /* Normalizar el ángulo actual al rango [0, 2π) para calcular el delta */
  const anguloActualNorm = ((anguloActual % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const anguloDestinoNorm = ((anguloDestinoLimpio % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  /* Delta positivo: cuánto hay que girar para llegar al destino desde la posición actual */
  let delta = anguloDestinoNorm - anguloActualNorm;
  if (delta <= 0) delta += 2 * Math.PI; // Aseguramos que siempre gire hacia adelante

  /* Vueltas completas de animación + el delta de alineación */
  const vueltasExtra     = VUELTAS_MINIMAS + Math.floor(Math.random() * 3); // 5-7 vueltas
  const anguloFinalTotal = anguloActual + (2 * Math.PI * vueltasExtra) + delta;

  /* ---- ANIMACIÓN DE GIRO ---- */
  const tiempoInicio   = performance.now();
  const anguloInicio   = anguloActual;
  const deltaTotalGiro = anguloFinalTotal - anguloInicio;

  /**
   * Función de easing: easeOutCubic
   * Simula desaceleración física (como si tuviera fricción).
   * t va de 0 a 1 (progreso de la animación).
   * 🔧 Cambia la curva de easing aquí si quieres otro comportamiento.
   */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 4);  // Potencia 4 = más dramático al frenar
  }

  /**
   * Loop de animación usando requestAnimationFrame.
   * Se llama ~60 veces por segundo hasta que transcurre DURACION_GIRO_MS.
   */
  function animarFrame(tiempoAhora) {
    const transcurrido = tiempoAhora - tiempoInicio;
    const progreso     = Math.min(transcurrido / DURACION_GIRO_MS, 1); // 0 → 1
    const progresoEased = easeOutCubic(progreso);

    /* Calcular el ángulo actual según el easing */
    anguloActual = anguloInicio + deltaTotalGiro * progresoEased;

    /* Redibujar la ruleta en la nueva posición */
    dibujarRuleta(anguloActual);

    if (progreso < 1) {
      /* Aún no terminamos, solicitar el siguiente frame */
      requestAnimationFrame(animarFrame);
    } else {
      /* ¡Animación terminada! */
      anguloActual = anguloFinalTotal;
      dibujarRuleta(anguloActual);
      alTerminarGiro();
    }
  }

  /* Iniciar el primer frame */
  requestAnimationFrame(animarFrame);
}


/* ================================================================
   FUNCIÓN: alTerminarGiro()
   Se ejecuta automáticamente cuando la ruleta se detiene.
   Muestra celebración, modal con el premio y botón WhatsApp.
   ================================================================ */
function alTerminarGiro() {

  estaGirando = false;
  document.body.classList.remove('girando');

  /* Animación de celebración en la ruleta */
  const canvas = document.getElementById('canvas-ruleta');
  canvas.classList.add('celebrando');
  setTimeout(function () { canvas.classList.remove('celebrando'); }, 1500);

  /* Pequeña pausa antes de mostrar el modal (más dramático) */
  setTimeout(function () {

    /* Lanzar confeti */
    lanzarConfeti();

    /* Mostrar el modal con el premio */
    mostrarModalPremio(premioGanado);

    /* Ocultar el botón GIRAR */
    const botonGirar = document.getElementById('boton-girar');
    botonGirar.style.transition = 'all 0.4s ease';
    botonGirar.disabled = true;
    setTimeout(function () { botonGirar.classList.add('oculto'); }, 400);

    /* Mostrar el botón WhatsApp externo (fuera del modal) */
    const botonWA = document.getElementById('boton-whatsapp');
    botonWA.classList.remove('oculto');

    /* Configurar el enlace del botón WhatsApp con el mensaje personalizado */
    const textoPremio = SECCIONES[premioGanado].texto;
    const mensaje     = generarMensajeWhatsApp(textoPremio);
    botonWA.href      = 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(mensaje);

    /* Guardar el premio en localStorage para bloquear futuros intentos */
    localStorage.setItem('ruleta_premio_ganado', String(premioGanado));

  }, 600);
}


/* ================================================================
   FUNCIÓN: generarMensajeWhatsApp(textoPremio)
   Genera el mensaje automático para WhatsApp con el premio insertado.
   ⚠️ AQUÍ PUEDES CAMBIAR EL TEXTO DEL MENSAJE
   ================================================================ */
function generarMensajeWhatsApp(textoPremio) {
  return '¡Hola! 🥳 Acabo de girar la ruleta y gané un ' + textoPremio
    + ' para el Master Pack Sublima & Emprende. ¡Quiero reclamarlo ahora!';
}


/* ================================================================
   FUNCIÓN: mostrarModalPremio(indicePremio)
   Muestra el modal con el premio ganado y configura el botón WA.
   ================================================================ */
function mostrarModalPremio(indicePremio) {

  const seccion    = SECCIONES[indicePremio];
  const textoPremio = seccion.texto;

  /* Insertar el texto del premio en el modal */
  document.getElementById('modal-texto-premio').textContent = textoPremio;

  /* Configurar el botón WhatsApp del modal */
  const mensaje    = generarMensajeWhatsApp(textoPremio);
  const enlaceWA   = 'https://wa.me/' + WHATSAPP_NUMERO + '?text=' + encodeURIComponent(mensaje);
  document.getElementById('modal-boton-whatsapp').href = enlaceWA;

  /* Mostrar el modal */
  document.getElementById('modal-premio').classList.remove('oculto');

  /* Iniciar el temporizador de urgencia del modal */
  iniciarTemporizadorModal(10 * 60); // 10 minutos en segundos
}


/* ================================================================
   FUNCIÓN: cerrarModal()
   Cierra el modal de premio. Llamada por el botón X y "Ver más tarde".
   ================================================================ */
function cerrarModal() {
  document.getElementById('modal-premio').classList.add('oculto');

  /* Detener el temporizador del modal */
  if (intervalTemporizador) {
    clearInterval(intervalTemporizador);
    intervalTemporizador = null;
  }
}


/* ================================================================
   FUNCIÓN: iniciarTemporizadorModal(segundosTotales)
   Cuenta regresiva que aparece dentro del modal para generar urgencia.
   ⚙️ Cambia los segundos en mostrarModalPremio() si quieres más o menos tiempo
   ================================================================ */
function iniciarTemporizadorModal(segundosTotales) {

  let segundosRestantes = segundosTotales;
  const elementoTimer   = document.getElementById('temporizador');

  function actualizarDisplay() {
    const mins = Math.floor(segundosRestantes / 60);
    const segs = segundosRestantes % 60;
    elementoTimer.textContent =
      String(mins).padStart(2, '0') + ':' + String(segs).padStart(2, '0');
  }

  actualizarDisplay(); // Mostrar el valor inicial

  intervalTemporizador = setInterval(function () {
    segundosRestantes--;
    actualizarDisplay();

    if (segundosRestantes <= 0) {
      clearInterval(intervalTemporizador);
      elementoTimer.textContent = '¡EXPIRADO!';
      elementoTimer.style.color = '#FF4500';
    }
  }, 1000);
}


/* ================================================================
   FUNCIÓN: lanzarConfeti()
   Crea múltiples piezas de confeti de colores que caen desde arriba.
   ⚙️ Cambia CANTIDAD_CONFETI para más o menos confeti
   ================================================================ */
function lanzarConfeti() {

  const CANTIDAD_CONFETI = 120;  // ← Cambia este número para más/menos confeti

  /* Colores del confeti — puedes agregar más colores al array */
  const COLORES_CONFETI = [
    '#FFD700', '#FF4500', '#FF8C00', '#FFFFFF',
    '#FF6B35', '#FFF176', '#FF1744', '#FFAB00'
  ];

  const contenedor = document.getElementById('confeti-contenedor');
  contenedor.innerHTML = ''; // Limpiar confeti anterior

  for (let i = 0; i < CANTIDAD_CONFETI; i++) {

    const pieza = document.createElement('div');
    pieza.classList.add('confeti-pieza');

    /* Propiedades aleatorias para cada pieza */
    const color    = COLORES_CONFETI[Math.floor(Math.random() * COLORES_CONFETI.length)];
    const posX     = Math.random() * 100;    // Posición horizontal (%)
    const duracion = 2.5 + Math.random() * 2; // Entre 2.5 y 4.5 segundos
    const retardo  = Math.random() * 1.5;    // Retardo de inicio (0 a 1.5s)
    const tamano   = 6 + Math.random() * 8;  // Tamaño entre 6px y 14px
    const forma    = Math.random() > 0.5 ? '50%' : '2px'; // Círculo o cuadrado

    pieza.style.cssText = [
      'background-color: ' + color,
      'left: ' + posX + '%',
      'width: ' + tamano + 'px',
      'height: ' + tamano + 'px',
      'border-radius: ' + forma,
      'animation-duration: ' + duracion + 's',
      'animation-delay: ' + retardo + 's',
    ].join(';');

    contenedor.appendChild(pieza);
  }

  /* Limpiar el confeti del DOM después de la animación */
  setTimeout(function () {
    contenedor.innerHTML = '';
  }, 6000);
}


/* ================================================================
   FUNCIÓN: renderizarGanadores()
   Muestra la lista de ganadores recientes (prueba social).
   Usa el array GANADORES_RECIENTES definido arriba.
   ================================================================ */
function renderizarGanadores() {

  const lista = document.getElementById('lista-ganadores');
  if (!lista) return;

  lista.innerHTML = ''; // Limpiar

  GANADORES_RECIENTES.forEach(function (ganador, indice) {

    const item = document.createElement('div');
    item.classList.add('ganador-item');

    /* Retardo progresivo para que aparezcan en cascada */
    item.style.animationDelay = (indice * 0.1) + 's';

    item.innerHTML =
      '<span class="ganador-avatar">' + ganador.avatar + '</span>' +
      '<div class="ganador-info">' +
        '<span class="ganador-nombre">' + ganador.nombre + '</span>' +
        '<span> · </span>' +
        '<span style="font-size:12px;color:rgba(255,208,160,0.5)">' + ganador.ciudad + '</span>' +
        '<br>' +
        '<span>ganó </span>' +
        '<span class="ganador-premio">' + ganador.premio + '</span>' +
      '</div>' +
      '<span class="ganador-tiempo">' + ganador.hace + '</span>';

    lista.appendChild(item);
  });
}


/* ================================================================
   FUNCIÓN: iniciarContadorUrgencia()
   Baja el número de "descuentos disponibles" gradualmente para crear urgencia.
   ⚙️ Ajusta CONTADOR_INICIAL e INTERVALO_BAJAR arriba en la configuración
   ================================================================ */
function iniciarContadorUrgencia() {

  let contadorActual     = CONTADOR_INICIAL;
  const elementoContador = document.getElementById('contador-ofertas');
  if (!elementoContador) return;

  setInterval(function () {
    if (contadorActual > 1) {
      contadorActual--;
      elementoContador.textContent = contadorActual;

      /* Pequeña animación de "flash" al cambiar el número */
      elementoContador.style.transition = 'all 0.3s ease';
      elementoContador.style.transform  = 'scale(1.4)';
      elementoContador.style.color      = '#FFD700';

      setTimeout(function () {
        elementoContador.style.transform = 'scale(1)';
        elementoContador.style.color     = '';
      }, 300);
    }
  }, INTERVALO_BAJAR);
}


/* ================================================================
   FUNCIÓN: crearParticulas()
   Crea pequeños círculos decorativos animados en el fondo de la página.
   ⚙️ Cambia CANTIDAD_PARTICULAS para más o menos efectos de fondo
   ================================================================ */
function crearParticulas() {

  const CANTIDAD_PARTICULAS = 20;

  /* Colores para las partículas */
  const COLORES_PARTICULAS = [
    'rgba(255, 215, 0, 0.3)',
    'rgba(255, 69, 0, 0.2)',
    'rgba(255, 140, 0, 0.25)',
  ];

  const contenedor = document.getElementById('particulas-fondo');
  if (!contenedor) return;

  for (let i = 0; i < CANTIDAD_PARTICULAS; i++) {

    const particula = document.createElement('div');
    particula.classList.add('particula');

    const tamano   = 4 + Math.random() * 10;
    const posX     = Math.random() * 100;
    const duracion = 8 + Math.random() * 12;  // Entre 8 y 20 segundos por ciclo
    const retardo  = Math.random() * -15;      // Retardo negativo = ya empezó
    const color    = COLORES_PARTICULAS[Math.floor(Math.random() * COLORES_PARTICULAS.length)];

    particula.style.cssText = [
      'width: ' + tamano + 'px',
      'height: ' + tamano + 'px',
      'left: ' + posX + '%',
      'background: ' + color,
      'animation-duration: ' + duracion + 's',
      'animation-delay: ' + retardo + 's',
    ].join(';');

    contenedor.appendChild(particula);
  }
}


/* ================================================================
   BLOQUEADO: Escape no cierra el modal
   El usuario DEBE reclamar su premio por WhatsApp
   ================================================================ */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    e.preventDefault();
  }
});

/* Clic fuera del modal: también bloqueado (listener eliminado) */
