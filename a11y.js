/**
 * BizLink · Experiencia de usuario y accesibilidad (WCAG 2.1 AA)
 *
 *  1. Tema claro / oscuro / sistema (sin parpadeo: ver el script del <head> en index.html)
 *  2. Atajos de teclado modulares + guía (tecla ?) + búsqueda rápida (Ctrl/⌘ + K)
 *  3. Navegación por teclado y foco: foco visible, focus trap, orden lógico
 *  4. Lectores de pantalla: aria-live, etiquetas de botones de ícono, diálogos y menús
 *  5. Validación accesible de formularios, "Deshacer" y carga con aria-busy
 *
 * Se carga después de app.js y usa sus funciones globales ($, ACT, toast, switchView, …).
 */

const ES_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const TECLA_MOD = ES_MAC ? '⌘' : 'Ctrl';

// Anuncia un texto a lectores de pantalla sin mostrar nada en pantalla
function anunciar(msg, urgente = false) {
  const el = document.getElementById(urgente ? 'sr-assertive' : 'sr-polite');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = msg; }, 50);   // vaciar y volver a escribir fuerza la lectura
}

// =====================================================================
// 1. TEMA CLARO / OSCURO
// =====================================================================
const Tema = {
  KEY: 'bizlink-tema',
  NOMBRES: { system: 'automático (sistema)', light: 'claro', dark: 'oscuro' },
  ICONOS: { system: 'monitor', light: 'sun', dark: 'moon' },
  mq: window.matchMedia('(prefers-color-scheme: dark)'),

  get() { try { return localStorage.getItem(this.KEY) || 'system'; } catch (e) { return 'system'; } },
  set(t) { try { localStorage.setItem(this.KEY, t); } catch (e) { /* modo privado: solo en esta visita */ } this.aplicar(); },
  esOscuro() { const t = this.get(); return t === 'dark' || (t === 'system' && this.mq.matches); },

  aplicar() {
    const dark = this.esOscuro(), root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#121316' : '#f5f4ef';
    this.pintarBoton();
  },

  // Sistema → Claro → Oscuro → Sistema
  ciclar() {
    const orden = ['system', 'light', 'dark'];
    this.set(orden[(orden.indexOf(this.get()) + 1) % orden.length]);
    toast(`Tema ${this.NOMBRES[this.get()]}`);
  },

  pintarBoton() {
    const b = document.getElementById('theme-btn');
    if (!b) return;
    const t = this.get();
    b.setAttribute('aria-label', `Cambiar tema. Actual: ${this.NOMBRES[t]}`);
    b.title = `Tema ${this.NOMBRES[t]} · Shift + T`;
    b.innerHTML = `<i data-lucide="${this.ICONOS[t]}" class="w-4 h-4"></i>`;
    if (window.lucide) lucide.createIcons();
  }
};
// Si el usuario eligió "sistema", seguir los cambios del sistema operativo en vivo
Tema.mq.addEventListener('change', () => { if (Tema.get() === 'system') Tema.aplicar(); });

// =====================================================================
// 5a. DESHACER (en vez de "¿Seguro?" en acciones destructivas)
// =====================================================================
const Deshacer = { ultimo: null };

function toastUndo(msg, deshacer, ms = 7000) {
  const box = document.getElementById('toast-container');
  if (!box) return;
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.className = 'pointer-events-auto px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl bg-bizdark text-white flex items-center gap-3 transition-opacity duration-300';
  el.innerHTML = `
    <span>${esc(msg)}</span>
    <button type="button" class="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 font-extrabold underline-offset-2" aria-keyshortcuts="Control+Z Meta+Z">Deshacer</button>
    <span class="opacity-60 tabular-nums" aria-hidden="true">${Math.round(ms / 1000)}</span>`;
  box.appendChild(el);

  let hecho = false, resta = Math.round(ms / 1000);
  const contador = el.lastElementChild, btn = el.querySelector('button');
  const cerrar = () => { clearInterval(tic); el.style.opacity = '0'; setTimeout(() => el.remove(), 300); if (Deshacer.ultimo === accion) Deshacer.ultimo = null; };
  const accion = async () => {
    if (hecho) return;
    hecho = true;
    cerrar();
    await deshacer();
    toast('Acción deshecha');
  };
  const tic = setInterval(() => { resta -= 1; contador.textContent = resta; if (resta <= 0) cerrar(); }, 1000);
  btn.addEventListener('click', accion);
  Deshacer.ultimo = accion;
  anunciar(`${msg}. Pulsa ${TECLA_MOD} + Z para deshacer.`);
}

// =====================================================================
// 5b. CARGA ACCESIBLE (skeleton + aria-busy)
// =====================================================================
function mostrarCargando(on, error = false) {
  const main = document.getElementById('main-content');
  if (!main) return;
  main.setAttribute('aria-busy', on ? 'true' : 'false');
  if (!on) { if (!error) anunciar('Datos cargados'); return; }
  const cont = document.getElementById(`${STATE.view}-content`) || document.getElementById('desp-content');
  if (!cont) return;
  const tarjeta = () => `
    <div class="biz-card p-5 space-y-3" aria-hidden="true">
      <div class="flex items-center gap-3"><div class="skeleton w-10 h-10 !rounded-xl"></div><div class="flex-1 space-y-2"><div class="skeleton h-3 w-2/3"></div><div class="skeleton h-3 w-1/3"></div></div></div>
      <div class="skeleton h-2 w-full"></div>
      <div class="skeleton h-3 w-5/6"></div><div class="skeleton h-3 w-4/6"></div>
    </div>`;
  cont.innerHTML = `
    <p class="sr-only" role="status">Cargando datos de tu empresa…</p>
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">${tarjeta()}${tarjeta()}${tarjeta()}</div>`;
}

// =====================================================================
// 5c. VALIDACIÓN DE FORMULARIOS EN TIEMPO REAL (accesible)
//     - Formularios con [data-validar]: campos con required, min, type=email…
//     - Error visible + aria-invalid + aria-describedby (el lector lee el error al enfocar)
//     - Se valida al salir del campo y se corrige en vivo mientras se escribe
//     - Al guardar con errores: no se envía, se enfoca el primer campo y se anuncia
// =====================================================================
function mensajeError(el) {
  const v = el.validity;
  if (v.valueMissing) return 'Este campo es obligatorio.';
  if (v.typeMismatch) return el.type === 'email' ? 'Escribe un correo válido, por ejemplo nombre@empresa.com.' : 'El formato no es válido.';
  if (v.badInput) return 'Escribe un número válido.';
  if (v.rangeUnderflow) return `Debe ser ${el.min} o más.`;
  if (v.rangeOverflow) return `Debe ser ${el.max} o menos.`;
  if (v.tooShort) return `Escribe al menos ${el.minLength} caracteres.`;
  if (v.customError) return el.validationMessage;
  return '';
}

function validarCampo(el) {
  if (!el.willValidate) return true;
  const msg = mensajeError(el);
  if (!el.id) el.id = 'campo-' + Math.random().toString(36).slice(2, 8);
  const errId = el.id + '-error';
  let p = document.getElementById(errId);
  if (msg) {
    if (!p) {
      p = document.createElement('p');
      p.id = errId;
      p.className = 'field-err';
      el.insertAdjacentElement('afterend', p);
    }
    p.textContent = msg;
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', errId);
  } else {
    if (p) p.remove();
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  }
  return !msg;
}

const campoValidable = t => t && t.closest && t.closest('[data-validar]') && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName);
document.addEventListener('focusout', e => { if (campoValidable(e.target) && e.target.value !== '') validarCampo(e.target); });
document.addEventListener('input', e => { if (campoValidable(e.target) && e.target.getAttribute('aria-invalid') === 'true') validarCampo(e.target); });

// Botón de guardar dentro de un formulario validable: se revisa ANTES de la acción (fase de captura)
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-validar] [data-a]');
  if (!btn || !/(save|ok)$/.test(btn.dataset.a)) return;
  const form = btn.closest('[data-validar]');
  const malos = [...form.querySelectorAll('input, select, textarea')].filter(c => !validarCampo(c));
  if (!malos.length) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  malos[0].focus();
  anunciar(`No se guardó: revisa ${malos.length === 1 ? 'el campo marcado' : `${malos.length} campos marcados`}. ${mensajeError(malos[0])}`, true);
}, true);

// =====================================================================
// 3. FOCO Y NAVEGACIÓN POR TECLADO
// =====================================================================
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const visibles = cont => [...cont.querySelectorAll(ENFOCABLES)].filter(el => el.offsetParent !== null || el === document.activeElement);

// Focus trap genérico: Tab y Shift+Tab giran dentro del contenedor
function atraparFoco(cont, e) {
  const f = visibles(cont);
  if (!f.length) return;
  const primero = f[0], ultimo = f[f.length - 1];
  if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
}

// Los <dialog> abiertos con showModal() ya atrapan el foco de forma nativa (el resto de la página queda inerte)
// y lo devuelven al elemento que los abrió al cerrarse. Aquí solo se les da nombre accesible.
const _showModal = HTMLDialogElement.prototype.showModal;
HTMLDialogElement.prototype.showModal = function () {
  const h = this.querySelector('h1, h2, h3');
  if (h) {
    if (!h.id) h.id = (this.id || 'dlg') + '-titulo';
    this.setAttribute('aria-labelledby', h.id);
  }
  return _showModal.call(this);
};

// Menú flotante de WhatsApp / recordatorios (no modal): foco al abrir, trap con Tab y retorno al cerrar
const _placePop = placePop, _closePop = closePop, _renderWaPop = renderWaPop, _renderSnz = renderSnz;
placePop = function (anchor) {
  _placePop(anchor);
  const el = POP.el;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Mensajes de WhatsApp y recordatorios');
  POP.retorno = anchor;
  const primero = visibles(el).find(b => b.dataset.a !== 'popx') || visibles(el)[0];
  if (primero) primero.focus();
};
closePop = function () {
  const tenia = POP.el && POP.el.contains(document.activeElement);
  _closePop();
  if (tenia && POP.retorno && document.contains(POP.retorno)) POP.retorno.focus();
};
// Al redibujar el menú (cambiar categoría o parada) el foco vuelve al mismo botón
const conservarFoco = fn => function (...a) {
  const act = document.activeElement;
  const clave = act && POP.el && POP.el.contains(act) ? [act.dataset.a, act.dataset.m, act.dataset.id] : null;
  fn.apply(this, a);
  if (!clave) return;
  const igual = [...POP.el.querySelectorAll('[data-a]')].find(b => b.dataset.a === clave[0] && b.dataset.m === clave[1] && b.dataset.id === clave[2]);
  (igual || visibles(POP.el)[0] || POP.el).focus();
};
renderWaPop = conservarFoco(_renderWaPop);
renderSnz = conservarFoco(_renderSnz);

document.addEventListener('keydown', e => {
  if (e.key === 'Tab' && POP.el && !POP.el.classList.contains('hidden') && POP.el.contains(document.activeElement)) atraparFoco(POP.el, e);
});

// Elementos clicables que no son botones (tarjetas, filas): se hacen enfocables y se activan con Enter/Espacio
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-a]:not(button)')) {
    e.preventDefault();
    e.target.click();
  }
});

// Indica la sección actual (aria-current) en el menú lateral y en el móvil
const _switchView = switchView;
switchView = function (v) {
  _switchView(v);
  document.querySelectorAll('[data-a="vw"]').forEach(b => {
    const act = b.dataset.m === v;
    if (act) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    if (b.closest('#mobile-nav')) {
      b.classList.toggle('bg-bizdark', act); b.classList.toggle('text-white', act);
      b.classList.toggle('bg-bizbg', !act); b.classList.toggle('text-bizmuted', !act);
    }
  });
};

// =====================================================================
// 4. ARIA AUTOMÁTICO: se aplica a todo lo que la app dibuja
// =====================================================================
function mejorarAccesibilidad() {
  // Tarjetas y filas clicables → botones accesibles por teclado
  document.querySelectorAll('[data-a]:not(button):not(a):not(input):not(select):not(textarea):not(label)').forEach(el => {
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  });
  // Botones solo con ícono → nombre accesible (title o "Cerrar")
  document.querySelectorAll('button:not([aria-label]), a[href]:not([aria-label])').forEach(b => {
    if (b.textContent.trim()) return;
    const nombre = b.getAttribute('title') || (b.querySelector('.lucide-x') ? 'Cerrar' : '');
    if (nombre) b.setAttribute('aria-label', nombre);
  });
  // Íconos decorativos ocultos para el lector
  document.querySelectorAll('svg.lucide:not([aria-hidden])').forEach(s => s.setAttribute('aria-hidden', 'true'));
  // Selects y campos sin etiqueta visible: usan su placeholder o título
  document.querySelectorAll('input:not([aria-label]):not([id]), select:not([aria-label]):not([id]), textarea:not([aria-label]):not([id])').forEach(c => {
    const n = c.placeholder || c.title;
    if (n && !c.closest('label')) c.setAttribute('aria-label', n);
  });
  // Pestañas de filtro (chips) → estado presionado
  document.querySelectorAll('button.rounded-full:is([data-a$="chip"], [data-a$="fil"], [data-a="popcat"], [data-a="hmode"], [data-a="esub"], [data-a="tplcat"], [data-a="tkper"])').forEach(b => {
    b.setAttribute('aria-pressed', b.classList.contains('bg-bizdark') ? 'true' : 'false');
  });
}
let mejorarPendiente = false;
new MutationObserver(() => {
  if (mejorarPendiente) return;
  mejorarPendiente = true;
  requestAnimationFrame(() => { mejorarPendiente = false; mejorarAccesibilidad(); });
}).observe(document.body, { childList: true, subtree: true });

// =====================================================================
// 2. ATAJOS DE TECLADO
//    Registro modular: Atajos.add({ keys, desc, grupo, run, when?, enInputs? })
//    - keys: 'mod+k' (Ctrl o ⌘), 'shift+t' → 'T', '?', 'g d' (secuencia: g y luego d)
//    - No se disparan mientras se escribe en un campo (salvo enInputs: true)
//    - Solo se anula el comportamiento del navegador para las combinaciones registradas
// =====================================================================
const Atajos = {
  lista: [],
  seq: null,
  seqTimer: null,

  add(def) { this.lista.push(def); return this; },

  editable: el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)),

  // Normaliza el evento: 'mod+k', 'mod+shift+z', '?', 'T', 'escape', 'g'
  combo(e) {
    const mod = e.ctrlKey || e.metaKey;
    let k = e.key === ' ' ? 'space' : e.key;
    if (k.length === 1) { if (mod || e.altKey) k = k.toLowerCase(); }
    else k = k.toLowerCase();
    return [mod && 'mod', e.altKey && 'alt', (mod || e.altKey) && e.shiftKey && 'shift', k].filter(Boolean).join('+');
  },

  manejar(e) {
    if (e.defaultPrevented || e.isComposing || e.repeat && !/^mod\+/.test(this.combo(e))) return;
    const c = this.combo(e), escribiendo = this.editable(e.target);
    const valido = d => (!escribiendo || d.enInputs) && (!d.when || d.when());

    if (this.seq && !escribiendo) {
      const d = this.lista.find(a => a.keys === `${this.seq} ${c}` && valido(a));
      this.seq = null;
      if (d) { e.preventDefault(); d.run(e); return; }
    }
    const d = this.lista.find(a => a.keys === c && a.run && valido(a));
    if (d) { e.preventDefault(); d.run(e); return; }
    // Inicio de secuencia (ej. "g")
    if (!escribiendo && !e.ctrlKey && !e.metaKey && !e.altKey && this.lista.some(a => a.keys.startsWith(c + ' '))) {
      this.seq = c;
      clearTimeout(this.seqTimer);
      this.seqTimer = setTimeout(() => { this.seq = null; }, 1200);
    }
  },

  // Texto de las teclas para mostrar: 'mod+k' → [Ctrl][K]
  teclas(keys) {
    return keys.split(' ').map(parte => parte.split('+').map(k => ({
      mod: TECLA_MOD, shift: 'Shift', alt: ES_MAC ? '⌥' : 'Alt', escape: 'Esc', enter: 'Enter',
      arrowup: '↑', arrowdown: '↓', tab: 'Tab'
    }[k] || (k.length === 1 && k !== k.toLowerCase() ? `Shift ${k}` : k.toUpperCase())))
      .map(t => t.split(' ').map(x => `<kbd>${esc(x)}</kbd>`).join('<span class="text-bizmuted text-[10px] mx-0.5">+</span>'))
      .join('<span class="text-bizmuted text-[10px] mx-0.5">+</span>'))
      .join('<span class="text-[11px] text-bizmuted mx-1.5">luego</span>');
  }
};
document.addEventListener('keydown', e => Atajos.manejar(e));

const sinModal = () => !document.querySelector('dialog[open]');

// Guardar (Ctrl/⌘ + S): en un diálogo pulsa su botón de guardar; si no, sincroniza con Supabase
function guardarAhora() {
  const dlg = [...document.querySelectorAll('dialog[open]')].pop();
  if (dlg) {
    const b = dlg.querySelector('[data-a$="save"], [data-a="tkok"], [data-a="isave"]');
    if (b) { b.click(); return; }
  }
  if (typeof DB !== 'undefined' && DB.ready) flush().then(() => toast('Cambios guardados'));
  else toast('Modo demo: los cambios no se guardan en la nube');
}

const irA = (vista, nombre) => () => { switchView(vista); anunciar(`Sección ${nombre}`); document.getElementById('main-content').focus({ preventScroll: true }); };

Atajos
  .add({ keys: 'mod+k', grupo: 'General', desc: 'Búsqueda rápida y comandos', enInputs: true, run: () => abrirPaleta() })
  .add({ keys: '/', grupo: 'General', desc: 'Ir al buscador de la sección', when: sinModal, run: () => { const s = document.getElementById('global-search'); s.focus(); s.select(); } })
  .add({ keys: 'mod+s', grupo: 'General', desc: 'Guardar (en un formulario: su botón Guardar)', enInputs: true, run: guardarAhora })
  .add({ keys: 'mod+z', grupo: 'General', desc: 'Deshacer la última eliminación', when: () => !!Deshacer.ultimo, run: () => Deshacer.ultimo && Deshacer.ultimo() })
  .add({ keys: 'escape', grupo: 'General', desc: 'Cerrar diálogo, menú o búsqueda' })
  .add({ keys: '?', grupo: 'General', desc: 'Mostrar esta guía de atajos', when: sinModal, run: () => abrirGuia() })
  .add({ keys: 'T', grupo: 'General', desc: 'Cambiar tema: sistema, claro, oscuro', when: sinModal, run: () => Tema.ciclar() })
  .add({ keys: 'n', grupo: 'Acciones', desc: 'Crear nuevo en la sección actual (ficha, cliente, garantía…)', when: sinModal, run: () => document.getElementById('main-action-btn').click() })
  .add({ keys: 'g i', grupo: 'Ir a', desc: 'Dashboard', when: sinModal, run: irA('ini', 'Dashboard') })
  .add({ keys: 'g d', grupo: 'Ir a', desc: 'Despacho & Rutas', when: sinModal, run: irA('desp', 'Despacho') })
  .add({ keys: 'g c', grupo: 'Ir a', desc: 'Clientes', when: sinModal, run: irA('cli', 'Clientes') })
  .add({ keys: 'g w', grupo: 'Ir a', desc: 'Garantías & Postventa', when: sinModal, run: irA('gar', 'Garantías') })
  .add({ keys: 'g k', grupo: 'Ir a', desc: 'Catálogo & Servicios', when: sinModal, run: irA('cat', 'Catálogo') })
  .add({ keys: 'g m', grupo: 'Ir a', desc: 'Mensajes & Seguimiento', when: sinModal, run: irA('msg', 'Mensajes') })
  .add({ keys: 'g p', grupo: 'Ir a', desc: 'Planeación Visual', when: sinModal, run: irA('plan', 'Planeación') })
  .add({ keys: 'g h', grupo: 'Ir a', desc: 'Horas & Asistencia', when: sinModal, run: irA('hor', 'Horas') })
  .add({ keys: 'g e', grupo: 'Ir a', desc: 'Inventario & Equipos', when: sinModal, run: irA('eq', 'Equipos') })
  .add({ keys: 'g t', grupo: 'Ir a', desc: 'Contratistas', when: sinModal, run: irA('con', 'Contratistas') })
  .add({ keys: 'g r', grupo: 'Ir a', desc: 'Proveedores', when: sinModal, run: irA('prov', 'Proveedores') })
  .add({ keys: 'enter', grupo: 'En listas y tarjetas', desc: 'Abrir la tarjeta o fila enfocada' })
  .add({ keys: 'tab', grupo: 'En listas y tarjetas', desc: 'Siguiente elemento (Shift + Tab: anterior)' });

// Guía de atajos (modal accesible)
function abrirGuia() {
  const grupos = [...new Set(Atajos.lista.map(a => a.grupo))];
  document.getElementById('keys-body').innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h2 class="text-base font-bold text-bizdark">Atajos de teclado</h2>
          <p class="text-xs text-bizmuted font-medium">No se activan mientras escribes en un campo, salvo ${TECLA_MOD} + K y ${TECLA_MOD} + S.</p>
        </div>
        <button type="button" onclick="this.closest('dialog').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark" aria-label="Cerrar guía de atajos"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        ${grupos.map(g => `
          <section aria-labelledby="atajos-${g.replace(/\W/g, '')}">
            <h3 id="atajos-${g.replace(/\W/g, '')}" class="text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-2">${esc(g)}</h3>
            <dl class="space-y-2">
              ${Atajos.lista.filter(a => a.grupo === g).map(a => `
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-xs font-semibold text-bizdark">${esc(a.desc)}</dt>
                  <dd class="flex items-center shrink-0">${Atajos.teclas(a.keys)}</dd>
                </div>`).join('')}
            </dl>
          </section>`).join('')}
      </div>
    </div>`;
  lucide.createIcons();
  const d = document.getElementById('dlg-keys');
  if (!d.open) d.showModal();
}

// =====================================================================
// BÚSQUEDA RÁPIDA / PALETA DE COMANDOS (Ctrl/⌘ + K)
// Patrón ARIA combobox + listbox: el foco se queda en el campo y las flechas
// mueven la opción activa (aria-activedescendant).
// =====================================================================
const PAL = { items: [], idx: 0 };
const normalizar = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function comandos() {
  const secciones = [
    ['ini', 'Dashboard', 'layout-dashboard'], ['desp', 'Despacho & Rutas', 'truck'], ['cli', 'Clientes (CRM)', 'users'],
    ['gar', 'Garantías & Postventa', 'shield-check'], ['cat', 'Catálogo & Servicios', 'tag'], ['msg', 'Mensajes & Seguimiento', 'messages-square'],
    ['plan', 'Planeación Visual', 'kanban-square'], ['hor', 'Horas & Asistencia', 'clock'], ['eq', 'Inventario & Equipos', 'wrench'],
    ['con', 'Contratistas', 'hard-hat'], ['prov', 'Proveedores', 'package-search']
  ];
  return [
    ...secciones.map(([v, n, i]) => ({ g: 'Ir a', t: n, i, run: irA(v, n) })),
    { g: 'Acciones', t: 'Nueva ficha de despacho', i: 'plus', run: () => { switchView('desp'); openWizard(); } },
    { g: 'Acciones', t: 'Registrar garantía', i: 'shield-plus', run: () => { switchView('gar'); openGarForm(); } },
    { g: 'Acciones', t: 'Nuevo ítem del catálogo', i: 'tag', run: () => { switchView('cat'); catForm(null); } },
    { g: 'Acciones', t: 'Nueva plantilla de mensaje', i: 'message-square-plus', run: () => ACT.tplnew() },
    { g: 'Acciones', t: 'Cambiar tema (claro / oscuro / sistema)', i: 'sun-moon', run: () => Tema.ciclar() },
    { g: 'Acciones', t: 'Ver atajos de teclado', i: 'keyboard', run: () => abrirGuia() },
    ...CLI.map(c => ({ g: 'Clientes', t: c.n, s: [c.tp, c.z, c.t].filter(Boolean).join(' · '), i: 'user', run: () => { switchView('cli'); LS.sel = c.id; renderClientes(); } })),
    ...F.map(f => ({ g: 'Fichas', t: `Ficha ${f.cod} · ${f.veh.n}`, s: f.par.map(p => p.n).join(', '), i: 'truck', run: () => { switchView('desp'); openCfg(f.id); } })),
    ...GAR.map(g => { const c = garCli(g); return { g: 'Garantías', t: g.prod, s: [c && c.n, g.serie].filter(Boolean).join(' · '), i: 'shield-check', run: () => { switchView('gar'); GS.q = g.serie || g.prod; renderGarantias(); } }; }),
    ...CAT.map(c => ({ g: 'Catálogo', t: c.nombre, s: `${c.categoria} · ${$m(c.precio_estandar)}`, i: 'tag', run: () => { switchView('cat'); catForm(c); } }))
  ];
}

function abrirPaleta() {
  closePop();
  [...document.querySelectorAll('dialog[open]')].forEach(d => { if (d.id !== 'dlg-cmd') d.close(); });
  document.getElementById('cmd-body').innerHTML = `
    <div class="flex items-center gap-3 px-5 py-4 border-b border-bizborder">
      <i data-lucide="search" class="w-5 h-5 text-bizmuted shrink-0"></i>
      <h2 id="cmd-titulo" class="sr-only">Búsqueda rápida</h2>
      <input id="cmd-q" type="text" autocomplete="off" spellcheck="false" placeholder="Busca una sección, acción, cliente, ficha o producto…"
        role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-autocomplete="list" aria-labelledby="cmd-titulo"
        class="flex-1 min-w-0 bg-transparent text-sm font-semibold text-bizdark placeholder:text-bizmuted focus:outline-none">
      <kbd>Esc</kbd>
    </div>
    <ul id="cmd-list" role="listbox" aria-label="Resultados" class="max-h-[50vh] overflow-y-auto p-2"></ul>
    <p class="px-5 py-2.5 border-t border-bizborder text-[11px] text-bizmuted font-semibold flex flex-wrap gap-x-4 gap-y-1">
      <span><kbd>↑</kbd> <kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span>
    </p>
    <p id="cmd-estado" class="sr-only" role="status" aria-live="polite"></p>`;
  const d = document.getElementById('dlg-cmd');
  if (!d.open) d.showModal();
  const q = document.getElementById('cmd-q');
  q.addEventListener('input', () => filtrarPaleta(q.value));
  q.addEventListener('keydown', teclaPaleta);
  filtrarPaleta('');
  q.focus();
}

function filtrarPaleta(texto) {
  const q = normalizar(texto).trim();
  const todos = comandos();
  PAL.items = (q ? todos.filter(c => normalizar(`${c.t} ${c.s || ''} ${c.g}`).includes(q)) : todos.filter(c => ['Ir a', 'Acciones'].includes(c.g))).slice(0, 40);
  PAL.idx = 0;
  const lista = document.getElementById('cmd-list');
  let grupo = '';
  lista.innerHTML = PAL.items.map((c, i) => {
    const cab = c.g !== grupo ? `<li role="presentation" class="px-3 pt-3 pb-1 text-[10px] font-bold text-bizmuted uppercase tracking-wider">${esc(grupo = c.g)}</li>` : '';
    return `${cab}<li id="cmd-op-${i}" role="option" aria-selected="${i === 0}" data-i="${i}" class="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer">
      <i data-lucide="${c.i}" class="w-4 h-4 text-bizmuted shrink-0"></i>
      <span class="min-w-0"><span class="block text-sm font-semibold text-bizdark truncate">${esc(c.t)}</span>${c.s ? `<span class="block text-[11px] text-bizmuted truncate">${esc(c.s)}</span>` : ''}</span>
    </li>`;
  }).join('') || '<li role="presentation" class="px-3 py-6 text-center text-sm text-bizmuted">Sin resultados</li>';
  lista.querySelectorAll('[role="option"]').forEach(li => {
    li.addEventListener('click', () => ejecutarPaleta(+li.dataset.i));
    li.addEventListener('mousemove', () => marcarPaleta(+li.dataset.i, false));
  });
  lucide.createIcons();
  marcarPaleta(0, false);
  document.getElementById('cmd-estado').textContent = PAL.items.length ? `${PAL.items.length} resultados` : 'Sin resultados';
}

function marcarPaleta(i, scroll = true) {
  if (!PAL.items.length) { document.getElementById('cmd-q').removeAttribute('aria-activedescendant'); return; }
  PAL.idx = (i + PAL.items.length) % PAL.items.length;
  document.querySelectorAll('#cmd-list [role="option"]').forEach(li => li.setAttribute('aria-selected', String(+li.dataset.i === PAL.idx)));
  const act = document.getElementById('cmd-op-' + PAL.idx);
  document.getElementById('cmd-q').setAttribute('aria-activedescendant', 'cmd-op-' + PAL.idx);
  if (scroll && act) act.scrollIntoView({ block: 'nearest' });
}

function teclaPaleta(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); marcarPaleta(PAL.idx + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); marcarPaleta(PAL.idx - 1); }
  else if (e.key === 'Home') { e.preventDefault(); marcarPaleta(0); }
  else if (e.key === 'End') { e.preventDefault(); marcarPaleta(PAL.items.length - 1); }
  else if (e.key === 'Enter') { e.preventDefault(); ejecutarPaleta(PAL.idx); }
}

function ejecutarPaleta(i) {
  const c = PAL.items[i];
  if (!c) return;
  document.getElementById('dlg-cmd').close();
  setTimeout(() => c.run(), 0);
}

// Acciones de los botones nuevos del encabezado
Object.assign(ACT, {
  tema: () => Tema.ciclar(),
  atajos: () => abrirGuia(),
  cmdk: () => abrirPaleta()
});

// ---------- Arranque ----------
Tema.aplicar();
document.querySelectorAll('kbd[data-mod]').forEach(k => { k.textContent = TECLA_MOD; });
mejorarAccesibilidad();
