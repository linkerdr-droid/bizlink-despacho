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
  hist: []
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
    } else {
      label.textContent = '+ Agregar';
      btn.dataset.a = 'wiz';
    }
  }

  // Render view content
  if (viewName === 'desp') renderDespacho();
  else if (viewName === 'cli') renderClientes();
  else if (viewName === 'ini') renderInicio();

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
  if (STATE.view === 'desp') renderDespacho();
  if (STATE.view === 'cli') renderClientes();
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
