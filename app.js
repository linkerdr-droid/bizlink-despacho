/**
 * BizLink Despacho & Gestión Operativa
 * Recreación y Modernización Frontend del Sistema de Despacho Diario
 */

// Utilidades DOM y escape
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addD = (d, n) => { const x = new Date(d + 'T12:00'); x.setDate(x.getDate() + n); return iso(x); };
const dAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const $m = n => '$ ' + Number(n || 0).toLocaleString('es-DO');
const fmt1 = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
const wa = t => { t = String(t || '').replace(/\D/g, ''); return t.length === 10 ? '1' + t : t; };
const wlink = (c, text) => `https://wa.me/${wa(c.t || c.tel)}?text=${encodeURIComponent(text)}`;
const ini = n => (n || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

// Constantes de Flujo y Estados
const FL = [
  { id: 'borrador', l: 'Borrador', t: 'slate' },
  { id: 'asignado', l: 'Por iniciar', t: 'amber' },
  { id: 'en_ruta', l: 'En ruta', t: 'emerald' },
  { id: 'en_sitio', l: 'En sitio', t: 'violet' },
  { id: 'completado', l: 'Completada', t: 'emerald' }
];

const VEH = [
  { id: 'v1', n: 'Hino 500', p: 'L-482 193', k: 'truck' },
  { id: 'v2', n: 'Hyundai H100', p: 'L-390 221', k: 'bus' },
  { id: 'v3', n: 'Toyota Hilux', p: 'A-771 045', k: 'car' },
  { id: 'v4', n: 'Isuzu NPR', p: 'L-120 884', k: 'truck' }
];

const PER = [
  { id: 'p1', n: 'Carlos Méndez', r: 'Líder / Chofer', e: 1, t: '18095550101', f: '' },
  { id: 'p2', n: 'Luis Peña', r: 'Técnico', e: 1, t: '18095550102', f: '' },
  { id: 'p3', n: 'Ana Rosario', r: 'Ayudante', e: 0, t: '18095550103', f: '' },
  { id: 'p4', n: 'Miguel Santana', r: 'Líder / Chofer', e: 1, t: '18095550104', f: '' },
  { id: 'p5', n: 'Rosa Almonte', r: 'Técnico', e: 0, t: '18095550105', f: '' },
  { id: 'p6', n: 'Juan Féliz', r: 'Ayudante', e: 1, t: '18095550106', f: '' }
];

const MOD = {
  herramientas: { t: 'Herramientas y equipos', d: 'Verificación en despacho con la cuadrilla', i: 'qr-code' },
  evidencia: { t: 'Evidencia fotográfica', d: 'Fotos de inicio y fin de ruta', i: 'camera' },
  odometro: { t: 'Odómetro y combustible', d: 'Kilometraje reportado por el chofer', i: 'gauge' },
  firmas: { t: 'Notas y firma del cliente', d: 'Conformidad y entrega', i: 'pen-tool' }
};

const PS = {
  pendiente: ['Pendiente', 'slate'],
  en_proceso: ['En proceso', 'violet'],
  completado: ['Completado', 'emerald']
};
const NEXT = { pendiente: 'en_proceso', en_proceso: 'completado', completado: 'pendiente' };

const mods = (a = []) => Object.keys(MOD).map(k => ({
  tipo: k,
  activo: a.includes(k),
  datos: k === 'herramientas' ? { items: [{ n: 'Taladro percutor', ok: true }, { n: 'Escalera 3 m', ok: false }] }
       : k === 'odometro' ? { ini: '124.500', fin: '' }
       : k === 'firmas' ? { nota: '', firmado: false }
       : { inicio: true, fin: false }
}));

// Estado de Fichas inicial
let F = [
  {
    id: 'f1', cod: 'F-01', veh: VEH[0], est: 'en_ruta',
    mem: [PER[0], PER[1], PER[2]],
    par: [
      { id: 's1', n: 'Plaza Central — Bloque A', t: 'Entrega', e: 'completado', h: '08:30' },
      { id: 's2', n: 'Clínica Santa María', t: 'Servicio técnico', e: 'en_proceso', h: '10:15' },
      { id: 's3', n: 'Almacén Zona Franca', t: 'Recogida', e: 'pendiente', h: '13:00' }
    ],
    mod: mods(['herramientas', 'odometro'])
  },
  {
    id: 'f2', cod: 'F-02', veh: VEH[1], est: 'asignado',
    mem: [PER[3], PER[4]],
    par: [
      { id: 's4', n: 'Supermercado Norte', t: 'Entrega', e: 'pendiente', h: '09:00' },
      { id: 's5', n: 'Hotel Costa Azul', t: 'Servicio técnico', e: 'pendiente', h: '11:30' }
    ],
    mod: mods(['evidencia', 'firmas'])
  },
  {
    id: 'f3', cod: 'F-03', veh: VEH[2], est: 'completado',
    mem: [PER[5]],
    par: [
      { id: 's6', n: 'Oficinas Torre Sur', t: 'Recogida', e: 'completado', h: '07:45' }
    ],
    mod: mods()
  }
];

// Estado Global de la App
const STATE = {
  view: 'desp',            // ini, desp, cli, plan, hor, eq, con, prov
  dispMode: 'kanban',      // kanban o grid
  search: '',
  stateFilter: 'todas',
  activeMenu: null,
  editingStop: null,       // { fid, sid }
  wizard: null,            // { p: 0, v: '', eq: [], s: '' }
  activeFichaId: 'f1'      // para resaltar tarjeta estilo Prime Estate
};

// ================= Clientes (CRM) =================
const TP = ['Empresa', 'Comercio', 'Institución', 'Persona', 'Otro'];
const LE = { act: ['Activo', 'emerald'], pot: ['Potencial', 'sky'], ina: ['Inactivo', 'slate'] };
const LT = {
  vis: ['Confirmar visita', 'Hola {n}, le escribe {e}. Le confirmo nuestra visita de mañana. ¿Nos confirma que estará disponible?'],
  lleg: ['Aviso de llegada', 'Hola {n}, le escribe {e}. Nuestro equipo va en camino y llegará en unos 30 minutos.'],
  cot: ['Enviar cotización', 'Hola {n}, le escribe {e}. Le envío la cotización que conversamos. Quedo atento a sus comentarios.'],
  cob: ['Recordatorio de pago', 'Hola {n}, le escribe {e}. Le recordamos amablemente que tiene un pago pendiente de {m}. ¿Nos confirma la fecha en que podrá realizarlo? Gracias.'],
  gra: ['Agradecer', 'Hola {n}, gracias por confiar en {e}. Quedamos a su orden para lo que necesite.'],
  seg: ['Seguimiento posventa', 'Hola {n}, le escribe {e}. Queremos saber cómo ha funcionado el trabajo que realizamos. ¿Todo en orden?'],
  lib: ['Mensaje libre', 'Hola {n}, ']
};

const CLI = [
  {
    id: 'l1', n: 'Clínica Santa María', tp: 'Empresa', ct: 'Altagracia Núñez', t: '8095571001', t2: '8095571002',
    em: 'mantenimiento@santamaria.example', dir: 'Av. Abraham Lincoln #1010', z: 'Piantini, Distrito Nacional',
    ref: 'Entrada lateral para proveedores', ml: '', hor: 'Lun a Vie, 8:00 a 16:00', pago: 30, desc: 5, lim: 200000,
    est: 'act', fav: true, f: '', nota: 'Avisar a seguridad antes de entrar. No trabajar en horas de consulta.',
    h: [
      { d: dAgo(50), c: 'Mantenimiento general de aires', m: 48000, pg: false },
      { d: dAgo(15), c: 'Revisión de planta eléctrica', m: 22000, pg: false },
      { d: dAgo(120), c: 'Instalación de 3 unidades de aire', m: 135000, pg: true }
    ],
    eq: [
      { id: 'q1', n: 'Aire acondicionado 5 ton', mm: 'Carrier 38AK', i: dAgo(300), g: addD(iso(new Date()), 65) },
      { id: 'q2', n: 'Planta eléctrica', mm: 'Cummins 60 kW', i: dAgo(700), g: dAgo(100) }
    ]
  },
  {
    id: 'l2', n: 'Supermercado Norte', tp: 'Comercio', ct: 'Wilson Pérez', t: '8295572003', t2: '',
    em: '', dir: 'Calle Principal #45', z: 'Los Prados', ref: 'Detrás del parqueo', ml: '',
    hor: 'Todos los días, 7:00 a 21:00', pago: 15, desc: 0, lim: 60000, est: 'act', fav: true, f: '',
    nota: 'Los trabajos en refrigeración deben hacerse antes de las 7:00 a. m.',
    h: [
      { d: dAgo(8), c: 'Reparación de cámara frigorífica', m: 31500, pg: false },
      { d: dAgo(60), c: 'Cambio de compresor', m: 54000, pg: true }
    ],
    eq: [{ id: 'q3', n: 'Cámara frigorífica', mm: 'Kolpak', i: dAgo(500), g: addD(iso(new Date()), 20) }]
  },
  {
    id: 'l3', n: 'Hotel Costa Azul', tp: 'Empresa', ct: 'Marisol Guzmán', t: '8095573004', t2: '',
    em: 'compras@costaazul.example', dir: 'Carretera Mella km 12', z: 'Santo Domingo Este',
    ref: 'Entrada de servicio, portón verde', ml: '', hor: 'Todos los días, 8:00 a 18:00', pago: 45, desc: 8, lim: 350000,
    est: 'act', fav: false, f: '', nota: 'Pedir autorización a gerencia para trabajar en habitaciones ocupadas.',
    h: [
      { d: dAgo(40), c: 'Mantenimiento de 12 minisplit', m: 78000, pg: true },
      { d: dAgo(25), c: 'Revisión de panel eléctrico', m: 19000, pg: false }
    ],
    eq: [{ id: 'q4', n: 'Minisplit 18 000 BTU ×12', mm: 'LG', i: dAgo(400), g: addD(iso(new Date()), 300) }]
  },
  {
    id: 'l4', n: 'María Fernández', tp: 'Persona', ct: '', t: '8495574005', t2: '', em: '',
    dir: 'Calle 3 #12, residencial Las Palmas', z: 'Santo Domingo Oeste', ref: 'Casa blanca, portón negro', ml: '',
    hor: 'Después de las 3:00 p. m.', pago: 0, desc: 0, lim: 0, est: 'act', fav: false, f: '',
    nota: 'Prefiere que la llamen antes de ir. Tiene un perro.',
    h: [{ d: dAgo(5), c: 'Instalación de luminarias', m: 7500, pg: true }], eq: []
  },
  {
    id: 'l5', n: 'Colegio San José', tp: 'Institución', ct: 'Rafael Díaz', t: '8095575006', t2: '', em: '',
    dir: 'Av. Independencia #200', z: 'Santo Domingo Oeste', ref: '', ml: '', hor: 'Lun a Vie, 7:30 a 15:30',
    pago: 30, desc: 0, lim: 0, est: 'pot', fav: false, f: '', nota: 'Esperando aprobación de cotización de cámaras.',
    h: [], eq: []
  },
  {
    id: 'l6', n: 'Taller Mecánico Reyes', tp: 'Comercio', ct: 'Pablo Reyes', t: '8295576007', t2: '', em: '',
    dir: 'Calle Duarte #88', z: 'Villa Mella', ref: '', ml: '', hor: 'Lun a Sáb, 8:00 a 17:00',
    pago: 15, desc: 0, lim: 0, est: 'ina', fav: false, f: '', nota: 'No ha solicitado servicios en más de un año.',
    h: [{ d: dAgo(420), c: 'Instalación eléctrica del taller', m: 26000, pg: true }], eq: []
  }
];

const LS = { sel: 'l1', q: '', cat: 'todos', fav: false, deuda: false, chk: [], tpl: 'vis', edited: null, edit: null, pf: '' };
const LB = { tpl: 'lleg', txt: null };
const CE = { emp: 'BizLink Logística' };

// Helpers de Saldos
const saldo = c => (c.h || []).filter(h => !h.pg).reduce((s, h) => s + (+h.m || 0), 0);
const vence = (c, h) => addD(h.d, +c.pago || 0);
const venc = (c, h) => !h.pg && vence(c, h) < iso(new Date());
const vencido = c => (c.h || []).filter(h => venc(c, h)).reduce((s, h) => s + (+h.m || 0), 0);

// ================= Contratistas & Proveedores =================
const ES = { disp: ['Disponible', 'emerald'], ocu: ['Ocupado', 'amber'], evit: ['No recomendado', 'rose'] };
const VE = { act: ['Activo', 'emerald'], pausa: ['En pausa', 'amber'], evit: ['No recomendado', 'rose'] };
const PG = { 0: 'Contado', 7: '7 días', 15: '15 días', 30: '30 días', 45: '45 días', 60: '60 días', 90: '90 días' };

const CON = [
  {
    id: 'c1', n: 'Pedro Almonte', o: 'Electricista', e: '', t: '8095551001', t2: '', z: 'Santo Domingo Oeste',
    tar: '1,500 por visita', cal: 5, est: 'disp', fav: true, nota: 'Muy puntual. También trabaja fines de semana.', f: '',
    h: [{ d: dAgo(20), j: 'Cambio de panel eléctrico', c: 18500, r: 'bien' }],
    k: [{ id: 'k1', pr: 'Remodelación oficina Plaza Norte', i: dAgo(10), f: addD(iso(new Date()), 20), m: 85000, et: [{ n: 'Anticipo', p: 30, pg: dAgo(10) }, { n: 'Avance 1', p: 40, pg: null }, { n: 'Pago final', p: 30, pg: null }], est: 'curso' }],
    docs: [{ id: 'd1', t: 'Cédula', d: '', v: '' }, { id: 'd2', t: 'Seguro', d: 'Riesgos laborales', v: addD(iso(new Date()), 12) }]
  },
  {
    id: 'c2', n: 'Rafael Cabrera', o: 'Plomero', e: 'Plomería Cabrera', t: '8295552002', t2: '', z: 'Distrito Nacional',
    tar: 'Por proyecto', cal: 4, est: 'disp', fav: true, nota: 'Tiene equipo de detección de fugas.', f: '',
    h: [{ d: dAgo(45), j: 'Reparación de tubería principal', c: 9800, r: 'bien' }],
    k: [{ id: 'k2', pr: 'Cambio de tuberías local comercial', i: dAgo(4), f: addD(iso(new Date()), 9), m: 46000, et: [{ n: 'Anticipo', p: 50, pg: dAgo(4) }, { n: 'Pago final', p: 50, pg: null }], est: 'curso' }],
    docs: [{ id: 'd4', t: 'Seguro', d: 'Responsabilidad civil', v: dAgo(5) }]
  }
];
const CS = { sel: 'c1', q: '', esp: 'todos', fav: false, chk: [], tpl: 'disp', edited: null, edit: null, pf: '' };

const PROV = [
  {
    id: 'v1', n: 'Ferretería El Constructor', c: 'Materiales de construcción', p: 'cemento, varillas, herramientas',
    ct: 'Luisa Peña', t: '8095561001', t2: '', em: 'ventas@elconstructor.example', dir: 'Av. Independencia km 8½',
    z: 'Santo Domingo Oeste', ref: 'Al lado de la estación', ml: '', hor: 'Lun a Sáb, 7:30 a 17:00', desc: 8, pago: 30,
    lim: 150000, ent: 1, min: '', tr: '8 % en compras mayores a 50,000.', cal: 5, est: 'act', fav: true, f: '',
    h: [
      { d: dAgo(55), c: 'Cemento y varillas obra Los Alcarrizos', m: 64000, pg: false },
      { d: dAgo(12), c: 'Tubería PVC y accesorios', m: 18500, pg: false }
    ]
  },
  {
    id: 'v2', n: 'Eléctricos Dominicana', c: 'Materiales eléctricos', p: 'cable, breakers, paneles',
    ct: 'Hugo Santana', t: '8295562003', t2: '', em: '', dir: 'Calle Duarte #145', z: 'Villa Consuelo',
    ref: 'Frente al colmado', ml: '', hor: 'Lun a Vie, 8:00 a 18:00', desc: 10, pago: 15, lim: 80000, ent: 2, min: '5,000',
    tr: '10 % en cable y breakers por volumen.', cal: 4, est: 'act', fav: true, f: '',
    h: [{ d: dAgo(20), c: 'Cable THHN y breakers', m: 27500, pg: false }]
  }
];
const VS = { sel: 'v1', q: '', cat: 'todas', fav: false, deuda: false, chk: [], tpl: 'cot', edited: null, edit: null, pf: '' };

// ================= Artículos & Asistencia =================
const ART = [
  { id: 'a1', n: 'Celular Samsung A14', c: 'Comunicación', d: 'IMEI 3568 2210 4471', i: 'smartphone', est: 'ok', asig: 'p1' },
  { id: 'a2', n: 'Celular Motorola E13', c: 'Comunicación', d: 'IMEI 3521 9980 1203', i: 'smartphone', est: 'ok', asig: 'p2' },
  { id: 'a3', n: 'Taladro percutor', c: 'Herramientas', d: 'Bosch · serie TB-204', i: 'wrench', est: 'ok', asig: 'p2' },
  { id: 'a4', n: 'Tester / multímetro', c: 'Herramientas', d: 'Fluke 117', i: 'zap', est: 'ok', asig: 'p2' },
  { id: 'a5', n: 'Escalera 3 m', c: 'Herramientas', d: '', i: 'hammer', est: 'ok', asig: null },
  { id: 'a6', n: 'Casco de seguridad', c: 'Protección', d: 'Talla única', i: 'hard-hat', est: 'ok', asig: 'p1' }
];
const LOG = [];
const EQ = { sub: 'per', sel: 'p2', q: '', cat: 'todas' };

const REG = {};
(function initReg() {
  for (let k = 0; k < 45; k++) {
    const d = new Date();
    d.setDate(d.getDate() - k);
    if (d.getDay() === 0) continue;
    PER.forEach((p, i) => {
      if ((k * 7 + i * 3) % 13 === 0) REG[p.id + '|' + iso(d)] = { ex: 0, fa: true };
      else if ((k + i * 2) % 6 === 0) REG[p.id + '|' + iso(d)] = { ex: [1, 2, 3, 1.5][(k + i) % 4], fa: false };
    });
  }
})();
const VW = { v: 'desp', m: 'sem', ref: new Date(), sel: null };

// ================= Planeación =================
const PB = {
  boards: [{
    id: 'b1', name: 'Obra Plaza Norte', items: [
      { id: 'i1', k: 'nota', x: 40, y: 40, text: 'Objetivo: remodelar oficina Plaza Norte en 3 semanas.', c: 'y' },
      { id: 'i2', k: 'cli', r: 'l2', x: 340, y: 40 },
      { id: 'i3', k: 'con', r: 'c1', x: 640, y: 40 },
      { id: 'i4', k: 'per', r: 'p2', x: 640, y: 220 }
    ],
    links: [{ id: 'k1', a: 'i2', b: 'i3' }, { id: 'k2', a: 'i3', b: 'i4' }]
  }],
  cur: 'b1', sub: 'pz', sel: new Set(), conn: false, first: null, txt: null, rcp: new Set(), rq: '',
  hist: [], lk: 'cli', lq: ''
};

// ================= Helpers de Renderizado =================
function renderSidebarMembers() {
  const container = $('#side-members-list');
  if (!container) return;
  container.innerHTML = PER.map(p => `
    <div class="flex items-center justify-between p-2 rounded-xl hover:bg-bizbg transition-all group">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-8 h-8 rounded-full bg-bizdark/5 text-bizdark border border-bizborder flex items-center justify-center font-bold text-xs shrink-0">
          ${p.f ? `<img src="${p.f}" class="w-full h-full rounded-full object-cover">` : ini(p.n)}
        </div>
        <div class="truncate">
          <p class="text-xs font-bold text-bizdark truncate leading-tight">${esc(p.n)}</p>
          <p class="text-[11px] text-bizmuted truncate">${esc(p.r)}</p>
        </div>
      </div>
      <span class="w-2 h-2 rounded-full ${p.e ? 'bg-emerald-500' : 'bg-amber-400'}" title="${p.e ? 'Confirmado' : 'Pendiente'}"></span>
    </div>
  `).join('');
}

function updateStatsBanner() {
  const activeFichas = F.filter(f => !['borrador', 'completado'].includes(f.est)).length;
  const totalStops = F.reduce((s, f) => s + f.par.length, 0);
  const doneStops = F.reduce((s, f) => s + f.par.filter(p => p.e === 'completado').length, 0);
  const efficiency = totalStops ? Math.round((doneStops / totalStops) * 100) : 100;
  const totalReceivables = CLI.reduce((s, c) => s + saldo(c), 0);

  const effEl = $('#stat-efficiency');
  if (effEl) effEl.textContent = `${efficiency}%`;

  const tasksEl = $('#stat-active-tasks');
  if (tasksEl) tasksEl.textContent = `${activeFichas} activas`;

  const taskSubEl = $('#stat-tasks-subtitle');
  if (taskSubEl) taskSubEl.textContent = `${totalStops - doneStops} paradas pendientes de entrega`;

  const recEl = $('#stat-receivables');
  if (recEl) recEl.textContent = $m(totalReceivables);

  const sideCount = $('#side-active-count');
  if (sideCount) sideCount.textContent = activeFichas;

  // Actualizar círculo de progreso SVG
  const circle = $('#gauge-circle');
  if (circle) {
    const totalLen = 238.76;
    const offset = totalLen - (totalLen * efficiency) / 100;
    circle.style.strokeDashoffset = offset;
  }
}

// ================= VISTA: DESPACHO (Kanban & Grid) =================
function renderDespacho() {
  const container = $('#desp-content');
  if (!container) return;

  const q = STATE.search.toLowerCase();
  const filtered = F.filter(f => {
    const matchText = `${f.cod} ${f.veh.n} ${f.veh.p} ${f.mem.map(m => m.n).join(' ')}`.toLowerCase();
    const matchQ = matchText.includes(q);
    const matchState = STATE.stateFilter === 'todas' || f.est === STATE.stateFilter;
    return matchQ && matchState;
  });

  if (STATE.dispMode === 'kanban') {
    // Modo KANBAN (columnas idénticas al screenshot de BizLink)
    container.innerHTML = `
      <div class="flex gap-5 overflow-x-auto pb-4 pt-1 items-start min-h-[600px]">
        ${FL.map(col => {
          const colFichas = filtered.filter(f => f.est === col.id);
          return `
            <div class="kanban-col flex flex-col gap-3">
              <!-- Header de Columna -->
              <div class="flex items-center justify-between px-1.5 py-1">
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-bizdark">${col.l}</h3>
                  <span class="text-xs font-semibold text-bizmuted bg-white px-2 py-0.5 rounded-full border border-bizborder shadow-2xs">${colFichas.length}</span>
                </div>
                <button data-a="wiz" class="text-bizmuted hover:text-bizdark p-1 rounded-md transition-colors" title="Agregar ficha a ${col.l}">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                </button>
              </div>

              <!-- Lista de Tarjetas de la Columna -->
              <div class="space-y-3.5 min-h-[120px]">
                ${colFichas.map(f => renderFichaCard(f, f.id === STATE.activeFichaId)).join('')}
                ${colFichas.length === 0 ? `<div class="border border-dashed border-bizborder rounded-2xl p-6 text-center text-xs font-medium text-bizmuted">Sin fichas</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    // Modo GRID Tradicional
    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${filtered.map(f => renderFichaCard(f, f.id === STATE.activeFichaId)).join('')}
        ${filtered.length === 0 ? `<div class="col-span-full biz-card p-12 text-center text-bizmuted font-medium">No se encontraron fichas con esos filtros.</div>` : ''}
      </div>
    `;
  }

  lucide.createIcons();
}

function renderFichaCard(f, isHighlightedDark = false) {
  const completedStops = f.par.filter(p => p.e === 'completado').length;
  const statusInfo = FL.find(x => x.id === f.est) || FL[0];
  const cardClass = isHighlightedDark ? 'biz-card-dark' : 'biz-card';

  return `
    <article class="${cardClass} p-5 space-y-4 group transition-all relative">
      <!-- Top Card Header -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl ${isHighlightedDark ? 'bg-white/10 text-white' : 'bg-bizdark text-white'} flex items-center justify-center shrink-0">
            <i data-lucide="${f.veh.k === 'truck' ? 'truck' : f.veh.k === 'bus' ? 'bus' : 'car'}" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-base font-bold ${isHighlightedDark ? 'text-white' : 'text-bizdark'} leading-tight">Ficha: ${esc(f.cod)}</h4>
            <p class="text-xs ${isHighlightedDark ? 'text-zinc-300' : 'text-bizmuted'} font-medium">${esc(f.veh.n)} · ${esc(f.veh.p)}</p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <span class="biz-pill pill-${statusInfo.t}">${statusInfo.l}</span>
          <button data-a="menu" data-id="${f.id}" class="p-1 rounded-lg text-bizmuted hover:text-bizdark transition-colors">
            <i data-lucide="more-vertical" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Menú contextual desplegable -->
        ${STATE.activeMenu === f.id ? `
          <div class="absolute right-4 top-14 z-40 w-48 bg-white border border-bizborder rounded-2xl p-1.5 shadow-xl space-y-1">
            <button data-a="send" data-id="${f.id}" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-bizdark hover:bg-bizbg transition-all">
              <i data-lucide="send" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>Enviar a Cuadrilla</span>
            </button>
            <button data-a="cfg" data-id="${f.id}" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-bizdark hover:bg-bizbg transition-all">
              <i data-lucide="settings-2" class="w-3.5 h-3.5 text-bizmuted"></i>
              <span>Ajustes & Paradas</span>
            </button>
            <button data-a="dup" data-id="${f.id}" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-bizdark hover:bg-bizbg transition-all">
              <i data-lucide="copy" class="w-3.5 h-3.5 text-bizmuted"></i>
              <span>Duplicar Ficha</span>
            </button>
            <button data-a="adv" data-id="${f.id}" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-bizdark hover:bg-bizbg transition-all">
              <i data-lucide="arrow-right-left" class="w-3.5 h-3.5 text-bizmuted"></i>
              <span>Avanzar Estado</span>
            </button>
            <div class="border-t border-bizborder my-1"></div>
            <button data-a="del" data-id="${f.id}" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              <span>Eliminar Ficha</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Cuadrilla Asignada -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider ${isHighlightedDark ? 'text-zinc-400' : 'text-bizmuted'}">
          <span>Célula de Trabajo</span>
          <span>${f.mem.length} miembros</span>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${f.mem.map(m => `
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isHighlightedDark ? 'bg-white/10 text-white' : 'bg-bizbg text-bizdark'} text-xs font-medium">
              <span class="w-1.5 h-1.5 rounded-full ${m.e ? 'bg-emerald-500' : 'bg-amber-400'}"></span>
              <span>${esc(m.n.split(' ')[0])}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Ruta del Día & Paradas -->
      <div class="space-y-2.5 pt-1">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold ${isHighlightedDark ? 'text-white' : 'text-bizdark'}">Ruta del Día</span>
          <span class="text-[11px] font-semibold ${isHighlightedDark ? 'text-zinc-300' : 'text-bizmuted'}">${completedStops}/${f.par.length} listas</span>
        </div>

        <!-- Progress line -->
        <div class="w-full h-1.5 bg-bizborder rounded-full overflow-hidden">
          <div class="h-full bg-emerald-500 rounded-full transition-all duration-300" style="width: ${f.par.length ? (completedStops / f.par.length) * 100 : 0}%"></div>
        </div>

        <ul class="space-y-2 pt-1">
          ${f.par.slice(0, 3).map((p, i) => `
            <li class="flex items-center justify-between gap-2 text-xs">
              <div class="flex items-center gap-2 truncate">
                <button data-a="cyc" data-id="${f.id}" data-s="${p.id}" class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 transition-transform active:scale-90 ${p.e === 'completado' ? 'bg-emerald-500 text-white' : p.e === 'en_proceso' ? 'bg-violet-600 text-white' : 'bg-bizborder text-bizmuted'}">
                  ${p.e === 'completado' ? '<i data-lucide="check" class="w-3 h-3"></i>' : i + 1}
                </button>
                <span class="truncate font-semibold ${p.e === 'completado' ? 'line-through text-bizmuted' : isHighlightedDark ? 'text-white' : 'text-bizdark'}">${esc(p.n)}</span>
              </div>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.e === 'completado' ? 'bg-emerald-50 text-emerald-700' : 'bg-bizbg text-bizmuted'} shrink-0">${p.h || p.t}</span>
            </li>
          `).join('')}
          ${f.par.length > 3 ? `<p class="text-[11px] text-bizmuted font-semibold text-center">+${f.par.length - 3} paradas más...</p>` : ''}
        </ul>
      </div>

      <!-- Módulos Activos (Resumen) -->
      ${renderCardModules(f, isHighlightedDark)}

      <!-- Bottom Card Actions -->
      <div class="pt-2 border-t ${isHighlightedDark ? 'border-white/10' : 'border-bizborder'} flex items-center justify-between gap-2">
        <button data-a="send" data-id="${f.id}" class="px-3.5 py-1.5 rounded-full text-xs font-bold ${isHighlightedDark ? 'bg-white text-bizdark hover:bg-neutral-200' : 'bg-bizdark text-white hover:bg-neutral-800'} flex items-center gap-1.5 shadow-sm transition-all">
          <i data-lucide="send" class="w-3.5 h-3.5"></i>
          <span>Enviar WhatsApp</span>
        </button>

        <button data-a="cfg" data-id="${f.id}" class="p-1.5 text-bizmuted hover:text-bizdark rounded-lg transition-colors" title="Ajustes">
          <i data-lucide="sliders-horizontal" class="w-4 h-4"></i>
        </button>
      </div>
    </article>
  `;
}

function renderCardModules(f, isDark) {
  const activeMods = f.mod.filter(m => m.activo);
  if (!activeMods.length) return '';

  return `
    <div class="pt-2 space-y-2 border-t ${isDark ? 'border-white/10' : 'border-bizborder'}">
      ${activeMods.map(m => {
        const info = MOD[m.tipo];
        if (m.tipo === 'herramientas') {
          const checked = m.datos.items.filter(x => x.ok).length;
          return `
            <div class="flex items-center justify-between text-xs p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-bizbg'}">
              <span class="flex items-center gap-1.5 font-semibold ${isDark ? 'text-zinc-200' : 'text-bizdark'}">
                <i data-lucide="wrench" class="w-3.5 h-3.5 text-bizmuted"></i>
                <span>${info.t}</span>
              </span>
              <span class="text-[11px] font-bold ${isDark ? 'text-zinc-300' : 'text-bizmuted'}">${checked}/${m.datos.items.length} ok</span>
            </div>
          `;
        }
        if (m.tipo === 'odometro') {
          return `
            <div class="flex items-center justify-between text-xs p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-bizbg'}">
              <span class="flex items-center gap-1.5 font-semibold ${isDark ? 'text-zinc-200' : 'text-bizdark'}">
                <i data-lucide="gauge" class="w-3.5 h-3.5 text-bizmuted"></i>
                <span>Odómetro</span>
              </span>
              <span class="text-[11px] font-bold ${isDark ? 'text-zinc-300' : 'text-bizmuted'}">${m.datos.ini ? m.datos.ini + ' km' : 'Sin inicio'}</span>
            </div>
          `;
        }
        if (m.tipo === 'evidencia') {
          return `
            <div class="flex items-center justify-between text-xs p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-bizbg'}">
              <span class="flex items-center gap-1.5 font-semibold ${isDark ? 'text-zinc-200' : 'text-bizdark'}">
                <i data-lucide="camera" class="w-3.5 h-3.5 text-bizmuted"></i>
                <span>Evidencia</span>
              </span>
              <span class="text-[11px] font-bold text-emerald-600">Fotos cargadas</span>
            </div>
          `;
        }
        return '';
      }).join('')}
    </div>
  `;
}

// ================= VISTA: CLIENTES (CRM - BizLink Style) =================
function renderClientes() {
  const container = $('#cli-content');
  if (!container) return;

  const q = LS.q.toLowerCase();
  const list = CLI.filter(c => {
    const matchQ = [c.n, c.tp, c.ct, c.z, c.dir, c.nota, ...(c.eq || []).map(e => e.n)].join(' ').toLowerCase().includes(q);
    const matchCat = LS.cat === 'todos' || c.tp === LS.cat;
    const matchFav = !LS.fav || c.fav;
    const matchDeuda = !LS.deuda || saldo(c) > 0;
    return matchQ && matchCat && matchFav && matchDeuda;
  });

  const selectedClient = CLI.find(c => c.id === LS.sel) || list[0];

  container.innerHTML = `
    <!-- Clientes Header & Filters -->
    <div class="flex flex-wrap items-center justify-between gap-4 pb-2">
      <div class="flex items-center gap-2 flex-wrap">
        <button data-a="lchip" data-m="todos" class="px-3.5 py-1.5 rounded-full text-xs font-semibold ${LS.cat === 'todos' && !LS.fav && !LS.deuda ? 'bg-bizdark text-white' : 'bg-white border border-bizborder text-bizmuted'} transition-all">Todos</button>
        <button data-a="lfavf" class="px-3.5 py-1.5 rounded-full text-xs font-semibold ${LS.fav ? 'bg-bizdark text-white' : 'bg-white border border-bizborder text-bizmuted'} transition-all flex items-center gap-1">
          <i data-lucide="heart" class="w-3.5 h-3.5 ${LS.fav ? 'fill-white' : ''}"></i>
          <span>Favoritos</span>
        </button>
        <button data-a="ldeuf" class="px-3.5 py-1.5 rounded-full text-xs font-semibold ${LS.deuda ? 'bg-bizdark text-white' : 'bg-white border border-bizborder text-bizmuted'} transition-all">Con Saldo Pendiente</button>
      </div>

      <button data-a="lnew" class="bg-bizdark hover:bg-neutral-800 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all">
        <i data-lucide="plus" class="w-4 h-4"></i>
        <span>+ Nuevo Cliente</span>
      </button>
    </div>

    <!-- Master-Detail Split View -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Master List (5 cols) -->
      <div class="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
        ${list.map(c => {
          const s = saldo(c);
          const v = vencido(c);
          const isSelected = selectedClient && selectedClient.id === c.id;
          return `
            <div data-a="lsel" data-m="${c.id}" class="biz-card p-4.5 cursor-pointer transition-all ${isSelected ? 'border-bizdark ring-1 ring-bizdark shadow-md' : 'hover:border-bizmuted'}">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-bizdark/5 text-bizdark border border-bizborder flex items-center justify-center font-bold text-sm shrink-0">
                    ${c.f ? `<img src="${c.f}" class="w-full h-full rounded-full object-cover">` : ini(c.n)}
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-bizdark leading-tight">${esc(c.n)}</h4>
                    <p class="text-xs text-bizmuted font-medium">${esc(c.tp)}${c.z ? ' · ' + esc(c.z) : ''}</p>
                  </div>
                </div>

                <div class="text-right">
                  <span class="biz-pill pill-${LE[c.est][1]}">${LE[c.est][0]}</span>
                  ${v ? `<p class="text-[11px] font-bold text-rose-600 mt-1">Vence ${$m(v)}</p>` : s ? `<p class="text-[11px] font-bold text-amber-600 mt-1">Debe ${$m(s)}</p>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
        ${list.length === 0 ? `<div class="biz-card p-8 text-center text-xs text-bizmuted font-semibold">No hay clientes registrados con este filtro.</div>` : ''}
      </div>

      <!-- Right Detail Inspector (7 cols) -->
      <div class="lg:col-span-7">
        ${selectedClient ? renderClientDetail(selectedClient) : '<div class="biz-card p-12 text-center text-bizmuted">Selecciona un cliente para ver detalles.</div>'}
      </div>
    </div>
  `;

  lucide.createIcons();
}

function renderClientDetail(c) {
  const s = saldo(c);
  const v = vencido(c);
  const total = (c.h || []).reduce((acc, h) => acc + (+h.m || 0), 0);
  const txt = LS.edited != null ? LS.edited : (LT[LS.tpl] ? LT[LS.tpl][1].replace('{n}', c.n.split(' ')[0]).replace('{e}', CE.emp).replace('{m}', s > 0 ? $m(s) : '$0') : '');

  return `
    <div class="biz-card p-6 space-y-6">
      <!-- Client Profile Header -->
      <div class="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-bizborder">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-bizdark text-white flex items-center justify-center font-bold text-lg shadow-sm">
            ${c.f ? `<img src="${c.f}" class="w-full h-full rounded-2xl object-cover">` : ini(c.n)}
          </div>
          <div>
            <h3 class="text-xl font-bold text-bizdark leading-tight">${esc(c.n)}</h3>
            <p class="text-xs text-bizmuted font-medium mt-0.5">${esc(c.tp)} · Contacto: <span class="font-bold text-bizdark">${esc(c.ct || 'No asignado')}</span></p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button data-a="lfav" data-m="${c.id}" class="p-2 rounded-xl border border-bizborder text-bizmuted hover:text-rose-500 hover:bg-rose-50 transition-all" title="Favorito">
            <i data-lucide="heart" class="w-4 h-4 ${c.fav ? 'fill-rose-500 text-rose-500' : ''}"></i>
          </button>
          <button data-a="ledit" data-m="${c.id}" class="p-2 rounded-xl border border-bizborder text-bizmuted hover:text-bizdark hover:bg-bizbg transition-all" title="Editar">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <a href="tel:+${wa(c.t)}" class="px-3 py-2 rounded-xl bg-bizdark text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:bg-neutral-800">
            <i data-lucide="phone" class="w-3.5 h-3.5"></i>
            <span>Llamar</span>
          </a>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-bizbg p-3.5 rounded-2xl">
          <span class="text-[11px] font-bold text-bizmuted uppercase tracking-wider block">Por Cobrar</span>
          <b class="text-base font-extrabold text-bizdark mt-1 block">${$m(s)}</b>
        </div>
        <div class="bg-bizbg p-3.5 rounded-2xl">
          <span class="text-[11px] font-bold text-bizmuted uppercase tracking-wider block">Vencido</span>
          <b class="text-base font-extrabold ${v ? 'text-rose-600' : 'text-bizdark'} mt-1 block">${$m(v)}</b>
        </div>
        <div class="bg-bizbg p-3.5 rounded-2xl">
          <span class="text-[11px] font-bold text-bizmuted uppercase tracking-wider block">Término Pago</span>
          <b class="text-base font-extrabold text-bizdark mt-1 block">${PG[c.pago] || c.pago + ' días'}</b>
        </div>
        <div class="bg-bizbg p-3.5 rounded-2xl">
          <span class="text-[11px] font-bold text-bizmuted uppercase tracking-wider block">Total Facturado</span>
          <b class="text-base font-extrabold text-bizdark mt-1 block">${$m(total)}</b>
        </div>
      </div>

      <!-- Ubicación y Notas -->
      <div class="bg-bizbg p-4 rounded-2xl space-y-2 text-xs">
        <div class="flex items-center gap-2 text-bizdark font-semibold">
          <i data-lucide="map-pin" class="w-4 h-4 text-bizmuted"></i>
          <span>${esc(c.dir || 'Sin dirección registrada')} ${c.z ? '· ' + esc(c.z) : ''}</span>
        </div>
        ${c.nota ? `
          <div class="flex items-start gap-2 text-bizmuted font-medium pt-1">
            <i data-lucide="info" class="w-4 h-4 text-bizmuted shrink-0 mt-0.5"></i>
            <span>${esc(c.nota)}</span>
          </div>
        ` : ''}
      </div>

      <!-- Generador de WhatsApp -->
      <div class="space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-bizdark uppercase tracking-wider">Enviar Mensaje de WhatsApp</span>
          <select id="sel-client-tpl" class="text-xs bg-white border border-bizborder rounded-xl px-3 py-1 font-semibold text-bizdark">
            ${Object.entries(LT).map(([k, val]) => `<option value="${k}" ${k === LS.tpl ? 'selected' : ''}>${val[0]}</option>`).join('')}
          </select>
        </div>
        <textarea id="txt-client-msg" rows="3" class="w-full bg-bizbg border border-bizborder rounded-2xl p-3 text-xs font-medium text-bizdark focus:outline-none focus:ring-2 focus:ring-bizdark resize-none">${esc(txt)}</textarea>
        <div class="flex justify-end">
          <a id="btn-client-wa" target="_blank" rel="noopener" href="${wlink(c, txt)}" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
            <i data-lucide="send" class="w-3.5 h-3.5"></i>
            <span>Enviar por WhatsApp</span>
          </a>
        </div>
      </div>

      <!-- Equipos & Garantías del Cliente -->
      <div class="space-y-3 pt-2 border-t border-bizborder">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-bizdark uppercase tracking-wider">Equipos Instalados (${(c.eq || []).length})</span>
        </div>
        <div class="space-y-2">
          ${(c.eq || []).map(e => `
            <div class="flex items-center justify-between p-3 rounded-2xl bg-bizbg text-xs">
              <div>
                <p class="font-bold text-bizdark">${esc(e.n)} <span class="font-normal text-bizmuted">· ${esc(e.mm || '')}</span></p>
                <p class="text-[11px] text-bizmuted mt-0.5">Instalado: ${e.i || '—'} · Garantía: ${e.g || 'Sin garantía'}</p>
              </div>
              <span class="biz-pill pill-emerald">Garantía Vigente</span>
            </div>
          `).join('')}
          ${(!c.eq || !c.eq.length) ? '<p class="text-xs text-bizmuted">Sin equipos registrados para este cliente.</p>' : ''}
        </div>
      </div>
    </div>
  `;
}

// ================= VISTA: INICIO / DASHBOARD =================
function renderInicio() {
  const container = $('#ini-content');
  if (!container) return;

  container.innerHTML = `
    <div class="biz-card p-6 space-y-6">
      <div class="flex items-center justify-between pb-4 border-b border-bizborder">
        <div>
          <h2 class="text-lg font-bold text-bizdark">Panel de Control & Alertas Prioritarias</h2>
          <p class="text-xs text-bizmuted font-medium mt-0.5">Monitoreo en tiempo real de cuadrillas, vencimientos y pagos pendientes</p>
        </div>
        <button data-a="vw" data-m="desp" class="px-4 py-2 bg-bizdark text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
          <span>Ir a Despacho</span>
          <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </button>
      </div>

      <!-- Feed de Alertas Prioritarias -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 flex items-start gap-3">
          <div class="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
            <i data-lucide="alert-circle" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-rose-900">Documento de contratista vencido</h4>
            <p class="text-xs text-rose-700 mt-0.5">Rafael Cabrera: Seguro de Responsabilidad Civil venció hace 5 días.</p>
            <button data-a="vw" data-m="con" class="mt-2 text-xs font-bold text-rose-900 underline">Revisar contratistas →</button>
          </div>
        </div>

        <div class="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 flex items-start gap-3">
          <div class="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
            <i data-lucide="clock" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-amber-900">Cobro pendiente próximo a vencer</h4>
            <p class="text-xs text-amber-700 mt-0.5">Clínica Santa María: $ 70.000 pendiente por mantenimiento general.</p>
            <button data-a="vw" data-m="cli" class="mt-2 text-xs font-bold text-amber-900 underline">Ver cuenta del cliente →</button>
          </div>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
}

// ================= HELPERS DE VISTAS OPERATIVAS =================
const hoy = () => iso(new Date());
const dias = d => Math.round((new Date(d + 'T12:00') - new Date(hoy() + 'T12:00')) / 864e5);
const fdate = d => d ? new Date(d + 'T12:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const stars = n => [1, 2, 3, 4, 5].map(i => `<i data-lucide="star" class="w-3 h-3 ${i <= n ? 'fill-amber-400 text-amber-400' : 'text-bizborder'}"></i>`).join('');
const chip = (on, attrs, label) => `<button ${attrs} class="px-3.5 py-1.5 rounded-full text-xs font-semibold ${on ? 'bg-bizdark text-white' : 'bg-white border border-bizborder text-bizmuted hover:text-bizdark'} transition-all flex items-center gap-1">${label}</button>`;
const metric = (l, v, cls = 'text-bizdark') => `
  <div class="bg-bizbg p-3.5 rounded-2xl">
    <span class="text-[11px] font-bold text-bizmuted uppercase tracking-wider block">${l}</span>
    <b class="text-base font-extrabold ${cls} mt-1 block">${v}</b>
  </div>`;
const avatar = (o, cls = 'w-10 h-10 text-sm rounded-full') => `
  <div class="${cls} bg-bizdark/5 text-bizdark border border-bizborder flex items-center justify-center font-bold shrink-0">
    ${o.f ? `<img src="${o.f}" class="w-full h-full rounded-[inherit] object-cover">` : ini(o.n)}
  </div>`;
const secTitle = (t, extra = '') => `<div class="flex items-center justify-between gap-2"><span class="text-xs font-bold text-bizdark uppercase tracking-wider">${t}</span>${extra}</div>`;
const BTN = 'bg-white border border-bizborder hover:bg-bizbg text-bizdark px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all';
const BTN_DARK = 'bg-bizdark hover:bg-neutral-800 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all';
const BTN_MINI = 'px-3 py-1.5 rounded-full border border-bizborder bg-white text-[11px] font-bold text-bizdark hover:bg-bizbg flex items-center gap-1 transition-all';
const ICON_BTN = 'p-2 rounded-xl border border-bizborder text-bizmuted hover:text-bizdark hover:bg-bizbg transition-all';
const INP = 'w-full bg-bizbg border border-bizborder rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-bizdark focus:outline-none focus:ring-2 focus:ring-bizdark';
const SEL_ON = 'border-bizdark ring-1 ring-bizdark shadow-md';

function toast(msg, tone = 'dark') {
  const box = $('#toast-container');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl text-white transition-opacity duration-300 ${tone === 'rose' ? 'bg-rose-600' : 'bg-bizdark'}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2600);
}

// Estado de un documento según su vencimiento
function docSt(v) {
  if (!v) return ['Sin vencimiento', 'slate'];
  const n = dias(v);
  if (n < 0) return [`Vencido hace ${-n} d`, 'rose'];
  if (n <= 30) return [`Vence en ${n} d`, 'amber'];
  return ['Vigente', 'emerald'];
}

// Formulario genérico dentro de un <dialog> (dlg-X / X-body)
function formDlg(dlg, title, sub, fields, act, id = '') {
  const body = $(`#${dlg}-body`);
  if (!body) return;
  body.innerHTML = `
    <form id="frm-${dlg}" class="space-y-5" onsubmit="return false">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">${title}</h3>
          <p class="text-xs text-bizmuted font-medium">${sub}</p>
        </div>
        <button type="button" onclick="$('#dlg-${dlg}').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        ${fields.map(f => `
          <label class="block ${f.full ? 'sm:col-span-2' : ''}">
            <span class="block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1">${f.l}</span>
            ${f.opts ? `<select name="${f.k}" class="${INP}">${f.opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(f.v ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
              : f.type === 'textarea' ? `<textarea name="${f.k}" rows="3" class="${INP} resize-none">${esc(f.v)}</textarea>`
              : `<input name="${f.k}" type="${f.type || 'text'}" value="${esc(f.v)}" placeholder="${esc(f.ph || '')}" class="${INP}">`}
          </label>
        `).join('')}
      </div>
      <div class="flex items-center justify-between pt-3 border-t border-bizborder">
        <button type="button" onclick="$('#dlg-${dlg}').close()" class="px-4 py-2 rounded-full border border-bizborder text-xs font-semibold text-bizmuted hover:text-bizdark transition-all">Cancelar</button>
        <button type="button" data-a="${act}" data-id="${id}" class="px-5 py-2 rounded-full bg-bizdark text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all">Guardar</button>
      </div>
    </form>
  `;
  lucide.createIcons();
  $(`#dlg-${dlg}`).showModal();
  const first = body.querySelector('input, select, textarea');
  if (first) first.focus();
}

const readForm = dlg => {
  const o = Object.fromEntries(new FormData($(`#frm-${dlg}`)));
  Object.keys(o).forEach(k => { o[k] = String(o[k]).trim(); });
  return o;
};

// Bloque reutilizable: generador de mensaje de WhatsApp
const waBlock = (tpls, tpl, fTpl, fTxt, linkId, href, txt) => `
  <div class="space-y-3 pt-4 border-t border-bizborder">
    ${secTitle('Enviar Mensaje de WhatsApp', `
      <select data-f="${fTpl}" class="text-xs bg-white border border-bizborder rounded-xl px-3 py-1 font-semibold text-bizdark">
        ${Object.entries(tpls).map(([k, v]) => `<option value="${k}" ${k === tpl ? 'selected' : ''}>${v[0]}</option>`).join('')}
      </select>`)}
    <textarea data-f="${fTxt}" rows="3" class="w-full bg-bizbg border border-bizborder rounded-2xl p-3 text-xs font-medium text-bizdark focus:outline-none focus:ring-2 focus:ring-bizdark resize-none">${esc(txt)}</textarea>
    <div class="flex justify-end">
      <a id="${linkId}" target="_blank" rel="noopener" href="${href}" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
        <i data-lucide="send" class="w-3.5 h-3.5"></i>
        <span>Enviar por WhatsApp</span>
      </a>
    </div>
  </div>`;

// ================= VISTA: CONTRATISTAS =================
const CT = {
  disp: ['Consultar disponibilidad', 'Hola {n}, le escribe {e}. ¿Tiene disponibilidad esta semana para un trabajo de {o}?'],
  ava: ['Pedir avance de obra', 'Hola {n}, le escribe {e}. ¿Nos puede enviar fotos y el avance del proyecto "{p}"? Gracias.'],
  pago: ['Aviso de pago', 'Hola {n}, le escribe {e}. Le informamos que realizamos el pago de {m} correspondiente al proyecto "{p}".'],
  doc: ['Solicitar documento', 'Hola {n}, le escribe {e}. Necesitamos que nos envíe actualizado su documento de {d}. Gracias.'],
  lib: ['Mensaje libre', 'Hola {n}, ']
};
const KE = { curso: ['En curso', 'violet'], pausa: ['En pausa', 'amber'], fin: ['Terminado', 'emerald'] };
const RES = { bien: ['Bien', 'emerald'], reg: ['Regular', 'amber'], mal: ['Mal', 'rose'] };
const HIT = {
  '30-40-30': [['Anticipo', 30], ['Avance 1', 40], ['Pago final', 30]],
  '50-50': [['Anticipo', 50], ['Pago final', 50]],
  '40-30-30': [['Anticipo', 40], ['Avance 1', 30], ['Pago final', 30]],
  '25x4': [['Anticipo', 25], ['Avance 1', 25], ['Avance 2', 25], ['Pago final', 25]],
  '100': [['Pago único', 100]]
};
const DOCT = ['Cédula', 'RNC', 'Seguro', 'Contrato', 'Certificación', 'Licencia', 'Otro'];

const kPct = k => k.et.filter(e => e.pg).reduce((s, e) => s + (+e.p || 0), 0);
const kAmt = (k, p) => Math.round((+k.m || 0) * p / 100);
const conTotal = c => (c.k || []).reduce((s, k) => s + (+k.m || 0), 0);
const conPagado = c => (c.k || []).reduce((s, k) => s + kAmt(k, kPct(k)), 0);
const conAlertas = c => (c.docs || []).filter(d => d.v && dias(d.v) <= 30);

function conMsg(c) {
  if (CS.edited != null) return CS.edited;
  const k = (c.k || []).find(x => x.est !== 'fin') || (c.k || [])[0];
  const last = k ? [...k.et].reverse().find(e => e.pg) : null;
  const doc = conAlertas(c)[0];
  return CT[CS.tpl][1]
    .replace('{n}', c.n.split(' ')[0]).replace('{e}', CE.emp).replace('{o}', (c.o || '').toLowerCase())
    .replace('{p}', k ? k.pr : 'en curso').replace('{m}', k && last ? $m(kAmt(k, last.p)) : '$ 0')
    .replace('{d}', doc ? doc.t.toLowerCase() : 'seguro');
}

function renderContratistas() {
  const container = $('#con-content');
  if (!container) return;

  const q = CS.q.toLowerCase();
  const oficios = [...new Set(CON.map(c => c.o).filter(Boolean))];
  const list = CON.filter(c => {
    const matchQ = [c.n, c.o, c.e, c.z, c.nota, ...(c.k || []).map(k => k.pr)].join(' ').toLowerCase().includes(q);
    return matchQ && (CS.esp === 'todos' || c.o === CS.esp) && (!CS.fav || c.fav);
  });
  const sel = list.find(c => c.id === CS.sel) || list[0];

  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 pb-2">
      <div class="flex items-center gap-2 flex-wrap">
        ${chip(CS.esp === 'todos' && !CS.fav, 'data-a="cchip" data-m="todos"', 'Todos')}
        ${chip(CS.fav, 'data-a="cfavf"', `<i data-lucide="heart" class="w-3.5 h-3.5 ${CS.fav ? 'fill-white' : ''}"></i><span>Favoritos</span>`)}
        ${oficios.map(o => chip(CS.esp === o, `data-a="cchip" data-m="${esc(o)}"`, esc(o))).join('')}
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
        ${list.map(c => {
          const al = conAlertas(c);
          const vencidos = al.some(d => dias(d.v) < 0);
          return `
            <div data-a="csel" data-id="${c.id}" class="biz-card p-4 cursor-pointer transition-all ${sel && sel.id === c.id ? SEL_ON : 'hover:border-bizmuted'}">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  ${avatar(c)}
                  <div class="min-w-0">
                    <h4 class="text-sm font-bold text-bizdark leading-tight truncate">${esc(c.n)}</h4>
                    <p class="text-xs text-bizmuted font-medium truncate">${esc(c.o)}${c.z ? ' · ' + esc(c.z) : ''}</p>
                    <div class="flex items-center gap-0.5 mt-1">${stars(c.cal)}</div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <span class="biz-pill pill-${ES[c.est][1]}">${ES[c.est][0]}</span>
                  ${al.length ? `<p class="text-[11px] font-bold ${vencidos ? 'text-rose-600' : 'text-amber-600'} mt-1 flex items-center justify-end gap-1"><i data-lucide="file-warning" class="w-3 h-3"></i>${al.length} doc. ${vencidos ? 'vencido' : 'por vencer'}</p>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
        ${list.length === 0 ? '<div class="biz-card p-8 text-center text-xs text-bizmuted font-semibold">No hay contratistas con este filtro.</div>' : ''}
      </div>

      <div class="lg:col-span-7">
        ${sel ? renderConDetail(sel) : '<div class="biz-card p-12 text-center text-bizmuted">Selecciona un contratista para ver detalles.</div>'}
      </div>
    </div>
  `;

  lucide.createIcons();
}

function renderConDetail(c) {
  const tot = conTotal(c), pag = conPagado(c);
  const activos = (c.k || []).filter(k => k.est !== 'fin').length;
  const txt = conMsg(c);

  return `
    <div class="biz-card p-6 space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-bizborder">
        <div class="flex items-center gap-4">
          ${avatar(c, 'w-14 h-14 text-lg rounded-2xl')}
          <div>
            <h3 class="text-xl font-bold text-bizdark leading-tight">${esc(c.n)}</h3>
            <p class="text-xs text-bizmuted font-medium mt-0.5">${esc(c.o)}${c.e ? ' · <span class="font-bold text-bizdark">' + esc(c.e) + '</span>' : ''}</p>
            <div class="flex items-center gap-0.5 mt-1">${stars(c.cal)}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button data-a="cfav" data-id="${c.id}" class="${ICON_BTN} hover:text-rose-500 hover:bg-rose-50" title="Favorito">
            <i data-lucide="heart" class="w-4 h-4 ${c.fav ? 'fill-rose-500 text-rose-500' : ''}"></i>
          </button>
          <button data-a="cedit" data-id="${c.id}" class="${ICON_BTN}" title="Editar">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <a href="tel:+${wa(c.t)}" class="px-3 py-2 rounded-xl bg-bizdark text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:bg-neutral-800">
            <i data-lucide="phone" class="w-3.5 h-3.5"></i>
            <span>Llamar</span>
          </a>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${metric('Proyectos activos', activos)}
        ${metric('Contratado', $m(tot))}
        ${metric('Pagado', $m(pag), 'text-emerald-700')}
        ${metric('Por pagar', $m(tot - pag), tot - pag ? 'text-amber-600' : 'text-bizdark')}
      </div>

      <div class="bg-bizbg p-4 rounded-2xl space-y-2.5 text-xs">
        <div class="flex flex-wrap gap-x-5 gap-y-2 text-bizdark font-semibold">
          <span class="flex items-center gap-1.5"><i data-lucide="banknote" class="w-4 h-4 text-bizmuted"></i>${esc(c.tar || 'Tarifa no definida')}</span>
          <span class="flex items-center gap-1.5"><i data-lucide="map-pin" class="w-4 h-4 text-bizmuted"></i>${esc(c.z || 'Sin zona')}</span>
          <span class="flex items-center gap-1.5"><i data-lucide="phone" class="w-4 h-4 text-bizmuted"></i>${esc(c.t || '—')}</span>
        </div>
        ${c.nota ? `<div class="flex items-start gap-2 text-bizmuted font-medium"><i data-lucide="info" class="w-4 h-4 shrink-0 mt-0.5"></i><span>${esc(c.nota)}</span></div>` : ''}
        <div class="flex items-center gap-1.5 flex-wrap pt-1">
          <span class="text-[11px] font-bold text-bizmuted uppercase tracking-wider mr-1">Estado</span>
          ${Object.entries(ES).map(([k, [l, t]]) => `<button data-a="cest" data-id="${c.id}" data-m="${k}" class="biz-pill ${c.est === k ? 'pill-' + t + ' ring-1 ring-current' : 'bg-white border border-bizborder text-bizmuted'}">${l}</button>`).join('')}
        </div>
      </div>

      <!-- Proyectos con pagos por hitos -->
      <div class="space-y-3">
        ${secTitle(`Proyectos (${(c.k || []).length})`, `<button data-a="knew" data-id="${c.id}" class="${BTN_MINI}"><i data-lucide="plus" class="w-3 h-3"></i>Nuevo proyecto</button>`)}
        ${(c.k || []).map(k => {
          const p = kPct(k), n = dias(k.f);
          return `
            <div class="p-4 rounded-2xl border border-bizborder space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-bizdark">${esc(k.pr)}</p>
                  <p class="text-[11px] text-bizmuted mt-0.5">${fdate(k.i)} → ${fdate(k.f)} · ${k.est === 'fin' ? 'Cerrado' : n < 0 ? `<span class="text-rose-600 font-bold">Atrasado ${-n} d</span>` : `Faltan ${n} d`}</p>
                </div>
                <div class="text-right shrink-0">
                  <button data-a="kest" data-id="${c.id}" data-k="${k.id}" class="biz-pill pill-${KE[k.est][1]}" title="Cambiar estado">${KE[k.est][0]}</button>
                  <p class="text-xs font-extrabold text-bizdark mt-1">${$m(k.m)}</p>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-[11px] font-bold text-bizmuted mb-1">
                  <span>Avance de pagos</span>
                  <span>${p}% · ${$m(kAmt(k, p))}</span>
                </div>
                <div class="w-full h-1.5 bg-bizborder rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 rounded-full transition-all duration-300" style="width: ${p}%"></div>
                </div>
              </div>
              <div class="space-y-1.5">
                ${k.et.map((e, i) => `
                  <div class="flex items-center justify-between gap-2 p-2 rounded-xl bg-bizbg text-xs">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${e.pg ? 'bg-emerald-500 text-white' : 'bg-bizborder text-bizmuted'}">${e.pg ? '<i data-lucide="check" class="w-3 h-3"></i>' : i + 1}</span>
                      <span class="font-semibold text-bizdark truncate">${esc(e.n)} <span class="text-bizmuted font-medium">· ${e.p}%</span></span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="font-bold text-bizdark">${$m(kAmt(k, e.p))}</span>
                      ${e.pg
                        ? `<span class="text-[11px] font-bold text-emerald-700">Pagado ${fdate(e.pg)}</span><button data-a="khit" data-id="${c.id}" data-k="${k.id}" data-s="${i}" class="p-1 text-bizmuted hover:text-bizdark" title="Deshacer pago"><i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i></button>`
                        : `<button data-a="khit" data-id="${c.id}" data-k="${k.id}" data-s="${i}" class="px-2.5 py-1 rounded-full bg-bizdark text-white text-[11px] font-bold hover:bg-neutral-800">Marcar pagado</button>`}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
        ${!(c.k || []).length ? '<p class="text-xs text-bizmuted">Sin proyectos registrados.</p>' : ''}
      </div>

      <!-- Control documental -->
      <div class="space-y-3 pt-4 border-t border-bizborder">
        ${secTitle(`Documentos (${(c.docs || []).length})`, `<button data-a="dnew" data-id="${c.id}" class="${BTN_MINI}"><i data-lucide="plus" class="w-3 h-3"></i>Agregar</button>`)}
        ${(c.docs || []).map(d => {
          const [l, t] = docSt(d.v);
          return `
            <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-bizbg text-xs flex-wrap">
              <div class="flex items-center gap-2.5 min-w-0">
                <i data-lucide="file-text" class="w-4 h-4 text-bizmuted shrink-0"></i>
                <div class="min-w-0">
                  <p class="font-bold text-bizdark">${esc(d.t)}</p>
                  <p class="text-[11px] text-bizmuted truncate">${esc(d.d || 'Sin descripción')}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="biz-pill pill-${t}">${l}</span>
                <input type="date" value="${d.v || ''}" data-f="cdoc" data-id="${c.id}" data-k="${d.id}" class="bg-white border border-bizborder rounded-xl px-2 py-1 text-[11px] font-semibold text-bizdark" title="Fecha de vencimiento">
                <button data-a="cdocdel" data-id="${c.id}" data-k="${d.id}" class="p-1 text-bizmuted hover:text-rose-600" title="Quitar documento">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
        ${!(c.docs || []).length ? '<p class="text-xs text-bizmuted">Sin documentos cargados.</p>' : ''}
      </div>

      <!-- Historial de trabajos -->
      <div class="space-y-3 pt-4 border-t border-bizborder">
        ${secTitle(`Historial de trabajos (${(c.h || []).length})`, `<button data-a="jnew" data-id="${c.id}" class="${BTN_MINI}"><i data-lucide="plus" class="w-3 h-3"></i>Registrar</button>`)}
        ${(c.h || []).map(h => `
          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-bizbg text-xs">
            <div class="min-w-0">
              <p class="font-bold text-bizdark truncate">${esc(h.j)}</p>
              <p class="text-[11px] text-bizmuted">${fdate(h.d)} · ${$m(h.c)}</p>
            </div>
            <span class="biz-pill pill-${(RES[h.r] || RES.bien)[1]}">${(RES[h.r] || RES.bien)[0]}</span>
          </div>
        `).join('')}
        ${!(c.h || []).length ? '<p class="text-xs text-bizmuted">Sin trabajos registrados.</p>' : ''}
      </div>

      ${waBlock(CT, CS.tpl, 'ctpl', 'ctxt', 'btn-con-wa', wlink(c, txt), txt)}
    </div>
  `;
}

function conForm(c) {
  formDlg('con', c ? 'Editar contratista' : 'Nuevo contratista', c ? esc(c.n) : 'Registra un técnico o empresa externa', [
    { k: 'n', l: 'Nombre', v: c?.n },
    { k: 'o', l: 'Oficio / especialidad', v: c?.o, ph: 'Electricista, plomero...' },
    { k: 'e', l: 'Empresa', v: c?.e },
    { k: 't', l: 'Teléfono / WhatsApp', v: c?.t, type: 'tel' },
    { k: 'z', l: 'Zona', v: c?.z },
    { k: 'tar', l: 'Tarifa', v: c?.tar, ph: '1,500 por visita' },
    { k: 'cal', l: 'Calificación', v: c?.cal ?? 4, opts: [5, 4, 3, 2, 1].map(n => [n, '★'.repeat(n)]) },
    { k: 'est', l: 'Estado', v: c?.est ?? 'disp', opts: Object.entries(ES).map(([k, v]) => [k, v[0]]) },
    { k: 'nota', l: 'Notas', v: c?.nota, type: 'textarea', full: 1 }
  ], 'csave', c ? c.id : '');
}

// ================= VISTA: PROVEEDORES =================
const PT = {
  cot: ['Solicitar cotización', 'Hola {n}, le escribe {e}. ¿Nos puede enviar una cotización de {p}? Gracias.'],
  ped: ['Hacer pedido', 'Hola {n}, le escribe {e}. Queremos hacer el siguiente pedido: '],
  pago: ['Aviso de pago', 'Hola {n}, le escribe {e}. Le informamos que realizamos un pago a su cuenta. Favor confirmar recepción. Balance pendiente según nuestros registros: {m}.'],
  edo: ['Pedir estado de cuenta', 'Hola {n}, le escribe {e}. ¿Nos puede enviar el estado de cuenta actualizado? Según nuestros registros el balance es {m}.'],
  lib: ['Mensaje libre', 'Hola {n}, ']
};

function provMsg(v) {
  if (VS.edited != null) return VS.edited;
  return PT[VS.tpl][1].replace('{n}', (v.ct || v.n).split(' ')[0]).replace('{e}', CE.emp)
    .replace('{p}', v.p || 'sus productos').replace('{m}', $m(saldo(v)));
}

// Estado de una factura por pagar
function factSt(v, h) {
  if (h.pg) return ['Pagada', 'emerald'];
  const n = dias(vence(v, h));
  if (n < 0) return [`Vencida hace ${-n} d`, 'rose'];
  if (n <= 7) return [n === 0 ? 'Vence hoy' : `Vence en ${n} d`, 'amber'];
  return [`Vence en ${n} d`, 'sky'];
}

function renderProveedores() {
  const container = $('#prov-content');
  if (!container) return;

  const q = VS.q.toLowerCase();
  const cats = [...new Set(PROV.map(v => v.c).filter(Boolean))];
  const list = PROV.filter(v => {
    const matchQ = [v.n, v.c, v.p, v.ct, v.z, v.tr].join(' ').toLowerCase().includes(q);
    return matchQ && (VS.cat === 'todas' || v.c === VS.cat) && (!VS.fav || v.fav) && (!VS.deuda || saldo(v) > 0);
  });
  const sel = list.find(v => v.id === VS.sel) || list[0];

  const porPagar = PROV.reduce((s, v) => s + saldo(v), 0);
  const vencidoT = PROV.reduce((s, v) => s + vencido(v), 0);
  const semana = PROV.reduce((s, v) => s + (v.h || []).filter(h => !h.pg && dias(vence(v, h)) >= 0 && dias(vence(v, h)) <= 7).reduce((a, h) => a + (+h.m || 0), 0), 0);

  container.innerHTML = `
    <div class="biz-card p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
      ${metric('Total por pagar', $m(porPagar))}
      ${metric('Vencido', $m(vencidoT), vencidoT ? 'text-rose-600' : 'text-bizdark')}
      ${metric('Vence en 7 días', $m(semana), semana ? 'text-amber-600' : 'text-bizdark')}
      ${metric('Proveedores activos', PROV.filter(v => v.est === 'act').length + ' de ' + PROV.length)}
    </div>

    <div class="flex flex-wrap items-center justify-between gap-4 pb-2">
      <div class="flex items-center gap-2 flex-wrap">
        ${chip(VS.cat === 'todas' && !VS.fav && !VS.deuda, 'data-a="vchip" data-m="todas"', 'Todos')}
        ${chip(VS.fav, 'data-a="vfavf"', `<i data-lucide="heart" class="w-3.5 h-3.5 ${VS.fav ? 'fill-white' : ''}"></i><span>Favoritos</span>`)}
        ${chip(VS.deuda, 'data-a="vdeuf"', 'Con deuda')}
        ${cats.map(c => chip(VS.cat === c, `data-a="vchip" data-m="${esc(c)}"`, esc(c))).join('')}
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
        ${list.map(v => {
          const s = saldo(v), x = vencido(v);
          return `
            <div data-a="vsel" data-id="${v.id}" class="biz-card p-4 cursor-pointer transition-all ${sel && sel.id === v.id ? SEL_ON : 'hover:border-bizmuted'}">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  ${avatar(v)}
                  <div class="min-w-0">
                    <h4 class="text-sm font-bold text-bizdark leading-tight truncate">${esc(v.n)}</h4>
                    <p class="text-xs text-bizmuted font-medium truncate">${esc(v.c)}${v.z ? ' · ' + esc(v.z) : ''}</p>
                    <div class="flex items-center gap-0.5 mt-1">${stars(v.cal)}</div>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <span class="biz-pill pill-${VE[v.est][1]}">${VE[v.est][0]}</span>
                  ${x ? `<p class="text-[11px] font-bold text-rose-600 mt-1">Vencido ${$m(x)}</p>` : s ? `<p class="text-[11px] font-bold text-amber-600 mt-1">Debemos ${$m(s)}</p>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
        ${list.length === 0 ? '<div class="biz-card p-8 text-center text-xs text-bizmuted font-semibold">No hay proveedores con este filtro.</div>' : ''}
      </div>

      <div class="lg:col-span-7">
        ${sel ? renderProvDetail(sel) : '<div class="biz-card p-12 text-center text-bizmuted">Selecciona un proveedor para ver detalles.</div>'}
      </div>
    </div>
  `;

  lucide.createIcons();
}

function renderProvDetail(v) {
  const s = saldo(v), x = vencido(v);
  const disp = (+v.lim || 0) - s;
  const txt = provMsg(v);
  const fact = (v.h || []).map((h, i) => ({ h, i }))
    .sort((a, b) => (a.h.pg - b.h.pg) || vence(v, a.h).localeCompare(vence(v, b.h)));

  return `
    <div class="biz-card p-6 space-y-6">
      <div class="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-bizborder">
        <div class="flex items-center gap-4">
          ${avatar(v, 'w-14 h-14 text-lg rounded-2xl')}
          <div>
            <h3 class="text-xl font-bold text-bizdark leading-tight">${esc(v.n)}</h3>
            <p class="text-xs text-bizmuted font-medium mt-0.5">${esc(v.c)} · Contacto: <span class="font-bold text-bizdark">${esc(v.ct || 'No asignado')}</span></p>
            <div class="flex items-center gap-0.5 mt-1">${stars(v.cal)}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button data-a="vfav" data-id="${v.id}" class="${ICON_BTN} hover:text-rose-500 hover:bg-rose-50" title="Favorito">
            <i data-lucide="heart" class="w-4 h-4 ${v.fav ? 'fill-rose-500 text-rose-500' : ''}"></i>
          </button>
          <button data-a="vedit" data-id="${v.id}" class="${ICON_BTN}" title="Editar">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <a href="tel:+${wa(v.t)}" class="px-3 py-2 rounded-xl bg-bizdark text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:bg-neutral-800">
            <i data-lucide="phone" class="w-3.5 h-3.5"></i>
            <span>Llamar</span>
          </a>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${metric('Por pagar', $m(s), s ? 'text-amber-600' : 'text-bizdark')}
        ${metric('Vencido', $m(x), x ? 'text-rose-600' : 'text-bizdark')}
        ${metric('Término de pago', PG[v.pago] || v.pago + ' días')}
        ${metric('Crédito disponible', v.lim ? $m(disp) : 'Sin crédito', disp < 0 ? 'text-rose-600' : 'text-bizdark')}
      </div>

      <!-- Tratos comerciales -->
      <div class="space-y-3">
        ${secTitle('Tratos Comerciales')}
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div class="p-3 rounded-2xl border border-bizborder"><span class="text-[11px] text-bizmuted font-semibold block">Descuento</span><b class="text-bizdark">${+v.desc || 0}%</b></div>
          <div class="p-3 rounded-2xl border border-bizborder"><span class="text-[11px] text-bizmuted font-semibold block">Entrega</span><b class="text-bizdark">${+v.ent ? v.ent + (v.ent == 1 ? ' día' : ' días') : 'Inmediata'}</b></div>
          <div class="p-3 rounded-2xl border border-bizborder"><span class="text-[11px] text-bizmuted font-semibold block">Pedido mínimo</span><b class="text-bizdark">${v.min ? '$ ' + esc(v.min) : 'Sin mínimo'}</b></div>
          <div class="p-3 rounded-2xl border border-bizborder"><span class="text-[11px] text-bizmuted font-semibold block">Límite de crédito</span><b class="text-bizdark">${v.lim ? $m(v.lim) : '—'}</b></div>
        </div>
        <div class="bg-bizbg p-4 rounded-2xl space-y-2 text-xs">
          ${v.tr ? `<div class="flex items-start gap-2 text-bizdark font-semibold"><i data-lucide="handshake" class="w-4 h-4 text-bizmuted shrink-0 mt-0.5"></i><span>${esc(v.tr)}</span></div>` : ''}
          ${v.p ? `<div class="flex items-start gap-2 text-bizmuted font-medium"><i data-lucide="package" class="w-4 h-4 shrink-0 mt-0.5"></i><span>Productos: ${esc(v.p)}</span></div>` : ''}
          <div class="flex items-start gap-2 text-bizmuted font-medium"><i data-lucide="map-pin" class="w-4 h-4 shrink-0 mt-0.5"></i><span>${esc(v.dir || 'Sin dirección')}${v.z ? ' · ' + esc(v.z) : ''}${v.ref ? ' (' + esc(v.ref) + ')' : ''}</span></div>
          ${v.hor ? `<div class="flex items-start gap-2 text-bizmuted font-medium"><i data-lucide="clock" class="w-4 h-4 shrink-0 mt-0.5"></i><span>${esc(v.hor)}</span></div>` : ''}
          ${v.em ? `<div class="flex items-start gap-2 text-bizmuted font-medium"><i data-lucide="mail" class="w-4 h-4 shrink-0 mt-0.5"></i><span>${esc(v.em)}</span></div>` : ''}
          <div class="flex items-center gap-1.5 flex-wrap pt-1">
            <span class="text-[11px] font-bold text-bizmuted uppercase tracking-wider mr-1">Estado</span>
            ${Object.entries(VE).map(([k, [l, t]]) => `<button data-a="vest" data-id="${v.id}" data-m="${k}" class="biz-pill ${v.est === k ? 'pill-' + t + ' ring-1 ring-current' : 'bg-white border border-bizborder text-bizmuted'}">${l}</button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Cuentas por pagar y vencimientos -->
      <div class="space-y-3 pt-4 border-t border-bizborder">
        ${secTitle(`Cuentas por Pagar (${(v.h || []).filter(h => !h.pg).length} abiertas)`, `<button data-a="fnew" data-id="${v.id}" class="${BTN_MINI}"><i data-lucide="plus" class="w-3 h-3"></i>Registrar factura</button>`)}
        ${fact.map(({ h, i }) => {
          const [l, t] = factSt(v, h);
          return `
            <div class="flex items-center justify-between gap-3 p-3 rounded-2xl ${h.pg ? 'border border-bizborder' : 'bg-bizbg'} text-xs flex-wrap">
              <div class="min-w-0">
                <p class="font-bold ${h.pg ? 'text-bizmuted line-through' : 'text-bizdark'} truncate">${esc(h.c)}</p>
                <p class="text-[11px] text-bizmuted">Factura ${fdate(h.d)} · Vence ${fdate(vence(v, h))}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="biz-pill pill-${t}">${l}</span>
                <b class="text-bizdark">${$m(h.m)}</b>
                <button data-a="vpag" data-id="${v.id}" data-s="${i}" class="${h.pg ? 'p-1 text-bizmuted hover:text-bizdark' : 'px-2.5 py-1 rounded-full bg-bizdark text-white text-[11px] font-bold hover:bg-neutral-800'}" title="${h.pg ? 'Marcar como pendiente' : ''}">
                  ${h.pg ? '<i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>' : 'Marcar pagada'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
        ${!fact.length ? '<p class="text-xs text-bizmuted">Sin facturas registradas.</p>' : ''}
      </div>

      ${waBlock(PT, VS.tpl, 'vtpl', 'vtxt', 'btn-prov-wa', wlink(v, txt), txt)}
    </div>
  `;
}

function provForm(v) {
  formDlg('prov', v ? 'Editar proveedor' : 'Nuevo proveedor', v ? esc(v.n) : 'Registra un suplidor y sus condiciones', [
    { k: 'n', l: 'Nombre comercial', v: v?.n },
    { k: 'c', l: 'Categoría', v: v?.c, ph: 'Materiales eléctricos...' },
    { k: 'ct', l: 'Persona de contacto', v: v?.ct },
    { k: 't', l: 'Teléfono / WhatsApp', v: v?.t, type: 'tel' },
    { k: 'p', l: 'Productos que vende', v: v?.p, full: 1 },
    { k: 'em', l: 'Correo', v: v?.em, type: 'email' },
    { k: 'hor', l: 'Horario', v: v?.hor },
    { k: 'dir', l: 'Dirección', v: v?.dir },
    { k: 'z', l: 'Zona', v: v?.z },
    { k: 'pago', l: 'Término de pago', v: v?.pago ?? 30, opts: Object.entries(PG) },
    { k: 'lim', l: 'Límite de crédito', v: v?.lim ?? 0, type: 'number' },
    { k: 'desc', l: 'Descuento (%)', v: v?.desc ?? 0, type: 'number' },
    { k: 'ent', l: 'Días de entrega', v: v?.ent ?? 1, type: 'number' },
    { k: 'min', l: 'Pedido mínimo', v: v?.min },
    { k: 'cal', l: 'Calificación', v: v?.cal ?? 4, opts: [5, 4, 3, 2, 1].map(n => [n, '★'.repeat(n)]) },
    { k: 'est', l: 'Estado', v: v?.est ?? 'act', opts: Object.entries(VE).map(([k, x]) => [k, x[0]]) },
    { k: 'tr', l: 'Acuerdos / condiciones especiales', v: v?.tr, type: 'textarea', full: 1 }
  ], 'vsave', v ? v.id : '');
}

// ================= VISTA: EQUIPOS & ASIGNACIONES =================
const AE = { ok: ['Disponible', 'emerald'], rep: ['En reparación', 'amber'] };
const MT = {
  pres: ['Préstamo', 'arrow-up-right', 'text-violet-600'],
  dev: ['Devolución', 'arrow-down-left', 'text-emerald-600'],
  rep: ['A reparación', 'wrench', 'text-amber-600'],
  ok: ['Reparado', 'check', 'text-emerald-600'],
  alta: ['Alta en inventario', 'plus', 'text-sky-600']
};
const AI = [['smartphone', 'Celular'], ['wrench', 'Herramienta'], ['zap', 'Eléctrico / medición'], ['hammer', 'Herramienta manual'], ['hard-hat', 'Protección'], ['laptop', 'Computadora'], ['key', 'Llave / acceso'], ['package', 'Otro']];
const ACAT = ['Comunicación', 'Herramientas', 'Protección', 'Vehículo', 'Oficina', 'Otro'];
const perN = id => (PER.find(p => p.id === id) || {}).n || '—';
const artSt = a => a.est === 'rep' ? AE.rep : a.asig ? ['Asignado', 'violet'] : AE.ok;
const artDesde = a => (LOG.find(l => l.a === a.id && l.t === 'pres' && l.p === a.asig) || {}).d;

function logMov(a, p, t) {
  LOG.unshift({ id: uid(), d: hoy(), h: new Date().toTimeString().slice(0, 5), a: a.id, n: a.n, p, t });
}

// Préstamos iniciales para que el historial no arranque vacío
ART.filter(a => a.asig).forEach((a, i) => LOG.push({ id: uid(), d: dAgo(12 + i * 9), h: '08:00', a: a.id, n: a.n, p: a.asig, t: 'pres' }));

function renderEquipos() {
  const container = $('#eq-content');
  if (!container) return;

  const asig = ART.filter(a => a.asig).length;
  const rep = ART.filter(a => a.est === 'rep').length;
  const seg = (m, icon, label) => `
    <button data-a="esub" data-m="${m}" class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${EQ.sub === m ? 'bg-bizdark text-white' : 'text-bizmuted hover:text-bizdark'}">
      <i data-lucide="${icon}" class="w-3.5 h-3.5"></i><span>${label}</span>
    </button>`;

  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4 pb-2">
      <div class="bg-white border border-bizborder rounded-full p-1 flex items-center shadow-sm">
        ${seg('per', 'users', 'Por persona')}
        ${seg('inv', 'boxes', 'Inventario')}
      </div>
    </div>

    <div class="biz-card p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
      ${metric('Artículos', ART.length)}
      ${metric('Asignados', asig, 'text-violet-700')}
      ${metric('Disponibles', ART.length - asig - rep, 'text-emerald-700')}
      ${metric('En reparación', rep, rep ? 'text-amber-600' : 'text-bizdark')}
    </div>

    ${EQ.sub === 'per' ? eqPersona() : eqInventario()}
  `;

  lucide.createIcons();
}

function eqPersona() {
  const q = EQ.q.toLowerCase();
  const pl = PER.filter(p => (p.n + ' ' + p.r).toLowerCase().includes(q));
  const p = pl.find(x => x.id === EQ.sel) || pl[0];
  if (!p) return '<div class="biz-card p-8 text-center text-xs text-bizmuted font-semibold">No hay personal con esa búsqueda.</div>';

  const mine = ART.filter(a => a.asig === p.id);
  const libres = ART.filter(a => !a.asig && a.est !== 'rep');
  const hist = LOG.filter(l => l.p === p.id).slice(0, 8);
  const constancia = `Hola ${p.n.split(' ')[0]}, le escribe ${CE.emp}. Confirmamos que tiene asignados los siguientes artículos:\n${mine.map(a => `• ${a.n}${a.d ? ' (' + a.d + ')' : ''}`).join('\n')}\n\nFavor responder *OK* como constancia de recibido.`;

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-4 space-y-3">
        ${pl.map(x => {
          const n = ART.filter(a => a.asig === x.id).length;
          return `
            <div data-a="esel" data-id="${x.id}" class="biz-card p-4 cursor-pointer flex items-center justify-between gap-3 ${x.id === p.id ? SEL_ON : 'hover:border-bizmuted'}">
              <div class="flex items-center gap-3 min-w-0">
                ${avatar(x)}
                <div class="min-w-0">
                  <h4 class="text-sm font-bold text-bizdark truncate">${esc(x.n)}</h4>
                  <p class="text-xs text-bizmuted truncate">${esc(x.r)}</p>
                </div>
              </div>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${n ? 'bg-bizdark text-white' : 'bg-bizbg text-bizmuted'}" title="Artículos asignados">${n}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="lg:col-span-8 biz-card p-6 space-y-6">
        <div class="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-bizborder">
          <div class="flex items-center gap-4">
            ${avatar(p, 'w-14 h-14 text-lg rounded-2xl')}
            <div>
              <h3 class="text-xl font-bold text-bizdark leading-tight">${esc(p.n)}</h3>
              <p class="text-xs text-bizmuted font-medium mt-0.5">${esc(p.r)} · ${mine.length} artículo${mine.length === 1 ? '' : 's'} a su cargo</p>
            </div>
          </div>
          ${mine.length ? `
            <a target="_blank" rel="noopener" href="${wlink(p, constancia)}" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-sm transition-all">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>Enviar constancia</span>
            </a>` : ''}
        </div>

        <div class="space-y-2">
          ${secTitle('Prestar artículo')}
          <select data-f="epres" class="${INP}" ${libres.length ? '' : 'disabled'}>
            <option value="">${libres.length ? 'Selecciona un artículo disponible…' : 'No hay artículos disponibles'}</option>
            ${libres.map(a => `<option value="${a.id}">${esc(a.n)} · ${esc(a.c)}</option>`).join('')}
          </select>
        </div>

        <div class="space-y-2">
          ${secTitle(`Artículos asignados (${mine.length})`)}
          ${mine.map(a => `
            <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-bizbg text-xs">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-white border border-bizborder flex items-center justify-center shrink-0"><i data-lucide="${a.i || 'package'}" class="w-4 h-4 text-bizdark"></i></div>
                <div class="min-w-0">
                  <p class="font-bold text-bizdark truncate">${esc(a.n)}</p>
                  <p class="text-[11px] text-bizmuted truncate">${esc(a.d || a.c)}${artDesde(a) ? ' · desde ' + fdate(artDesde(a)) : ''}</p>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <button data-a="adev" data-id="${a.id}" class="${BTN_MINI}"><i data-lucide="arrow-down-left" class="w-3 h-3"></i>Devolver</button>
                <button data-a="adev" data-id="${a.id}" data-m="rep" class="${BTN_MINI} text-amber-700" title="Devuelto con daño: pasa a reparación"><i data-lucide="wrench" class="w-3 h-3"></i>Con daño</button>
              </div>
            </div>
          `).join('')}
          ${!mine.length ? '<p class="text-xs text-bizmuted">No tiene artículos asignados.</p>' : ''}
        </div>

        <div class="space-y-2 pt-4 border-t border-bizborder">
          ${secTitle('Historial de préstamos y devoluciones')}
          ${movRows(hist, false)}
        </div>
      </div>
    </div>
  `;
}

function movRows(list, showPer = true) {
  if (!list.length) return '<p class="text-xs text-bizmuted">Sin movimientos registrados.</p>';
  return `<div class="space-y-1.5">${list.map(l => {
    const [lab, icon, cls] = MT[l.t];
    return `
      <div class="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-bizborder text-xs">
        <div class="flex items-center gap-2.5 min-w-0">
          <i data-lucide="${icon}" class="w-3.5 h-3.5 ${cls} shrink-0"></i>
          <span class="truncate"><b class="text-bizdark">${lab}</b> <span class="text-bizmuted">· ${esc(l.n)}${showPer && l.p ? ' · ' + esc(perN(l.p)) : ''}</span></span>
        </div>
        <span class="text-[11px] text-bizmuted font-semibold shrink-0">${fdate(l.d)} ${l.h || ''}</span>
      </div>`;
  }).join('')}</div>`;
}

function eqInventario() {
  const q = EQ.q.toLowerCase();
  const cats = [...new Set(ART.map(a => a.c))];
  const list = ART.filter(a => (EQ.cat === 'todas' || a.c === EQ.cat) && [a.n, a.c, a.d, a.asig ? perN(a.asig) : ''].join(' ').toLowerCase().includes(q));

  return `
    <div class="flex items-center gap-2 flex-wrap">
      ${chip(EQ.cat === 'todas', 'data-a="ecat" data-m="todas"', 'Todas')}
      ${cats.map(c => chip(EQ.cat === c, `data-a="ecat" data-m="${esc(c)}"`, esc(c))).join('')}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      ${list.map(a => {
        const [l, t] = artSt(a);
        return `
          <div class="biz-card p-4 space-y-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-bizdark text-white flex items-center justify-center shrink-0"><i data-lucide="${a.i || 'package'}" class="w-5 h-5"></i></div>
                <div class="min-w-0">
                  <h4 class="text-sm font-bold text-bizdark leading-tight truncate">${esc(a.n)}</h4>
                  <p class="text-xs text-bizmuted truncate">${esc(a.c)}${a.d ? ' · ' + esc(a.d) : ''}</p>
                </div>
              </div>
              <span class="biz-pill pill-${t}">${l}</span>
            </div>
            ${a.asig ? `
              <div class="flex items-center gap-2 p-2 rounded-xl bg-bizbg text-xs">
                <i data-lucide="user" class="w-3.5 h-3.5 text-bizmuted"></i>
                <span class="font-semibold text-bizdark">${esc(perN(a.asig))}</span>
                ${artDesde(a) ? `<span class="text-[11px] text-bizmuted">· desde ${fdate(artDesde(a))}</span>` : ''}
              </div>` : ''}
            <div class="flex items-center gap-2 pt-2 border-t border-bizborder">
              ${a.asig
                ? `<button data-a="adev" data-id="${a.id}" class="${BTN_MINI}"><i data-lucide="arrow-down-left" class="w-3 h-3"></i>Devolver</button>`
                : a.est === 'rep'
                  ? `<button data-a="arep" data-id="${a.id}" class="${BTN_MINI}"><i data-lucide="check" class="w-3 h-3"></i>Marcar reparado</button>`
                  : `<select data-f="aasig" data-id="${a.id}" class="flex-1 min-w-0 bg-bizbg border border-bizborder rounded-full px-3 py-1.5 text-[11px] font-bold text-bizdark">
                       <option value="">Asignar a…</option>
                       ${PER.map(p => `<option value="${p.id}">${esc(p.n)}</option>`).join('')}
                     </select>
                     <button data-a="arep" data-id="${a.id}" class="p-1.5 text-bizmuted hover:text-amber-600" title="Enviar a reparación"><i data-lucide="wrench" class="w-3.5 h-3.5"></i></button>`}
              <button data-a="adel" data-id="${a.id}" class="p-1.5 text-bizmuted hover:text-rose-600 ml-auto" title="Eliminar del inventario"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </div>
          </div>
        `;
      }).join('')}
      ${!list.length ? '<div class="col-span-full biz-card p-8 text-center text-xs text-bizmuted font-semibold">No hay artículos con este filtro.</div>' : ''}
    </div>

    <div class="biz-card p-6 space-y-3">
      ${secTitle('Movimientos recientes')}
      ${movRows(LOG.slice(0, 12))}
    </div>
  `;
}

// ================= VISTA: HORAS EXTRA & FALTAS =================
const HD = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function horDias() {
  const r = new Date(VW.ref);
  r.setHours(12, 0, 0, 0);
  if (VW.m === 'sem') {
    r.setDate(r.getDate() - (r.getDay() + 6) % 7);
    return [...Array(7)].map((_, i) => { const d = new Date(r); d.setDate(r.getDate() + i); return d; });
  }
  const n = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  return [...Array(n)].map((_, i) => new Date(r.getFullYear(), r.getMonth(), i + 1, 12));
}

const horReg = (p, d) => REG[p.id + '|' + iso(d)];

function horTot(p, ds) {
  let ex = 0, fa = 0;
  ds.forEach(d => {
    const r = horReg(p, d);
    if (r && r.fa) fa++;
    else if (r) ex += +r.ex || 0;
  });
  return { ex, fa };
}

function horRango(ds) {
  if (VW.m === 'mes') return ds[0].toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  const a = ds[0].toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
  return `${a} – ${ds[6].toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function renderHoras() {
  const container = $('#hor-content');
  if (!container) return;

  const ds = horDias(), today = hoy(), mes = VW.m === 'mes';
  const q = STATE.search.toLowerCase();
  const people = PER.filter(p => (p.n + ' ' + p.r).toLowerCase().includes(q));
  const tots = people.map(p => ({ p, ...horTot(p, ds) }));
  const totEx = tots.reduce((s, t) => s + t.ex, 0);
  const totFa = tots.reduce((s, t) => s + t.fa, 0);
  const lab = ds.filter(d => d.getDay() !== 0 && iso(d) <= today);
  const faltasPas = people.reduce((s, p) => s + lab.filter(d => (horReg(p, d) || {}).fa).length, 0);
  const asis = lab.length && people.length ? Math.round((1 - faltasPas / (lab.length * people.length)) * 100) : 100;
  const top = [...tots].sort((a, b) => b.ex - a.ex)[0];

  const cell = (p, d) => {
    const r = horReg(p, d), k = iso(d), sun = d.getDay() === 0;
    const [cls, txt] = r && r.fa ? ['bg-rose-100 text-rose-700 border-rose-200', 'F']
      : r && r.ex ? ['bg-amber-100 text-amber-800 border-amber-200', '+' + fmt1(r.ex)]
      : [sun ? 'bg-bizsubtle text-bizmuted border-transparent' : 'bg-bizbg text-bizmuted border-transparent', sun ? '' : '·'];
    return `<td class="p-0.5"><button data-a="hcell" data-id="${p.id}" data-m="${k}" title="${esc(p.n)} · ${fdate(k)}" class="${mes ? 'w-8 h-8 text-[10px]' : 'w-full min-w-[56px] h-11 text-xs'} rounded-xl border font-bold ${cls} ${k === today ? 'ring-1 ring-bizdark/40' : ''} hover:scale-105 active:scale-95 transition-transform">${txt}</button></td>`;
  };

  container.innerHTML = `
    <div class="biz-card p-6 space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-bizborder">
        <div>
          <h2 class="text-lg font-bold text-bizdark">Horas Extra & Faltas</h2>
          <p class="text-xs text-bizmuted font-medium mt-0.5 first-letter:uppercase">${horRango(ds)}</p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <div class="bg-white border border-bizborder rounded-full p-1 flex items-center shadow-sm">
            <button data-a="hmode" data-m="sem" class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${!mes ? 'bg-bizdark text-white' : 'text-bizmuted hover:text-bizdark'}">Semana</button>
            <button data-a="hmode" data-m="mes" class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mes ? 'bg-bizdark text-white' : 'text-bizmuted hover:text-bizdark'}">Mes</button>
          </div>
          <div class="bg-white border border-bizborder rounded-full p-1 flex items-center shadow-sm">
            <button data-a="hnav" data-m="-1" class="p-1.5 rounded-full text-bizmuted hover:text-bizdark" title="Anterior"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
            <button data-a="hnav" data-m="0" class="px-2.5 py-1 rounded-full text-xs font-semibold text-bizdark hover:bg-bizbg">Hoy</button>
            <button data-a="hnav" data-m="1" class="p-1.5 rounded-full text-bizmuted hover:text-bizdark" title="Siguiente"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
          </div>
          <button data-a="hcopy" class="${BTN}"><i data-lucide="copy" class="w-3.5 h-3.5 text-bizmuted"></i><span>Copiar resumen</span></button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        ${metric('Horas extra', fmt1(totEx) + ' h', 'text-amber-600')}
        ${metric('Faltas', totFa, totFa ? 'text-rose-600' : 'text-bizdark')}
        ${metric('Asistencia', asis + '%', asis < 90 ? 'text-rose-600' : 'text-emerald-700')}
        ${metric('Más horas extra', top && top.ex ? esc(top.p.n.split(' ')[0]) + ' · ' + fmt1(top.ex) + ' h' : '—')}
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-bizmuted">
        <span class="flex items-center gap-1.5"><span class="w-4 h-4 rounded-md bg-amber-100 border border-amber-200"></span>Horas extra</span>
        <span class="flex items-center gap-1.5"><span class="w-4 h-4 rounded-md bg-rose-100 border border-rose-200"></span>Falta</span>
        <span class="flex items-center gap-1.5"><span class="w-4 h-4 rounded-md bg-bizbg"></span>Jornada normal</span>
        <span class="ml-auto">Toca una celda: +1 h → +2 h → +3 h → +4 h → Falta → normal · Clic derecho para limpiar</span>
      </div>

      <div class="overflow-x-auto -mx-2 px-2">
        <table class="w-full border-separate" style="border-spacing: 0 2px">
          <thead>
            <tr>
              <th class="sticky left-0 z-10 bg-white text-left text-[11px] font-bold text-bizmuted uppercase tracking-wider pr-3 min-w-[170px]">Persona</th>
              ${ds.map(d => {
                const k = iso(d);
                return `<th class="p-0.5 text-center"><div class="rounded-xl py-1 ${k === today ? 'bg-bizdark text-white' : d.getDay() === 0 ? 'text-bizmuted/60' : 'text-bizmuted'}"><span class="block text-[10px] font-bold uppercase">${mes ? HD[d.getDay()][0] : HD[d.getDay()]}</span><span class="block text-xs font-extrabold ${k === today ? '' : 'text-bizdark'}">${d.getDate()}</span></div></th>`;
              }).join('')}
              <th class="text-center text-[11px] font-bold text-bizmuted uppercase tracking-wider px-2">Extra</th>
              <th class="text-center text-[11px] font-bold text-bizmuted uppercase tracking-wider px-2">Faltas</th>
            </tr>
          </thead>
          <tbody>
            ${tots.map(({ p, ex, fa }) => `
              <tr>
                <td class="sticky left-0 z-10 bg-white pr-3">
                  <div class="flex items-center gap-2.5">
                    ${avatar(p, 'w-8 h-8 text-[11px] rounded-full')}
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-bizdark truncate">${esc(p.n)}</p>
                      <p class="text-[11px] text-bizmuted truncate">${esc(p.r)}</p>
                    </div>
                  </div>
                </td>
                ${ds.map(d => cell(p, d)).join('')}
                <td class="text-center text-sm font-extrabold ${ex ? 'text-amber-600' : 'text-bizmuted'} px-2">${fmt1(ex)} h</td>
                <td class="text-center text-sm font-extrabold ${fa ? 'text-rose-600' : 'text-bizmuted'} px-2">${fa}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td class="sticky left-0 z-10 bg-white pr-3 pt-2 text-[11px] font-bold text-bizmuted uppercase tracking-wider">Total del día</td>
              ${ds.map(d => {
                const e = people.reduce((s, p) => { const r = horReg(p, d); return s + (r && !r.fa ? +r.ex || 0 : 0); }, 0);
                const f = people.filter(p => (horReg(p, d) || {}).fa).length;
                return `<td class="pt-2 text-center text-[10px] font-bold leading-tight">${e ? `<span class="block text-amber-600">+${fmt1(e)}</span>` : ''}${f ? `<span class="block text-rose-600">${f}F</span>` : ''}</td>`;
              }).join('')}
              <td class="pt-2 text-center text-sm font-extrabold text-bizdark">${fmt1(totEx)} h</td>
              <td class="pt-2 text-center text-sm font-extrabold text-bizdark">${totFa}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;

  lucide.createIcons();
}

// ================= VISTA: PLANEACIÓN (Pizarras) =================
const PK = { nota: ['Nota', 'sticky-note'], cli: ['Cliente', 'users'], con: ['Contratista', 'hard-hat'], per: ['Personal', 'user'], prov: ['Proveedor', 'package-search'], fic: ['Ficha', 'truck'] };
const PCOL = { y: ['#fef9c3', '#fde68a'], b: ['#e0f2fe', '#bae6fd'], g: ['#dcfce7', '#bbf7d0'], p: ['#ede9fe', '#ddd6fe'] };
const PSRC = { cli: () => CLI, con: () => CON, per: () => PER, prov: () => PROV, fic: () => F };
const board = () => PB.boards.find(b => b.id === PB.cur) || PB.boards[0];
const plRef = it => PSRC[it.k] ? PSRC[it.k]().find(x => x.id === it.r) : null;
const plName = (k, o) => k === 'fic' ? 'Ficha ' + o.cod : o.n;
const plSub = (k, o) => k === 'cli' ? o.tp + (o.z ? ' · ' + o.z : '') : k === 'con' ? o.o + (o.z ? ' · ' + o.z : '') : k === 'per' ? o.r : k === 'prov' ? o.c : o.veh.n + ' · ' + o.veh.p;
const contacto = key => {
  const [k, id] = key.split(':');
  const o = PSRC[k] && k !== 'fic' ? PSRC[k]().find(x => x.id === id) : null;
  return o && { key, k, n: o.n, sub: plSub(k, o), t: o.t };
};
const boardContacts = b => [...new Set(b.items.filter(i => ['per', 'con', 'cli', 'prov'].includes(i.k)).map(i => i.k + ':' + i.r))];

function pSnap() {
  PB.hist.push(JSON.stringify(PB.boards));
  if (PB.hist.length > 40) PB.hist.shift();
}

function pinBody(it) {
  const o = plRef(it);
  if (!o) return '<p class="text-xs text-bizmuted">Este dato ya no existe.</p>';
  let extra = '';
  if (it.k === 'cli') { const s = saldo(o); extra = s ? `<span class="biz-pill pill-amber">Debe ${$m(s)}</span>` : `<span class="biz-pill pill-${LE[o.est][1]}">${LE[o.est][0]}</span>`; }
  if (it.k === 'con') {
    const k = (o.k || []).find(x => x.est !== 'fin');
    extra = `<span class="biz-pill pill-${ES[o.est][1]}">${ES[o.est][0]}</span>` + (k ? `
      <div class="w-full"><div class="w-full h-1 bg-bizborder rounded-full overflow-hidden mt-1"><div class="h-full bg-emerald-500" style="width: ${kPct(k)}%"></div></div>
      <p class="text-[10px] text-bizmuted mt-1 truncate">${esc(k.pr)} · ${kPct(k)}% pagado</p></div>` : '');
  }
  if (it.k === 'per') extra = `<span class="biz-pill ${o.e ? 'pill-emerald' : 'pill-amber'}">${o.e ? 'Confirmado' : 'Pendiente'}</span><span class="text-[10px] text-bizmuted font-semibold">${ART.filter(a => a.asig === o.id).length} artículos</span>`;
  if (it.k === 'prov') { const s = saldo(o); extra = s ? `<span class="biz-pill pill-amber">Por pagar ${$m(s)}</span>` : `<span class="biz-pill pill-${VE[o.est][1]}">${VE[o.est][0]}</span>`; }
  if (it.k === 'fic') {
    const st = FL.find(x => x.id === o.est) || FL[0];
    extra = `<span class="biz-pill pill-${st.t}">${st.l}</span><span class="text-[10px] text-bizmuted font-semibold">${o.par.filter(p => p.e === 'completado').length}/${o.par.length} paradas</span>`;
  }
  return `
    <div class="flex items-center gap-2.5">
      ${avatar(it.k === 'fic' ? { n: o.cod } : o, 'w-9 h-9 text-xs rounded-xl')}
      <div class="min-w-0">
        <p class="text-sm font-bold text-bizdark leading-tight truncate">${esc(plName(it.k, o))}</p>
        <p class="text-[11px] text-bizmuted truncate">${esc(plSub(it.k, o))}</p>
      </div>
    </div>
    <div class="flex items-center gap-1.5 flex-wrap">${extra}</div>
    ${o.t ? `<p class="text-[10px] text-bizmuted font-semibold flex items-center gap-1"><i data-lucide="phone" class="w-3 h-3"></i>${esc(o.t)}</p>` : ''}
  `;
}

function pinCard(it) {
  const [kl, ki] = PK[it.k];
  const col = it.k === 'nota' ? PCOL[it.c || 'y'] : null;
  return `
    <div class="pin-card p-3.5 space-y-2 ${PB.sel.has(it.id) ? 'selected' : ''} ${PB.first === it.id ? 'first-link' : ''}" data-pin="${it.id}"
      style="left: ${it.x}px; top: ${it.y}px; touch-action: none; ${col ? `background: ${col[0]}; border-color: ${col[1]};` : ''}">
      <div class="flex items-center justify-between gap-2 cursor-grab">
        <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-bizmuted"><i data-lucide="${ki}" class="w-3.5 h-3.5"></i>${kl}</span>
        <div class="flex items-center gap-1">
          ${col ? Object.entries(PCOL).map(([k, c]) => `<button data-a="pcol" data-id="${it.id}" data-m="${k}" class="w-3 h-3 rounded-full border ${it.c === k ? 'border-bizdark' : 'border-black/10'}" style="background: ${c[1]}" title="Color"></button>`).join('') : ''}
          <button data-a="pdel" data-id="${it.id}" class="p-0.5 rounded-md text-bizmuted hover:text-rose-600" title="Quitar de la pizarra"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        </div>
      </div>
      ${it.k === 'nota'
        ? `<textarea data-f="pnote" data-id="${it.id}" rows="${Math.max(2, Math.min(8, (it.text || '').split('\n').length + Math.floor((it.text || '').length / 32)))}" class="w-full bg-transparent text-xs font-medium text-bizdark resize-none focus:outline-none placeholder:text-bizmuted" placeholder="Escribe una nota…">${esc(it.text)}</textarea>`
        : pinBody(it)}
    </div>
  `;
}

function drawLinks() {
  const svg = $('#pl-svg');
  if (!svg) return;
  const box = id => {
    const el = document.querySelector(`[data-pin="${id}"]`);
    return el && { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
  };
  svg.innerHTML = board().links.map(l => {
    const p = box(l.a), q = box(l.b);
    if (!p || !q) return '';
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, dx = (q.x - p.x) / 2;
    return `
      <path d="M${p.x},${p.y} C${p.x + dx},${p.y} ${q.x - dx},${q.y} ${q.x},${q.y}" stroke="#18191d" stroke-opacity="0.35" stroke-width="2" fill="none" stroke-dasharray="6 5"/>
      <g data-a="punlink" data-id="${l.id}" style="pointer-events: auto; cursor: pointer"><title>Quitar conexión</title>
        <circle cx="${mx}" cy="${my}" r="9" fill="#ffffff" stroke="#e4e2d9"/>
        <path d="M${mx - 3},${my - 3} L${mx + 3},${my + 3} M${mx + 3},${my - 3} L${mx - 3},${my + 3}" stroke="#71737c" stroke-width="1.6"/>
      </g>`;
  }).join('');
}

function renderPlan() {
  const container = $('#plan-content');
  if (!container) return;

  const b = board();
  const cv = $('#pl-canvas');
  const scroll = cv ? [cv.scrollLeft, cv.scrollTop] : [0, 0];
  const hint = PB.conn
    ? (PB.first ? 'Ahora toca la segunda tarjeta para conectarlas.' : 'Modo conectar: toca la primera tarjeta.')
    : 'Arrastra las tarjetas para ordenarlas · Shift + clic para seleccionar varias · Toca ✕ en una línea para quitarla.';

  container.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2 flex-wrap">
        ${PB.boards.map(x => chip(x.id === b.id, `data-a="pboard" data-id="${x.id}"`, `<i data-lucide="presentation" class="w-3.5 h-3.5"></i>${esc(x.name)}`)).join('')}
        <button data-a="pbnew" class="px-3.5 py-1.5 rounded-full text-xs font-semibold border border-dashed border-bizmuted text-bizmuted hover:text-bizdark hover:border-bizdark transition-all">+ Pizarra</button>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button data-a="pnota" class="${BTN}"><i data-lucide="sticky-note" class="w-3.5 h-3.5 text-amber-500"></i><span>Nota</span></button>
        <button data-a="plink" class="${BTN}"><i data-lucide="link" class="w-3.5 h-3.5 text-bizmuted"></i><span>Vincular dato</span></button>
        <button data-a="pconn" class="${PB.conn ? BTN_DARK : BTN}"><i data-lucide="spline" class="w-3.5 h-3.5"></i><span>${PB.conn ? 'Conectando…' : 'Conectar'}</span></button>
        ${PB.sel.size ? `<button data-a="pdelsel" class="${BTN} text-rose-600"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i><span>Quitar (${PB.sel.size})</span></button>` : ''}
        <button data-a="pundo" class="${BTN}" ${PB.hist.length ? '' : 'disabled style="opacity:.5"'} title="Deshacer"><i data-lucide="undo-2" class="w-3.5 h-3.5 text-bizmuted"></i></button>
        <button data-a="pwa" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"><i data-lucide="send" class="w-3.5 h-3.5"></i><span>Enviar por WhatsApp</span></button>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div class="flex items-center gap-2">
        <h2 class="text-base font-bold text-bizdark">${esc(b.name)}</h2>
        <button data-a="pbren" class="p-1 text-bizmuted hover:text-bizdark" title="Renombrar pizarra"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
        <button data-a="pbdel" class="p-1 text-bizmuted hover:text-rose-600" title="Eliminar pizarra"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        <span class="text-[11px] font-semibold text-bizmuted">${b.items.length} tarjetas · ${b.links.length} conexiones</span>
      </div>
      <p class="text-[11px] font-semibold ${PB.conn ? 'text-indigo-600' : 'text-bizmuted'}">${hint}</p>
    </div>

    <div id="pl-canvas" class="planner-canvas">
      <div class="pin-board">
        <svg id="pl-svg" class="absolute inset-0 pointer-events-none" width="2800" height="1800"></svg>
        ${b.items.map(pinCard).join('')}
        ${!b.items.length ? `
          <div class="absolute left-10 top-10 w-80 p-6 rounded-3xl border border-dashed border-bizmuted/50 bg-white/70 text-xs text-bizmuted font-medium space-y-2">
            <p class="text-sm font-bold text-bizdark">Pizarra vacía</p>
            <p>Agrega una <b>Nota</b> o usa <b>Vincular dato</b> para traer clientes, contratistas, personal, proveedores o fichas. Luego conéctalos con <b>Conectar</b>.</p>
          </div>` : ''}
      </div>
    </div>
  `;

  lucide.createIcons();
  const ncv = $('#pl-canvas');
  ncv.scrollLeft = scroll[0];
  ncv.scrollTop = scroll[1];
  drawLinks();
}

function plAdd(it) {
  const b = board(), cv = $('#pl-canvas'), n = b.items.length;
  pSnap();
  Object.assign(it, { id: uid(), x: (cv ? cv.scrollLeft : 0) + 40 + (n % 6) * 36, y: (cv ? cv.scrollTop : 0) + 40 + (n % 6) * 30 });
  b.items.push(it);
  if (PB.sel.size === 1) b.links.push({ id: uid(), a: [...PB.sel][0], b: it.id });
  return it;
}

function plRemove(ids) {
  const b = board();
  pSnap();
  b.items = b.items.filter(i => !ids.includes(i.id));
  b.links = b.links.filter(l => !ids.includes(l.a) && !ids.includes(l.b));
  ids.forEach(id => PB.sel.delete(id));
  if (ids.includes(PB.first)) PB.first = null;
}

function pinClick(id, multi) {
  const b = board();
  if (PB.conn) {
    if (!PB.first || PB.first === id) PB.first = PB.first === id ? null : id;
    else {
      const dup = b.links.some(l => (l.a === PB.first && l.b === id) || (l.a === id && l.b === PB.first));
      if (!dup) { pSnap(); b.links.push({ id: uid(), a: PB.first, b: id }); toast('Tarjetas conectadas'); }
      PB.first = null;
    }
  } else if (multi) {
    PB.sel.has(id) ? PB.sel.delete(id) : PB.sel.add(id);
  } else {
    PB.sel = PB.sel.size === 1 && PB.sel.has(id) ? new Set() : new Set([id]);
  }
  renderPlan();
}

// Arrastre de tarjetas en la pizarra
document.addEventListener('pointerdown', e => {
  const card = e.target.closest('.pin-card');
  if (!card || STATE.view !== 'plan' || e.button > 0 || e.target.closest('textarea, button, a, select, input')) return;
  const it = board().items.find(i => i.id === card.dataset.pin);
  if (!it) return;
  const sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y;
  let moved = false;
  const mv = ev => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
    if (!moved) { pSnap(); moved = true; card.classList.add('dragging'); }
    it.x = Math.max(0, Math.min(2560, ox + dx));
    it.y = Math.max(0, Math.min(1700, oy + dy));
    card.style.left = it.x + 'px';
    card.style.top = it.y + 'px';
    drawLinks();
  };
  const up = ev => {
    document.removeEventListener('pointermove', mv);
    document.removeEventListener('pointerup', up);
    card.classList.remove('dragging');
    if (!moved) pinClick(it.id, ev.shiftKey || ev.ctrlKey || ev.metaKey);
  };
  document.addEventListener('pointermove', mv);
  document.addEventListener('pointerup', up);
});

// Diálogo: vincular datos existentes a la pizarra
function openPlk() {
  PB.lq = '';
  renderPlk();
  $('#dlg-plk').showModal();
}

function renderPlk() {
  $('#plk-body').innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">Vincular datos a la pizarra</h3>
          <p class="text-xs text-bizmuted font-medium">${PB.sel.size === 1 ? 'Lo que agregues quedará conectado a la tarjeta seleccionada' : 'Clientes, contratistas, personal, proveedores o fichas de despacho'}</p>
        </div>
        <button onclick="$('#dlg-plk').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>
      <div class="flex gap-2 flex-wrap">
        ${Object.keys(PSRC).map(k => chip(PB.lk === k, `data-a="plkk" data-m="${k}"`, `<i data-lucide="${PK[k][1]}" class="w-3.5 h-3.5"></i>${PK[k][0]}`)).join('')}
      </div>
      <input data-f="plq" value="${esc(PB.lq)}" placeholder="Buscar…" class="${INP}">
      <div id="plk-list" class="space-y-2 max-h-[340px] overflow-y-auto pr-1">${plkList()}</div>
      <div class="flex justify-end pt-3 border-t border-bizborder">
        <button onclick="$('#dlg-plk').close()" class="px-5 py-2 rounded-full bg-bizdark text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all">Listo</button>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function plkList() {
  const k = PB.lk, q = PB.lq.toLowerCase();
  const on = new Set(board().items.filter(i => i.k === k).map(i => i.r));
  const rows = PSRC[k]().filter(o => (plName(k, o) + ' ' + plSub(k, o)).toLowerCase().includes(q));
  return rows.map(o => `
    <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-bizbg text-xs">
      <div class="flex items-center gap-3 min-w-0">
        ${avatar(k === 'fic' ? { n: o.cod } : o, 'w-8 h-8 text-[11px] rounded-full')}
        <div class="min-w-0">
          <p class="font-bold text-bizdark truncate">${esc(plName(k, o))}</p>
          <p class="text-[11px] text-bizmuted truncate">${esc(plSub(k, o))}</p>
        </div>
      </div>
      ${on.has(o.id)
        ? '<span class="text-[11px] font-bold text-bizmuted shrink-0">En pizarra</span>'
        : `<button data-a="padd" data-m="${k}" data-id="${o.id}" class="px-3 py-1.5 rounded-full bg-bizdark text-white text-[11px] font-bold hover:bg-neutral-800 shrink-0">Agregar</button>`}
    </div>
  `).join('') || '<p class="text-xs text-bizmuted p-3">Sin resultados.</p>';
}

// Diálogo: envío masivo de la planeación por WhatsApp
function plMsg(b) {
  const notes = b.items.filter(i => i.k === 'nota' && (i.text || '').trim());
  const refs = b.items.filter(i => i.k !== 'nota').map(i => [i, plRef(i)]).filter(([, o]) => o);
  const nm = id => {
    const i = b.items.find(x => x.id === id);
    if (!i) return '?';
    if (i.k === 'nota') return 'Nota';
    const o = plRef(i);
    return o ? plName(i.k, o) : '?';
  };
  return [
    `*Planeación: ${b.name}*`,
    `${CE.emp} · ${new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    notes.length ? '\n*Notas:*\n' + notes.map(n => '📝 ' + n.text.trim()).join('\n') : '',
    refs.length ? '\n*Involucrados:*\n' + refs.map(([i, o]) => `• ${plName(i.k, o)} (${PK[i.k][0]})`).join('\n') : '',
    b.links.length ? '\n*Relaciones:*\n' + b.links.map(l => `🔗 ${nm(l.a)} ↔ ${nm(l.b)}`).join('\n') : ''
  ].filter(Boolean).join('\n');
}

function openPlm() {
  PB.rcp = new Set(boardContacts(board()).filter(k => (contacto(k) || {}).t));
  PB.txt = null;
  PB.rq = '';
  renderPlm();
  $('#dlg-plm').showModal();
}

function renderPlm() {
  const b = board(), txt = PB.txt ?? plMsg(b);
  $('#plm-body').innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">Enviar planeación por WhatsApp</h3>
          <p class="text-xs text-bizmuted font-medium">${esc(b.name)} · envío a varios contactos</p>
        </div>
        <button onclick="$('#dlg-plm').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>
      <textarea data-f="pltxt" rows="8" class="w-full bg-bizbg border border-bizborder rounded-2xl p-4 text-xs font-mono text-bizdark focus:outline-none focus:ring-2 focus:ring-bizdark resize-none">${esc(txt)}</textarea>
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-bizdark uppercase tracking-wider">Destinatarios</span>
          <span class="text-[11px] font-semibold text-bizmuted">${PB.rcp.size} seleccionados</span>
        </div>
        <input data-f="plrq" value="${esc(PB.rq)}" placeholder="Buscar otro contacto (personal, contratista, cliente, proveedor)…" class="${INP} text-xs">
        <div id="plm-list" class="space-y-2 max-h-[260px] overflow-y-auto pr-1">${plmList(txt)}</div>
      </div>
      <div class="flex items-center justify-between gap-2 pt-3 border-t border-bizborder flex-wrap">
        <button data-a="pcopy" class="px-4 py-2 rounded-full border border-bizborder text-xs font-bold text-bizdark hover:bg-bizbg transition-all">Copiar texto</button>
        <div class="flex items-center gap-2">
          <button data-a="pwaall" class="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all" ${PB.rcp.size ? '' : 'disabled style="opacity:.5"'}>
            <i data-lucide="send" class="w-3.5 h-3.5"></i><span>Abrir todos (${PB.rcp.size})</span>
          </button>
          <button onclick="$('#dlg-plm').close()" class="px-5 py-2 rounded-full bg-bizdark text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all">Listo</button>
        </div>
      </div>
      <p class="text-[11px] text-bizmuted">El navegador puede pedir permiso para abrir varias ventanas a la vez. También puedes enviar uno por uno con el botón de cada contacto.</p>
    </div>
  `;
  lucide.createIcons();
}

function plmList(txt) {
  const q = PB.rq.toLowerCase();
  let keys = [...new Set([...boardContacts(board()), ...PB.rcp])];
  if (q) {
    const all = ['per', 'con', 'cli', 'prov'].flatMap(k => PSRC[k]().map(o => k + ':' + o.id));
    keys = [...new Set([...keys, ...all])].filter(k => { const c = contacto(k); return c && (c.n + ' ' + c.sub).toLowerCase().includes(q); });
  }
  const rows = keys.map(contacto).filter(Boolean);
  if (!rows.length) return '<p class="text-xs text-bizmuted p-3">No hay contactos. Vincula personal, clientes o contratistas a la pizarra, o búscalos arriba.</p>';
  return rows.map(c => {
    const on = PB.rcp.has(c.key);
    return `
      <div class="flex items-center justify-between gap-3 p-3 rounded-2xl ${on ? 'bg-bizbg' : 'border border-bizborder'} text-xs">
        <button data-a="prcp" data-m="${c.key}" class="flex items-center gap-3 min-w-0 flex-1 text-left" ${c.t ? '' : 'disabled'}>
          <span class="w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-bizdark border-bizdark text-white' : 'border-bizborder bg-white'}">${on ? '<i data-lucide="check" class="w-3 h-3"></i>' : ''}</span>
          <span class="min-w-0">
            <span class="block font-bold text-bizdark truncate">${esc(c.n)}</span>
            <span class="block text-[11px] text-bizmuted truncate">${PK[c.k][0]} · ${esc(c.sub)} · ${c.t ? esc(c.t) : 'sin teléfono'}</span>
          </span>
        </button>
        ${c.t ? `<a target="_blank" rel="noopener" data-k="${c.key}" href="${wlink(c, txt)}" class="plm-wa px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0"><i data-lucide="send" class="w-3.5 h-3.5"></i>WhatsApp</a>` : ''}
      </div>
    `;
  }).join('');
}

// ================= ACCIONES DE LAS VISTAS OPERATIVAS =================
const findIn = (arr, id) => arr.find(x => x.id === id);
const closeDlg = id => $('#' + id).close();

const ACT = {
  // --- Contratistas ---
  csel: t => { CS.sel = t.dataset.id; CS.edited = null; renderContratistas(); },
  cchip: t => { CS.esp = t.dataset.m; CS.fav = false; renderContratistas(); },
  cfavf: () => { CS.fav = !CS.fav; CS.esp = 'todos'; renderContratistas(); },
  cfav: t => { const c = findIn(CON, t.dataset.id); c.fav = !c.fav; renderContratistas(); },
  cest: t => { findIn(CON, t.dataset.id).est = t.dataset.m; renderContratistas(); },
  cnew: () => conForm(null),
  cedit: t => conForm(findIn(CON, t.dataset.id)),
  csave: t => {
    const d = readForm('con');
    if (!d.n) return toast('El nombre es obligatorio', 'rose');
    d.cal = +d.cal;
    const c = findIn(CON, t.dataset.id);
    if (c) Object.assign(c, d);
    else { const n = { id: uid(), t2: '', fav: false, f: '', h: [], k: [], docs: [], ...d }; CON.push(n); CS.sel = n.id; }
    closeDlg('dlg-con'); renderContratistas(); toast(c ? 'Contratista actualizado' : 'Contratista agregado');
  },
  knew: t => formDlg('rate', 'Nuevo proyecto', esc(findIn(CON, t.dataset.id).n), [
    { k: 'pr', l: 'Proyecto', full: 1, ph: 'Remodelación de oficina…' },
    { k: 'm', l: 'Monto total', type: 'number', v: '' },
    { k: 'et', l: 'Esquema de pagos', v: '30-40-30', opts: [['30-40-30', 'Anticipo 30 · Avance 40 · Final 30'], ['50-50', 'Anticipo 50 · Final 50'], ['40-30-30', 'Anticipo 40 · Avance 30 · Final 30'], ['25x4', '4 pagos de 25 %'], ['100', 'Pago único al terminar']] },
    { k: 'i', l: 'Inicio', type: 'date', v: hoy() },
    { k: 'f', l: 'Entrega estimada', type: 'date', v: addD(hoy(), 30) }
  ], 'ksave', t.dataset.id),
  ksave: t => {
    const d = readForm('rate');
    if (!d.pr || !(+d.m > 0)) return toast('Indica el proyecto y un monto mayor a cero', 'rose');
    findIn(CON, t.dataset.id).k.push({ id: uid(), pr: d.pr, i: d.i, f: d.f, m: +d.m, et: HIT[d.et].map(([n, p]) => ({ n, p, pg: null })), est: 'curso' });
    closeDlg('dlg-rate'); renderContratistas(); toast('Proyecto creado');
  },
  khit: t => {
    const k = findIn(findIn(CON, t.dataset.id).k, t.dataset.k);
    const e = k.et[+t.dataset.s];
    e.pg = e.pg ? null : hoy();
    if (kPct(k) >= 100) k.est = 'fin';
    else if (k.est === 'fin') k.est = 'curso';
    renderContratistas();
    if (e.pg) toast(`Pago registrado: ${$m(kAmt(k, e.p))}`);
  },
  kest: t => {
    const k = findIn(findIn(CON, t.dataset.id).k, t.dataset.k);
    k.est = { curso: 'pausa', pausa: 'fin', fin: 'curso' }[k.est];
    renderContratistas();
  },
  dnew: t => formDlg('rate', 'Agregar documento', esc(findIn(CON, t.dataset.id).n), [
    { k: 't', l: 'Tipo', v: 'Seguro', opts: DOCT.map(x => [x, x]) },
    { k: 'v', l: 'Vence', type: 'date', v: '' },
    { k: 'd', l: 'Descripción', full: 1, ph: 'Póliza, número, aseguradora…' }
  ], 'dsave', t.dataset.id),
  dsave: t => {
    const d = readForm('rate');
    findIn(CON, t.dataset.id).docs.push({ id: uid(), ...d });
    closeDlg('dlg-rate'); renderContratistas(); toast('Documento agregado');
  },
  cdocdel: t => {
    const c = findIn(CON, t.dataset.id);
    if (!confirm('¿Quitar este documento?')) return;
    c.docs = c.docs.filter(d => d.id !== t.dataset.k);
    renderContratistas();
  },
  jnew: t => formDlg('rate', 'Registrar trabajo', esc(findIn(CON, t.dataset.id).n), [
    { k: 'j', l: 'Trabajo realizado', full: 1 },
    { k: 'd', l: 'Fecha', type: 'date', v: hoy() },
    { k: 'c', l: 'Costo', type: 'number', v: '' },
    { k: 'r', l: 'Resultado', v: 'bien', opts: Object.entries(RES).map(([k, v]) => [k, v[0]]) }
  ], 'jsave', t.dataset.id),
  jsave: t => {
    const d = readForm('rate');
    if (!d.j) return toast('Describe el trabajo', 'rose');
    findIn(CON, t.dataset.id).h.unshift({ d: d.d, j: d.j, c: +d.c || 0, r: d.r });
    closeDlg('dlg-rate'); renderContratistas(); toast('Trabajo registrado');
  },

  // --- Proveedores ---
  vsel: t => { VS.sel = t.dataset.id; VS.edited = null; renderProveedores(); },
  vchip: t => { VS.cat = t.dataset.m; VS.fav = false; VS.deuda = false; renderProveedores(); },
  vfavf: () => { VS.fav = !VS.fav; VS.cat = 'todas'; renderProveedores(); },
  vdeuf: () => { VS.deuda = !VS.deuda; VS.cat = 'todas'; renderProveedores(); },
  vfav: t => { const v = findIn(PROV, t.dataset.id); v.fav = !v.fav; renderProveedores(); },
  vest: t => { findIn(PROV, t.dataset.id).est = t.dataset.m; renderProveedores(); },
  vnew: () => provForm(null),
  vedit: t => provForm(findIn(PROV, t.dataset.id)),
  vsave: t => {
    const d = readForm('prov');
    if (!d.n) return toast('El nombre es obligatorio', 'rose');
    ['pago', 'lim', 'desc', 'ent', 'cal'].forEach(k => { d[k] = +d[k] || 0; });
    const v = findIn(PROV, t.dataset.id);
    if (v) Object.assign(v, d);
    else { const n = { id: uid(), t2: '', ref: '', ml: '', fav: false, f: '', h: [], ...d }; PROV.push(n); VS.sel = n.id; }
    closeDlg('dlg-prov'); renderProveedores(); toast(v ? 'Proveedor actualizado' : 'Proveedor agregado');
  },
  fnew: t => formDlg('rate', 'Registrar factura por pagar', esc(findIn(PROV, t.dataset.id).n), [
    { k: 'c', l: 'Concepto', full: 1, ph: 'Materiales obra…' },
    { k: 'm', l: 'Monto', type: 'number', v: '' },
    { k: 'd', l: 'Fecha de factura', type: 'date', v: hoy() }
  ], 'fsave', t.dataset.id),
  fsave: t => {
    const d = readForm('rate');
    if (!d.c || !(+d.m > 0)) return toast('Indica el concepto y un monto mayor a cero', 'rose');
    const v = findIn(PROV, t.dataset.id);
    v.h.push({ d: d.d, c: d.c, m: +d.m, pg: false });
    closeDlg('dlg-rate'); renderProveedores(); toast(`Factura registrada · vence ${fdate(addD(d.d, +v.pago || 0))}`);
  },
  vpag: t => {
    const h = findIn(PROV, t.dataset.id).h[+t.dataset.s];
    h.pg = !h.pg;
    renderProveedores();
    if (h.pg) toast(`Pago registrado: ${$m(h.m)}`);
  },

  // --- Equipos ---
  esub: t => { EQ.sub = t.dataset.m; renderEquipos(); },
  esel: t => { EQ.sel = t.dataset.id; renderEquipos(); },
  ecat: t => { EQ.cat = t.dataset.m; renderEquipos(); },
  adev: t => {
    const a = findIn(ART, t.dataset.id), p = a.asig;
    a.asig = null;
    logMov(a, p, 'dev');
    if (t.dataset.m === 'rep') { a.est = 'rep'; logMov(a, p, 'rep'); }
    renderEquipos(); toast(`${a.n} devuelto por ${perN(p).split(' ')[0]}`);
  },
  arep: t => {
    const a = findIn(ART, t.dataset.id);
    a.est = a.est === 'rep' ? 'ok' : 'rep';
    logMov(a, null, a.est === 'rep' ? 'rep' : 'ok');
    renderEquipos();
  },
  adel: t => {
    const i = ART.findIndex(a => a.id === t.dataset.id);
    if (i < 0 || !confirm(`¿Eliminar "${ART[i].n}" del inventario?`)) return;
    ART.splice(i, 1);
    renderEquipos();
  },
  inew: () => formDlg('itm', 'Nuevo artículo', 'Equipo, herramienta o dispositivo de la empresa', [
    { k: 'n', l: 'Nombre', full: 1, ph: 'Taladro, celular, escalera…' },
    { k: 'c', l: 'Categoría', v: 'Herramientas', opts: ACAT.map(x => [x, x]) },
    { k: 'i', l: 'Ícono', v: 'wrench', opts: AI },
    { k: 'd', l: 'Detalle / serie', full: 1, ph: 'Marca, modelo, IMEI, número de serie…' },
    { k: 'asig', l: 'Asignar a', v: '', opts: [['', 'Sin asignar (disponible)'], ...PER.map(p => [p.id, p.n])], full: 1 }
  ], 'isave'),
  isave: () => {
    const d = readForm('itm');
    if (!d.n) return toast('El nombre es obligatorio', 'rose');
    const a = { id: uid(), n: d.n, c: d.c, d: d.d, i: d.i, est: 'ok', asig: d.asig || null };
    ART.push(a);
    logMov(a, null, 'alta');
    if (a.asig) logMov(a, a.asig, 'pres');
    closeDlg('dlg-itm'); renderEquipos(); toast('Artículo agregado');
  },

  // --- Horas extra & faltas ---
  hcell: t => {
    const key = t.dataset.id + '|' + t.dataset.m, r = REG[key];
    const cur = !r ? 0 : r.fa ? 'F' : +r.ex || 0;
    if (cur === 'F') delete REG[key];
    else if (cur >= 4) REG[key] = { ex: 0, fa: true };
    else REG[key] = { ex: Math.floor(cur) + 1, fa: false };
    renderHoras();
  },
  hmode: t => { VW.m = t.dataset.m; renderHoras(); },
  hnav: t => {
    const n = +t.dataset.m;
    if (!n) VW.ref = new Date();
    else if (VW.m === 'sem') VW.ref.setDate(VW.ref.getDate() + n * 7);
    else VW.ref = new Date(VW.ref.getFullYear(), VW.ref.getMonth() + n, 1);
    renderHoras();
  },
  hcopy: () => {
    const ds = horDias();
    const txt = `*Resumen de horas extra y faltas*\n${horRango(ds)}\n\n` + PER.map(p => {
      const { ex, fa } = horTot(p, ds);
      return `• ${p.n}: ${fmt1(ex)} h extra · ${fa} falta${fa === 1 ? '' : 's'}`;
    }).join('\n');
    navigator.clipboard.writeText(txt).then(() => toast('Resumen copiado'), () => toast('No se pudo copiar', 'rose'));
  },

  // --- Planeación ---
  pboard: t => { PB.cur = t.dataset.id; PB.sel = new Set(); PB.first = null; renderPlan(); },
  pbnew: () => {
    const name = (prompt('Nombre de la nueva pizarra:', 'Nueva pizarra') || '').trim();
    if (!name) return;
    pSnap();
    const b = { id: uid(), name, items: [], links: [] };
    PB.boards.push(b);
    PB.cur = b.id; PB.sel = new Set(); PB.first = null;
    renderPlan();
  },
  pbren: () => {
    const b = board(), name = (prompt('Nuevo nombre de la pizarra:', b.name) || '').trim();
    if (!name) return;
    b.name = name;
    renderPlan();
  },
  pbdel: () => {
    if (PB.boards.length === 1) return toast('Debe quedar al menos una pizarra', 'rose');
    if (!confirm(`¿Eliminar la pizarra "${board().name}"?`)) return;
    pSnap();
    PB.boards = PB.boards.filter(b => b.id !== PB.cur);
    PB.cur = PB.boards[0].id; PB.sel = new Set(); PB.first = null;
    renderPlan();
  },
  pnota: () => {
    const it = plAdd({ k: 'nota', text: '', c: 'y' });
    renderPlan();
    const ta = document.querySelector(`[data-pin="${it.id}"] textarea`);
    if (ta) ta.focus();
  },
  plink: () => openPlk(),
  plkk: t => { PB.lk = t.dataset.m; PB.lq = ''; renderPlk(); },
  padd: t => {
    const o = PSRC[t.dataset.m]().find(x => x.id === t.dataset.id);
    plAdd({ k: t.dataset.m, r: t.dataset.id });
    renderPlan();
    $('#plk-list').innerHTML = plkList();
    lucide.createIcons();
    toast(`${plName(t.dataset.m, o)} agregado a la pizarra`);
  },
  pconn: () => { PB.conn = !PB.conn; PB.first = null; renderPlan(); },
  pdel: t => { plRemove([t.dataset.id]); renderPlan(); },
  pdelsel: () => { plRemove([...PB.sel]); renderPlan(); },
  pcol: t => { pSnap(); board().items.find(i => i.id === t.dataset.id).c = t.dataset.m; renderPlan(); },
  punlink: t => { const b = board(); pSnap(); b.links = b.links.filter(l => l.id !== t.dataset.id); renderPlan(); },
  pundo: () => {
    if (!PB.hist.length) return;
    PB.boards = JSON.parse(PB.hist.pop());
    if (!PB.boards.some(b => b.id === PB.cur)) PB.cur = PB.boards[0].id;
    PB.sel = new Set(); PB.first = null;
    renderPlan();
  },
  pwa: () => openPlm(),
  prcp: t => { const k = t.dataset.m; PB.rcp.has(k) ? PB.rcp.delete(k) : PB.rcp.add(k); renderPlm(); },
  pcopy: () => navigator.clipboard.writeText(PB.txt ?? plMsg(board())).then(() => toast('Texto copiado'), () => toast('No se pudo copiar', 'rose')),
  pwaall: () => {
    const txt = PB.txt ?? plMsg(board());
    const list = [...PB.rcp].map(contacto).filter(c => c && c.t);
    list.forEach(c => window.open(wlink(c, txt), '_blank'));
    toast(`Abriendo ${list.length} chat${list.length === 1 ? '' : 's'} de WhatsApp`);
  }
};

// Campos editables (selects, fechas, textos) de las vistas operativas
const FLD = {
  ctpl: el => { CS.tpl = el.value; CS.edited = null; renderContratistas(); },
  ctxt: el => { CS.edited = el.value; const c = findIn(CON, CS.sel); if (c) $('#btn-con-wa').href = wlink(c, el.value); },
  cdoc: el => { findIn(findIn(CON, el.dataset.id).docs, el.dataset.k).v = el.value; renderContratistas(); },
  vtpl: el => { VS.tpl = el.value; VS.edited = null; renderProveedores(); },
  vtxt: el => { VS.edited = el.value; const v = findIn(PROV, VS.sel); if (v) $('#btn-prov-wa').href = wlink(v, el.value); },
  epres: el => {
    const a = findIn(ART, el.value);
    if (!a) return;
    a.asig = EQ.sel;
    logMov(a, EQ.sel, 'pres');
    renderEquipos(); toast(`${a.n} prestado a ${perN(EQ.sel).split(' ')[0]}`);
  },
  aasig: el => {
    const a = findIn(ART, el.dataset.id);
    if (!el.value) return;
    a.asig = el.value;
    logMov(a, el.value, 'pres');
    renderEquipos(); toast(`${a.n} asignado a ${perN(el.value).split(' ')[0]}`);
  },
  pnote: el => { const it = board().items.find(i => i.id === el.dataset.id); if (it) { it.text = el.value; drawLinks(); } },
  plq: el => { PB.lq = el.value; $('#plk-list').innerHTML = plkList(); lucide.createIcons(); },
  plrq: el => { PB.rq = el.value; $('#plm-list').innerHTML = plmList(PB.txt ?? plMsg(board())); lucide.createIcons(); },
  pltxt: el => { PB.txt = el.value; $$('.plm-wa').forEach(a => { a.href = wlink(contacto(a.dataset.k), el.value); }); }
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-a]');
  if (t && ACT[t.dataset.a]) { ACT[t.dataset.a](t); return; }
  // Clic en zona vacía de la pizarra: limpiar selección / conexión pendiente
  if (!t && STATE.view === 'plan' && e.target.closest('#pl-canvas') && !e.target.closest('.pin-card') && (PB.sel.size || PB.first)) {
    PB.sel = new Set(); PB.first = null;
    renderPlan();
  }
});

const onField = e => {
  const el = e.target.closest && e.target.closest('[data-f]');
  if (!el || !FLD[el.dataset.f]) return;
  const live = el.tagName === 'TEXTAREA' || /^(text|search|number|tel|email)$/.test(el.type);
  if ((e.type === 'input') === live) FLD[el.dataset.f](el);
};
document.addEventListener('input', onField);
document.addEventListener('change', onField);

// Clic derecho en la matriz de horas: limpiar la celda
document.addEventListener('contextmenu', e => {
  const b = e.target.closest('[data-a="hcell"]');
  if (!b) return;
  e.preventDefault();
  delete REG[b.dataset.id + '|' + b.dataset.m];
  renderHoras();
});

document.addEventListener('keydown', e => {
  if (STATE.view !== 'plan' || e.target.closest('input, textarea, select, dialog')) return;
  if (e.key === 'Escape' && (PB.conn || PB.sel.size)) { PB.conn = false; PB.first = null; PB.sel = new Set(); renderPlan(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && PB.sel.size) { plRemove([...PB.sel]); renderPlan(); }
});

// ================= NAVEGACIÓN Y EVENTOS =================
function switchView(viewName) {
  STATE.view = viewName;
  VW.v = viewName;

  // Toggle view containers
  const views = ['desp', 'ini', 'cli', 'plan', 'hor', 'eq', 'con', 'prov'];
  views.forEach(v => {
    const el = $(`#view-${v}`);
    if (el) el.style.display = (v === viewName) ? '' : 'none';
  });

  // Toggle controls depending on view
  const viewModeCont = $('#view-mode-container');
  if (viewModeCont) viewModeCont.style.display = (viewName === 'desp') ? '' : 'none';

  const stateFilter = $('#state-filter');
  if (stateFilter) stateFilter.style.display = (viewName === 'desp') ? '' : 'none';

  // Update sidebar active styling
  $$('.sidebar-item').forEach(btn => {
    const isAct = btn.dataset.m === viewName;
    btn.classList.toggle('bg-bizbg', isAct);
    btn.classList.toggle('text-bizdark', isAct);
    btn.classList.toggle('text-bizmuted', !isAct);
  });

  // Update main action button label
  const label = $('#main-action-label');
  const btn = $('#main-action-btn');
  if (label && btn) {
    if (viewName === 'desp') {
      label.textContent = '+ Nueva Ficha';
      btn.dataset.a = 'wiz';
    } else if (viewName === 'cli') {
      label.textContent = '+ Nuevo Cliente';
      btn.dataset.a = 'lnew';
    } else if (viewName === 'con') {
      label.textContent = '+ Nuevo Contratista';
      btn.dataset.a = 'cnew';
    } else if (viewName === 'prov') {
      label.textContent = '+ Nuevo Proveedor';
      btn.dataset.a = 'vnew';
    } else if (viewName === 'eq') {
      label.textContent = '+ Nuevo Artículo';
      btn.dataset.a = 'inew';
    } else if (viewName === 'plan') {
      label.textContent = '+ Nueva Nota';
      btn.dataset.a = 'pnota';
    } else {
      label.textContent = '+ Agregar';
      btn.dataset.a = 'wiz';
    }
  }

  // Render view content
  if (viewName === 'desp') renderDespacho();
  else if (viewName === 'cli') renderClientes();
  else if (viewName === 'ini') renderInicio();
  else if (viewName === 'con') renderContratistas();
  else if (viewName === 'prov') renderProveedores();
  else if (viewName === 'eq') renderEquipos();
  else if (viewName === 'hor') renderHoras();
  else if (viewName === 'plan') renderPlan();

  updateStatsBanner();
}

// Event Delegation Centralizado
document.addEventListener('click', e => {
  const target = e.target.closest('[data-a]');
  if (!target) {
    if (STATE.activeMenu) {
      STATE.activeMenu = null;
      renderDespacho();
    }
    return;
  }

  const action = target.dataset.a;
  const id = target.dataset.id;
  const mod = target.dataset.m;

  // Navegación de vistas
  if (action === 'vw') {
    switchView(mod);
    return;
  }

  // Toggle modo Despacho (Kanban vs Grid)
  if (action === 'set-disp-mode') {
    STATE.dispMode = mod;
    $('#btn-kanban').className = mod === 'kanban' ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-bizdark text-white transition-all flex items-center gap-1.5' : 'px-3 py-1.5 rounded-full text-xs font-semibold text-bizmuted hover:text-bizdark transition-all flex items-center gap-1.5';
    $('#btn-grid').className = mod === 'grid' ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-bizdark text-white transition-all flex items-center gap-1.5' : 'px-3 py-1.5 rounded-full text-xs font-semibold text-bizmuted hover:text-bizdark transition-all flex items-center gap-1.5';
    renderDespacho();
    return;
  }

  // Menú contextual ficha
  if (action === 'menu') {
    STATE.activeMenu = STATE.activeMenu === id ? null : id;
    renderDespacho();
    return;
  }

  // Avanzar estado de parada (Ciclo: Pendiente -> En proceso -> Completado)
  if (action === 'cyc') {
    const ficha = F.find(f => f.id === id);
    if (ficha) {
      const stop = ficha.par.find(p => p.id === target.dataset.s);
      if (stop) {
        stop.e = NEXT[stop.e];
        // Si todas están completadas, sugerir completar ficha
        if (ficha.par.every(p => p.e === 'completado')) {
          ficha.est = 'completado';
        }
        renderDespacho();
        updateStatsBanner();
      }
    }
    return;
  }

  // Avanzar estado general de ficha
  if (action === 'adv') {
    const f = F.find(x => x.id === id);
    if (f) {
      const curIdx = FL.findIndex(x => x.id === f.est);
      f.est = FL[Math.min(curIdx + 1, FL.length - 1)].id;
      STATE.activeMenu = null;
      renderDespacho();
      updateStatsBanner();
    }
    return;
  }

  // Duplicar ficha
  if (action === 'dup') {
    const f = F.find(x => x.id === id);
    if (f) {
      const copy = JSON.parse(JSON.stringify(f));
      copy.id = uid();
      copy.cod = 'F-0' + (F.length + 1);
      copy.est = 'borrador';
      copy.par.forEach(p => { p.id = uid(); p.e = 'pendiente'; });
      F.push(copy);
      STATE.activeMenu = null;
      renderDespacho();
      updateStatsBanner();
    }
    return;
  }

  // Eliminar ficha
  if (action === 'del') {
    if (confirm('¿Eliminar esta ficha de despacho?')) {
      F = F.filter(x => x.id !== id);
      STATE.activeMenu = null;
      renderDespacho();
      updateStatsBanner();
    }
    return;
  }

  // Wizard de nueva ficha
  if (action === 'wiz') {
    openWizard();
    return;
  }

  // Enviar por WhatsApp / Ver Hoja de Ruta
  if (action === 'send') {
    const f = F.find(x => x.id === id);
    if (f) openSendModal(f);
    return;
  }

  // Seleccionar cliente en CRM
  if (action === 'lsel') {
    LS.sel = mod;
    renderClientes();
    return;
  }

  // Filtro de chips clientes
  if (action === 'lchip') {
    LS.cat = mod;
    LS.fav = false;
    LS.deuda = false;
    renderClientes();
    return;
  }

  if (action === 'lfavf') {
    LS.fav = !LS.fav;
    LS.cat = 'todos';
    LS.deuda = false;
    renderClientes();
    return;
  }

  if (action === 'ldeuf') {
    LS.deuda = !LS.deuda;
    LS.cat = 'todos';
    LS.fav = false;
    renderClientes();
    return;
  }

  // Modal de Personal
  if (action === 'per') {
    openPersonalModal();
    return;
  }
});

// Búsqueda Global y Filtro de Estado
$('#global-search').addEventListener('input', e => {
  STATE.search = e.target.value;
  LS.q = e.target.value;
  CS.q = VS.q = EQ.q = e.target.value;
  if (STATE.view === 'desp') renderDespacho();
  if (STATE.view === 'cli') renderClientes();
  if (STATE.view === 'con') renderContratistas();
  if (STATE.view === 'prov') renderProveedores();
  if (STATE.view === 'eq') renderEquipos();
  if (STATE.view === 'hor') renderHoras();
});

$('#state-filter').addEventListener('change', e => {
  STATE.stateFilter = e.target.value;
  renderDespacho();
});

// ================= MODALES Y DIALOGS =================

// Modal: Wizard Nueva Ficha
function openWizard() {
  const dlg = $('#dlg-wiz');
  STATE.wizard = { p: 0, v: VEH[0].id, eq: [PER[0].id], s: '' };
  renderWizardStep();
  dlg.showModal();
}

function renderWizardStep() {
  const w = STATE.wizard;
  const body = $('#wiz-body');
  if (!body) return;

  const titles = ['Seleccionar Vehículo', 'Asignar Cuadrilla', 'Primera Parada'];

  body.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">Nueva Ficha de Despacho</h3>
          <p class="text-xs text-bizmuted font-medium">Paso ${w.p + 1} de 3: ${titles[w.p]}</p>
        </div>
        <button onclick="$('#dlg-wiz').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Barra de Pasos -->
      <div class="flex gap-1.5">
        ${[0, 1, 2].map(i => `<div class="h-1.5 flex-1 rounded-full ${i <= w.p ? 'bg-bizdark' : 'bg-bizborder'} transition-all"></div>`).join('')}
      </div>

      <!-- Contenido del Paso -->
      <div class="space-y-3 min-h-[220px]">
        ${w.p === 0 ? `
          <div class="space-y-2">
            ${VEH.map(v => `
              <div onclick="STATE.wizard.v = '${v.id}'; renderWizardStep()" class="p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${w.v === v.id ? 'border-bizdark bg-bizbg font-bold' : 'border-bizborder hover:bg-bizbg'}">
                <div class="flex items-center gap-3">
                  <i data-lucide="${v.k === 'truck' ? 'truck' : v.k === 'bus' ? 'bus' : 'car'}" class="w-4 h-4 text-bizdark"></i>
                  <span class="text-sm">${v.n}</span>
                </div>
                <span class="text-xs text-bizmuted font-semibold">${v.p}</span>
              </div>
            `).join('')}
          </div>
        ` : w.p === 1 ? `
          <div class="space-y-2">
            ${PER.map(p => {
              const isSel = w.eq.includes(p.id);
              return `
                <div onclick="toggleWizardPerson('${p.id}')" class="p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${isSel ? 'border-bizdark bg-bizbg' : 'border-bizborder hover:bg-bizbg'}">
                  <div class="flex items-center gap-3">
                    <span class="w-4 h-4 rounded-full border flex items-center justify-center ${isSel ? 'bg-bizdark text-white border-bizdark' : 'border-bizborder'}">
                      ${isSel ? '<i data-lucide="check" class="w-3 h-3"></i>' : ''}
                    </span>
                    <span class="text-sm font-semibold text-bizdark">${p.n}</span>
                  </div>
                  <span class="text-xs text-bizmuted">${p.r}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="space-y-3">
            <label class="block text-xs font-bold text-bizdark uppercase tracking-wider">Nombre del Primer Sitio / Destino</label>
            <input id="wiz-stop-input" type="text" value="${esc(w.s)}" placeholder="Ej. Almacén Central o Hospital Metropolitano" class="w-full bg-bizbg border border-bizborder rounded-2xl p-3.5 text-sm font-semibold text-bizdark focus:outline-none focus:ring-2 focus:ring-bizdark">
            <p class="text-xs text-bizmuted">Podrás añadir más paradas y optimizar la ruta en cualquier momento.</p>
          </div>
        `}
      </div>

      <!-- Botones de Navegación del Wizard -->
      <div class="flex items-center justify-between pt-3 border-t border-bizborder">
        <button onclick="${w.p === 0 ? `$('#dlg-wiz').close()` : `STATE.wizard.p--; renderWizardStep()`}" class="px-4 py-2 rounded-full border border-bizborder text-xs font-semibold text-bizmuted hover:text-bizdark transition-all">
          ${w.p === 0 ? 'Cancelar' : 'Atrás'}
        </button>

        <button onclick="handleWizardNext()" class="px-5 py-2 rounded-full bg-bizdark text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all">
          ${w.p < 2 ? 'Siguiente' : 'Crear Ficha'}
        </button>
      </div>
    </div>
  `;

  lucide.createIcons();
  const input = $('#wiz-stop-input');
  if (input) {
    input.focus();
    input.addEventListener('input', e => { STATE.wizard.s = e.target.value; });
  }
}

window.toggleWizardPerson = function(id) {
  const eq = STATE.wizard.eq;
  STATE.wizard.eq = eq.includes(id) ? eq.filter(x => x !== id) : [...eq, id];
  renderWizardStep();
};

window.handleWizardNext = function() {
  const w = STATE.wizard;
  if (w.p < 2) {
    w.p++;
    renderWizardStep();
  } else {
    const firstStop = w.s.trim() || 'Primer Punto de Entrega';
    const veh = VEH.find(v => v.id === w.v) || VEH[0];
    const crew = PER.filter(p => w.eq.includes(p.id));

    const newFicha = {
      id: uid(),
      cod: 'F-0' + (F.length + 1),
      veh,
      est: 'borrador',
      mem: crew.length ? crew : [PER[0]],
      par: [{ id: uid(), n: firstStop, t: 'Entrega', e: 'pendiente', h: '08:30' }],
      mod: mods()
    };

    F.push(newFicha);
    $('#dlg-wiz').close();
    renderDespacho();
    updateStatsBanner();
  }
};

// Modal: Enviar Hoja de Ruta por WhatsApp
function openSendModal(f) {
  const body = $('#send-body');
  if (!body) return;

  const dateStr = new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' });
  const msgContent = `*Hoja de ruta ${f.cod}* — ${dateStr}\n🚚 ${f.veh.n} (${f.veh.p})\n\n*Equipo:*\n${f.mem.map(m => `• ${m.n} (${m.r})`).join('\n')}\n\n*Ruta:*\n${f.par.map((p, i) => `${i + 1}. ${p.h ? p.h + ' – ' : ''}${p.n} (${p.t})`).join('\n')}\n\nResponde *OK* para confirmar recepción.`;

  body.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">Hoja de Ruta · ${esc(f.cod)}</h3>
          <p class="text-xs text-bizmuted font-medium">Envío instantáneo por WhatsApp a la cuadrilla</p>
        </div>
        <button onclick="$('#dlg-send').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <textarea id="txt-route-msg" rows="8" readonly class="w-full bg-bizbg border border-bizborder rounded-2xl p-4 text-xs font-mono text-bizdark focus:outline-none resize-none">${esc(msgContent)}</textarea>

      <!-- Miembros de Cuadrilla y Envío Directo -->
      <div class="space-y-2">
        <span class="text-xs font-bold text-bizdark uppercase tracking-wider block">Miembros Asignados</span>
        ${f.mem.map(m => `
          <div class="flex items-center justify-between p-3 rounded-2xl bg-bizbg text-xs">
            <div class="flex items-center gap-3">
              <span class="w-2 h-2 rounded-full ${m.e ? 'bg-emerald-500' : 'bg-amber-400'}"></span>
              <div>
                <p class="font-bold text-bizdark">${esc(m.n)}</p>
                <p class="text-[11px] text-bizmuted">${esc(m.r)} · Tel: ${esc(m.t)}</p>
              </div>
            </div>
            <a target="_blank" rel="noopener" href="https://wa.me/${wa(m.t)}?text=${encodeURIComponent(msgContent)}" class="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>WhatsApp</span>
            </a>
          </div>
        `).join('')}
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-bizborder">
        <button onclick="navigator.clipboard.writeText($('#txt-route-msg').value); alert('Mensaje copiado al portapapeles!')" class="px-4 py-2 rounded-full border border-bizborder text-xs font-bold text-bizdark hover:bg-bizbg transition-all">
          Copiar Texto
        </button>
        <button onclick="$('#dlg-send').close()" class="px-5 py-2 rounded-full bg-bizdark text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all">
          Listo
        </button>
      </div>
    </div>
  `;

  lucide.createIcons();
  $('#dlg-send').showModal();
}

// Modal: Gestión de Personal
function openPersonalModal() {
  const body = $('#per-body');
  if (!body) return;

  body.innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">Personal & Cuadrillas</h3>
          <p class="text-xs text-bizmuted font-medium">Conductores, técnicos y ayudantes registrados</p>
        </div>
        <button onclick="$('#dlg-per').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <div class="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        ${PER.map(p => `
          <div class="flex items-center justify-between p-3 rounded-2xl bg-bizbg text-xs">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-bizdark text-white flex items-center justify-center font-bold text-xs">
                ${ini(p.n)}
              </div>
              <div>
                <p class="font-bold text-bizdark">${esc(p.n)}</p>
                <p class="text-[11px] text-bizmuted">${esc(p.r)} · ${esc(p.t)}</p>
              </div>
            </div>
            <span class="biz-pill ${p.e ? 'pill-emerald' : 'pill-amber'}">${p.e ? 'Activo' : 'Pendiente'}</span>
          </div>
        `).join('')}
      </div>

      <div class="flex justify-end pt-3 border-t border-bizborder">
        <button onclick="$('#dlg-per').close()" class="px-5 py-2 rounded-full bg-bizdark text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all">
          Cerrar
        </button>
      </div>
    </div>
  `;

  lucide.createIcons();
  $('#dlg-per').showModal();
}

// ================= INICIALIZACIÓN =================
function init() {
  renderSidebarMembers();
  switchView('desp');
  updateStatsBanner();
}

window.addEventListener('DOMContentLoaded', init);
