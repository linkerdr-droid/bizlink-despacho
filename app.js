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

// Imágenes de muestra (evidencias y firma) para los datos de ejemplo
const phImg = (label, c1, c2) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><g fill="none" stroke="#18191d" stroke-opacity=".25" stroke-width="10"><rect x="250" y="160" width="140" height="100" rx="14"/><circle cx="320" cy="210" r="28"/></g><text x="320" y="330" font-family="sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="#18191d" fill-opacity=".6">${label}</text></svg>`);
const SIG_DEMO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="140"><path d="M30 95 C 50 40, 70 40, 80 90 S 110 120, 125 70 S 150 30, 160 85 C 168 110, 185 100, 195 75 S 220 60, 230 90 C 240 115, 260 60, 285 70 S 330 95, 370 60" fill="none" stroke="#18191d" stroke-width="3" stroke-linecap="round"/></svg>');

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

// Datos que ve el cliente en su portal de seguimiento (por parada)
// tok: código único del enlace público · it: conduce digital · fotos: evidencias de la cuadrilla
const PTD = {
  s1: {
    tok: 'pc-a1x9', dir: 'Av. 27 de Febrero #301, Bloque A', srv: 'Entrega de mobiliario de oficina para el área de recepción.',
    it: [{ n: 'Escritorio en L', q: 2, u: 'ud' }, { n: 'Silla ergonómica', q: 6, u: 'ud' }, { n: 'Archivo metálico 4 gavetas', q: 1, u: 'ud' }],
    monto: 38500, pg: true, cal: 5, com: 'Muy puntuales y cuidadosos.',
    fotos: [{ k: 'ini', src: phImg('Inicio · 08:34', '#e0e7ff', '#c7d2fe'), h: '08:34' }, { k: 'fin', src: phImg('Entrega · 09:05', '#dcfce7', '#bbf7d0'), h: '09:05' }],
    firma: { img: SIG_DEMO, n: 'Laura Peña', d: iso(new Date()), h: '09:06' }
  },
  s2: {
    tok: 'csm-7k2q', cli: 'l1', srv: 'Revisión preventiva de la planta eléctrica y prueba de transferencia automática.',
    it: [{ n: 'Revisión de planta Cummins 60 kW', q: 1, u: 'serv.' }, { n: 'Filtro de aceite', q: 1, u: 'ud' }, { n: 'Aceite 15W-40', q: 3, u: 'gal' }],
    monto: 22000, pg: false, fotos: [{ k: 'ini', src: phImg('Inicio · 10:22', '#fef3c7', '#fde68a'), h: '10:22' }]
  },
  s3: {
    tok: 'azf-3m8p', dir: 'Zona Franca Las Américas, Nave 12', srv: 'Recogida de equipos para mantenimiento en taller.',
    it: [{ n: 'Aire acondicionado de ventana', q: 2, u: 'ud' }], monto: 0, pg: false
  },
  s4: {
    tok: 'sn-9q4w', cli: 'l2', srv: 'Entrega e instalación del compresor de la cámara frigorífica.',
    it: [{ n: 'Compresor Copeland 3 HP', q: 1, u: 'ud' }, { n: 'Gas refrigerante R-404A', q: 2, u: 'cil.' }, { n: 'Mano de obra de instalación', q: 1, u: 'serv.' }],
    monto: 54000, pg: false
  },
  s5: {
    tok: 'hca-2v6n', cli: 'l3', srv: 'Mantenimiento preventivo de minisplits del piso 3.',
    it: [{ n: 'Limpieza de minisplit 18 000 BTU', q: 6, u: 'ud' }, { n: 'Revisión de presión de gas', q: 6, u: 'ud' }],
    monto: 24000, pg: true
  },
  s6: {
    tok: 'ots-5r1c', dir: 'Av. Winston Churchill, Torre Sur, piso 4', srv: 'Recogida de documentos y equipos de cómputo para traslado.',
    it: [{ n: 'Cajas de archivo', q: 8, u: 'ud' }, { n: 'Monitores 24"', q: 4, u: 'ud' }], monto: 6500, pg: false,
    fotos: [{ k: 'fin', src: phImg('Carga completa · 08:10', '#e0f2fe', '#bae6fd'), h: '08:10' }],
    firma: { img: SIG_DEMO, n: 'Ramón Díaz', d: iso(new Date()), h: '08:12' }
  }
};
F.forEach(f => f.par.forEach(p => Object.assign(p, PTD[p.id] || {})));

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
// Empresa que usa la app (marca blanca del portal de clientes)
const CE = {
  emp: 'BizLink Logística', logo: '', col: '#6366f1', pay: true,
  banco: 'Banco Popular · Cuenta corriente 812-345678-9\nA nombre de: BizLink Logística SRL · RNC 1-31-45678-9\nEnvíe el comprobante de transferencia por WhatsApp.'
};

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

  const garCount = $('#side-gar-count');
  if (garCount) {
    const n = GAR.filter(g => garSt(g).k === 'pv').length;
    garCount.classList.toggle('hidden', !n);
    garCount.title = `${n} garantía${n === 1 ? '' : 's'} por vencer`;
  }
  const cliCount = $('#side-cli-count');
  if (cliCount) cliCount.textContent = CLI.length;

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
          <div class="absolute right-4 top-14 z-40 w-56 bg-white border border-bizborder rounded-2xl p-1.5 shadow-xl space-y-1">
            <button data-a="send" data-id="${f.id}" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-bizdark hover:bg-bizbg transition-all">
              <i data-lucide="send" class="w-3.5 h-3.5 text-emerald-600"></i>
              <span>Enviar a Cuadrilla</span>
            </button>
            <button data-a="ptview" data-id="${f.id}" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-bizdark hover:bg-bizbg transition-all">
              <i data-lucide="smartphone" class="w-3.5 h-3.5 text-indigo-600"></i>
              <span>Ver vista de cliente</span>
            </button>
            <button data-a="ptcopy" data-id="${f.id}" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-bizdark hover:bg-bizbg transition-all">
              <i data-lucide="link" class="w-3.5 h-3.5 text-indigo-600"></i>
              <span>Copiar link del cliente</span>
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

        ${(() => {
          const cob = f.par.filter(p => !p.pg && p.e !== 'completado').reduce((s, p) => s + (+p.monto || 0), 0);
          return cob ? `
            <button data-a="cfg" data-id="${f.id}" class="w-full flex items-center justify-between text-xs p-2 rounded-xl ${isHighlightedDark ? 'bg-white/5 text-zinc-200' : 'bg-amber-50 text-amber-800'}" title="Ver ítems y cobro">
              <span class="flex items-center gap-1.5 font-semibold"><i data-lucide="banknote" class="w-3.5 h-3.5"></i>Cobrar en sitio</span>
              <b class="${isHighlightedDark ? 'text-white' : ''}">${$m(cob)}</b>
            </button>` : '';
        })()}
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
              ${(() => { const [l, t] = e.g ? docSt(e.g) : ['Sin garantía', 'slate']; return `<span class="biz-pill pill-${t}">${l === 'Vigente' ? 'Garantía vigente' : l}</span>`; })()}
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

// ================= VISTA: GARANTÍAS & POSTVENTA =================
// g: { id, cli, prod, serie, ini, ven, per, tk: [{ fid, sid, d, falla }] }
const GAR = [];
CLI.forEach(c => (c.eq || []).forEach(e => GAR.push({ id: e.id, cli: c.id, prod: e.n + (e.mm ? ' · ' + e.mm : ''), serie: '', ini: e.i, ven: e.g, per: '', tk: [] })));
GAR.push({ id: 'g-l4', cli: 'l4', prod: 'Instalación de luminarias LED', serie: 'Factura B-0142', ini: dAgo(5), ven: addD(dAgo(5), 180), per: '6m', tk: [] });

const GPER = { '3m': ['3 meses', 3], '6m': ['6 meses', 6], '12m': ['1 año', 12], custom: ['Personalizado', 0] };
const GS = { q: '', f: 'todas', form: null };
const TK = { gid: null, falla: '', veh: '', mem: [], h: '09:00' };

const addMeses = (d, n) => { const x = new Date(d + 'T12:00'); x.setMonth(x.getMonth() + n); return iso(x); };
const garCli = g => CLI.find(c => c.id === g.cli);
const garTicket = g => (g.tk || []).map(t => {
  const f = F.find(x => x.id === t.fid), p = f && f.par.find(x => x.id === t.sid);
  return { ...t, f, p, abierto: !!p && p.e !== 'completado' };
}).reverse();

// Estado: reclamo abierto > vencida > por vencer (30 días) > vigente
function garSt(g) {
  const tk = garTicket(g).find(t => t.abierto);
  const n = dias(g.ven);
  if (tk) return { k: 'rec', l: 'Reclamo abierto', t: 'rose', n, tk };
  if (n < 0) return { k: 'venc', l: `Vencida hace ${-n} d`, t: 'rose', n };
  if (n <= 30) return { k: 'pv', l: n === 0 ? 'Vence hoy' : `Vence en ${n} d`, t: 'amber', n };
  return { k: 'vig', l: 'Vigente', t: 'emerald', n };
}

function garVenForm(fm) {
  if (fm.per === 'custom') return (+fm.dias > 0) ? addD(hoy(), +fm.dias) : '';
  return addMeses(hoy(), GPER[fm.per][1]);
}

function garMsg(g) {
  const c = garCli(g) || { n: '' }, s = garSt(g);
  const nom = (c.ct || c.n).split(' ')[0];
  const item = g.prod + (g.serie ? ` (${g.serie})` : '');
  if (s.k === 'venc') return `Hola ${nom}, le escribe ${CE.emp}. La garantía de su ${item} venció el ${fdate(g.ven)}. Le ofrecemos un mantenimiento preventivo para mantenerlo funcionando como nuevo. ¿Le gustaría agendar una visita?`;
  if (s.k === 'pv') return `Hola ${nom}, le escribe ${CE.emp}. Le recordamos que la garantía de su ${item} vence el ${fdate(g.ven)} (en ${s.n} días). Es el momento ideal para un mantenimiento preventivo dentro de la cobertura. ¿Le gustaría agendar una visita?`;
  return `Hola ${nom}, le escribe ${CE.emp}. Le recordamos que su ${item} está cubierto por garantía hasta el ${fdate(g.ven)}. Si nota cualquier falla, escríbanos por aquí y le enviamos un técnico.`;
}

function renderGarantias() {
  const container = $('#gar-content');
  if (!container) return;
  const st = GAR.map(garSt);
  const n = k => st.filter(s => k.includes(s.k)).length;
  const card = (f, label, val, sub, tone, icon) => `
    <button data-a="gfil" data-m="${f}" class="biz-card p-5 text-left flex items-start justify-between gap-3 transition-all ${GS.f === f ? SEL_ON : 'hover:border-bizmuted'}">
      <div>
        <span class="text-xs font-bold text-bizmuted">${label}</span>
        <div class="text-3xl font-extrabold tracking-tight mt-1 ${tone}">${val}</div>
        <p class="text-[11px] font-medium text-bizmuted mt-1">${sub}</p>
      </div>
      <div class="w-9 h-9 rounded-xl bg-bizbg flex items-center justify-center shrink-0"><i data-lucide="${icon}" class="w-4 h-4 ${tone}"></i></div>
    </button>`;

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      ${card('act', '🟢 Activas', n(['vig', 'pv']), 'Garantías dentro de su período', 'text-emerald-600', 'shield-check')}
      ${card('pv', '🟡 Por vencer', n(['pv']), 'Próximos 30 días · oportunidad de mantenimiento', 'text-amber-600', 'calendar-clock')}
      ${card('mal', '🔴 Vencidas / Reclamos', n(['venc', 'rec']), `${n(['rec'])} reclamo${n(['rec']) === 1 ? '' : 's'} abierto${n(['rec']) === 1 ? '' : 's'}`, 'text-rose-600', 'shield-alert')}
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="relative flex-1 min-w-[220px] max-w-md">
        <i data-lucide="search" class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-bizmuted pointer-events-none"></i>
        <input data-f="gsq" value="${esc(GS.q)}" placeholder="Buscar por cliente, producto o serie…" class="w-full bg-white border border-bizborder rounded-full pl-11 pr-4 py-2.5 text-sm font-medium text-bizdark placeholder:text-bizmuted focus:outline-none focus:ring-2 focus:ring-bizdark shadow-sm">
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        ${chip(GS.f === 'todas', 'data-a="gfil" data-m="todas"', `Todas (${GAR.length})`)}
        <button data-a="gnew" class="${BTN_DARK}"><i data-lucide="plus" class="w-4 h-4"></i><span>Registrar garantía</span></button>
      </div>
    </div>

    <div id="gar-list" class="biz-card overflow-hidden">${garList()}</div>
  `;
  lucide.createIcons();
}

function garList() {
  const q = GS.q.toLowerCase().trim();
  const F_ = { todas: () => true, act: s => ['vig', 'pv'].includes(s.k), pv: s => s.k === 'pv', mal: s => ['venc', 'rec'].includes(s.k) };
  const rows = GAR.map(g => ({ g, s: garSt(g), c: garCli(g) || { n: 'Cliente eliminado', t: '' } }))
    .filter(({ g, s, c }) => F_[GS.f](s) && (!q || [c.n, c.ct, c.t, g.prod, g.serie].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => ({ rec: 0, pv: 1, venc: 2, vig: 3 }[a.s.k] - { rec: 0, pv: 1, venc: 2, vig: 3 }[b.s.k]) || a.g.ven.localeCompare(b.g.ven));

  if (!rows.length) return `
    <div class="p-12 text-center space-y-3">
      <i data-lucide="shield" class="w-8 h-8 mx-auto text-bizmuted"></i>
      <p class="text-sm font-semibold text-bizmuted">${GAR.length ? 'No hay garantías con este filtro.' : 'Aún no hay garantías registradas.'}</p>
      ${GAR.length ? '' : `<button data-a="gnew" class="${BTN_DARK} mx-auto"><i data-lucide="plus" class="w-4 h-4"></i>Registrar la primera</button>`}
    </div>`;

  return `
    <div class="hidden lg:grid grid-cols-[1.3fr_1.6fr_1.1fr_1fr_auto] gap-4 px-5 py-3 border-b border-bizborder text-[11px] font-bold text-bizmuted uppercase tracking-wider">
      <span>Cliente</span><span>Producto / servicio</span><span>Cobertura</span><span>Estado</span><span class="w-[212px] text-right">Acciones</span>
    </div>
    <div class="divide-y divide-bizborder">
      ${rows.map(({ g, s, c }) => {
        const total = Math.max(1, dias(g.ven) - dias(g.ini));
        const usado = Math.min(100, Math.max(0, Math.round((-dias(g.ini) / total) * 100)));
        return `
          <div class="grid grid-cols-1 lg:grid-cols-[1.3fr_1.6fr_1.1fr_1fr_auto] gap-3 lg:gap-4 px-5 py-4 items-center hover:bg-bizbg/60 transition-colors">
            <div class="flex items-center gap-3 min-w-0">
              ${avatar(c, 'w-9 h-9 text-xs rounded-full')}
              <div class="min-w-0">
                <p class="text-sm font-bold text-bizdark truncate">${esc(c.n)}</p>
                <p class="text-[11px] text-bizmuted truncate">${esc(c.t || 'Sin teléfono')}</p>
              </div>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-bizdark truncate" title="${esc(g.prod)}">${esc(g.prod)}</p>
              <p class="text-[11px] text-bizmuted truncate">${g.serie ? esc(g.serie) : 'Sin serie / factura'}${g.val != null ? ` · Ref. ${$m(g.val)}` : ''}</p>
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-semibold text-bizdark">${fdate(g.ini)} → ${fdate(g.ven)}</p>
              <div class="w-full h-1.5 bg-bizborder rounded-full overflow-hidden mt-1.5" title="${usado}% del período transcurrido">
                <div class="h-full rounded-full ${s.t === 'rose' ? 'bg-rose-500' : s.t === 'amber' ? 'bg-amber-400' : 'bg-emerald-500'}" style="width: ${usado}%"></div>
              </div>
            </div>
            <div class="flex flex-col items-start gap-1">
              <span class="biz-pill pill-${s.t}">${s.l}</span>
              ${s.tk ? `<button data-a="vw" data-m="desp" class="text-[11px] font-bold text-rose-700 underline">Ticket en ${esc(s.tk.f.cod)} →</button>` : ''}
            </div>
            <div class="flex items-center gap-1.5 lg:justify-end">
              ${c.t
                ? `<a target="_blank" rel="noopener" href="${wlink(c, garMsg(g))}" class="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap" title="Recordatorio / mantenimiento por WhatsApp"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i>Notificar</a>`
                : '<span class="px-3 py-1.5 rounded-full bg-bizbg text-bizmuted text-[11px] font-bold">Sin WhatsApp</span>'}
              <button data-a="gtk" data-id="${g.id}" class="${BTN_MINI} whitespace-nowrap" title="Crear ticket y ficha de despacho"><i data-lucide="wrench" class="w-3.5 h-3.5"></i>Crear ticket</button>
              <button data-a="gdel" data-id="${g.id}" class="p-1.5 text-bizmuted hover:text-rose-600" title="Eliminar garantía"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

const renderGarList = () => { const el = $('#gar-list'); if (el) { el.innerHTML = garList(); lucide.createIcons(); } };

// ---------- Formulario rápido (máximo 4 campos) ----------
function openGarForm() {
  GS.form = { cli: null, cq: '', nuevo: false, nn: '', nt: '', prod: '', cat: null, val: null, serie: '', per: '12m', dias: 30 };
  renderGarForm();
  $('#dlg-gar').showModal();
  setTimeout(() => { const i = $('#gar-cq'); if (i) i.focus(); }, 30);
}

function garCliHTML() {
  const fm = GS.form, c = fm.cli && CLI.find(x => x.id === fm.cli);
  if (c) return `
    <div class="flex items-center justify-between gap-3 p-3 rounded-2xl border-2 border-bizdark bg-bizbg">
      <div class="flex items-center gap-3 min-w-0">
        ${avatar(c, 'w-10 h-10 text-sm rounded-full')}
        <div class="min-w-0">
          <p class="text-sm font-bold text-bizdark truncate">${esc(c.n)}</p>
          <p class="text-[11px] text-bizmuted truncate">${esc(c.t || 'Sin teléfono')}${c.dir ? ' · ' + esc(c.dir) : ''}</p>
        </div>
      </div>
      <button type="button" data-a="gclr" class="${BTN_MINI}">Cambiar</button>
    </div>`;

  if (fm.nuevo) return `
    <div class="p-3 rounded-2xl border border-dashed border-bizdark space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-bizdark uppercase tracking-wider flex items-center gap-1.5"><i data-lucide="user-plus" class="w-3.5 h-3.5"></i>Nuevo cliente</span>
        <button type="button" data-a="gbusca" class="text-[11px] font-bold text-bizmuted underline">Buscar existente</button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input id="gar-nn" data-f="gnn" value="${esc(fm.nn)}" placeholder="Nombre" autocomplete="off" class="${INP}">
        <input data-f="gnt" value="${esc(fm.nt)}" type="tel" placeholder="WhatsApp / teléfono" autocomplete="off" class="${INP}">
      </div>
      <p class="text-[11px] text-bizmuted">Se guardará también en Clientes.</p>
    </div>`;

  return `
    <div class="relative">
      <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-[22px] -translate-y-1/2 text-bizmuted pointer-events-none"></i>
      <input id="gar-cq" data-f="gcq" value="${esc(fm.cq)}" placeholder="Escribe 2 letras del nombre o el teléfono…" autocomplete="off" class="${INP} pl-10">
      <div id="gar-sug" class="mt-2 space-y-1.5">${garSug()}</div>
    </div>`;
}

function garSug() {
  const q = GS.form.cq.trim().toLowerCase(), dig = q.replace(/\D/g, '');
  const nuevo = `<button type="button" data-a="gnuevo" class="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-bizborder text-xs font-bold text-bizdark hover:bg-bizbg"><i data-lucide="user-plus" class="w-4 h-4"></i>+ Nuevo cliente${q ? ` "${esc(GS.form.cq.trim())}"` : ''}</button>`;
  if (q.length < 2) return nuevo;
  const hits = CLI.filter(c => [c.n, c.ct].join(' ').toLowerCase().includes(q) || (dig.length >= 3 && String(c.t || '').includes(dig))).slice(0, 6);
  return hits.map(c => `
    <button type="button" data-a="gpick" data-id="${c.id}" class="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-bizbg hover:bg-bizsubtle text-left transition-colors">
      <span class="flex items-center gap-2.5 min-w-0">
        ${avatar(c, 'w-8 h-8 text-[11px] rounded-full')}
        <span class="min-w-0"><span class="block text-xs font-bold text-bizdark truncate">${esc(c.n)}</span><span class="block text-[11px] text-bizmuted truncate">${esc(c.t || 'Sin teléfono')}${c.z ? ' · ' + esc(c.z) : ''}</span></span>
      </span>
      <span class="text-[11px] font-bold text-bizmuted shrink-0">Elegir</span>
    </button>`).join('') + (hits.length ? '' : '<p class="text-[11px] text-bizmuted px-1">No hay clientes con ese nombre.</p>') + nuevo;
}

function renderGarForm() {
  const fm = GS.form, ven = garVenForm(fm);
  $('#gar-body').innerHTML = `
    <form class="space-y-5" onsubmit="return false">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">Registrar garantía</h3>
          <p class="text-xs text-bizmuted font-medium">Productos o servicios · listo en segundos</p>
        </div>
        <button type="button" onclick="$('#dlg-gar').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>

      <div>
        <span class="block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1.5">1 · Cliente</span>
        <div id="gar-cli">${garCliHTML()}</div>
      </div>

      <div>
        <span class="block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1.5">2 · Producto / servicio cubierto</span>
        <input data-f="gprod" value="${esc(fm.prod)}" placeholder="Escribe o elige del catálogo · ej. Aire Inverter 12k BTU" autocomplete="off" class="${INP}">
        <div id="gar-prod-sug" class="mt-1.5">${garProdHTML()}</div>
      </div>

      <label class="block">
        <span class="block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1.5">3 · Código / serie / factura <span class="normal-case font-semibold">(opcional)</span></span>
        <input data-f="gserie" value="${esc(fm.serie)}" placeholder="Ej. SN-48213 o Factura B-0142" autocomplete="off" class="${INP}">
      </label>

      <div>
        <span class="block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1.5">4 · Período de cobertura</span>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${Object.entries(GPER).map(([k, [l]]) => `<button type="button" data-a="gper" data-m="${k}" class="py-2.5 rounded-2xl text-xs font-bold border transition-all ${fm.per === k ? 'bg-bizdark text-white border-bizdark' : 'bg-white text-bizdark border-bizborder hover:bg-bizbg'}">${l}</button>`).join('')}
        </div>
        ${fm.per === 'custom' ? `
          <div class="flex items-center gap-2 mt-2">
            <input data-f="gdias" type="number" min="1" value="${esc(fm.dias)}" class="${INP} !w-32">
            <span class="text-xs font-semibold text-bizmuted">días</span>
          </div>` : ''}
        <p id="gar-ven" class="text-xs font-semibold text-bizmuted mt-2.5 flex items-center gap-1.5">${garVenHTML(ven)}</p>
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-bizborder">
        <button type="button" onclick="$('#dlg-gar').close()" class="px-4 py-2 rounded-full border border-bizborder text-xs font-semibold text-bizmuted hover:text-bizdark transition-all">Cancelar</button>
        <button type="button" data-a="gsave" class="px-5 py-2 rounded-full bg-bizdark text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all">Guardar garantía</button>
      </div>
    </form>
  `;
  lucide.createIcons();
}

const garVenHTML = ven => ven
  ? `<i data-lucide="calendar-check" class="w-4 h-4 text-emerald-600"></i>Desde hoy hasta el <b class="text-bizdark">${fdate(ven)}</b>`
  : '<i data-lucide="calendar-x" class="w-4 h-4"></i>Indica la cantidad de días';

// Producto vinculado al catálogo (valor de referencia) o sugerencias mientras se escribe
function garProdHTML() {
  const fm = GS.form;
  if (fm.cat) return `
    <div class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
      <span class="font-semibold text-emerald-800 flex items-center gap-1.5"><i data-lucide="tag" class="w-3.5 h-3.5"></i>Vinculado al catálogo · valor de referencia <b>${$m(fm.val)}</b></span>
      <button type="button" data-a="gcatx" class="text-emerald-800 hover:text-rose-600" title="Desvincular"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
    </div>`;
  const q = fm.prod.trim().toLowerCase();
  if (q.length < 2) return '';
  const hits = catActivos().filter(c => c.nombre.toLowerCase().includes(q) && c.nombre.toLowerCase() !== q).slice(0, 4);
  return hits.map(c => `
    <button type="button" data-a="gcat" data-id="${c.id}" class="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-bizbg hover:bg-bizsubtle text-left mb-1">
      <span class="flex items-center gap-2 min-w-0"><i data-lucide="tag" class="w-3.5 h-3.5 text-bizmuted shrink-0"></i><span class="text-xs font-bold text-bizdark truncate">${esc(c.nombre)}</span></span>
      <span class="text-[11px] font-bold text-bizmuted shrink-0">${$m(c.precio_estandar)}</span>
    </button>`).join('');
}
const garRefreshProd = () => { $('#gar-prod-sug').innerHTML = garProdHTML(); lucide.createIcons(); };

const garRefreshCli = () => { $('#gar-cli').innerHTML = garCliHTML(); lucide.createIcons(); };

// ---------- Ticket: convertir garantía en ficha de despacho ----------
function openTicket(g) {
  const c = garCli(g) || {};
  Object.assign(TK, { gid: g.id, falla: '', veh: (VEH[0] || {}).id || '', mem: PER.filter(p => /técnico/i.test(p.r)).slice(0, 1).map(p => p.id), h: '09:00' });
  if (!TK.mem.length && PER[0]) TK.mem = [PER[0].id];
  renderTicket();
  $('#dlg-tkt').showModal();
  setTimeout(() => { const t = $('#tkt-falla'); if (t) t.focus(); }, 30);
}

function renderTicket() {
  const g = GAR.find(x => x.id === TK.gid), c = garCli(g) || { n: '—' }, s = garSt(g);
  const sel = 'w-full bg-bizbg border border-bizborder rounded-xl px-3 py-2 text-xs font-semibold text-bizdark';
  $('#tkt-body').innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">Crear ticket de garantía</h3>
          <p class="text-xs text-bizmuted font-medium">Se crea una ficha de despacho para enviar un técnico</p>
        </div>
        <button onclick="$('#dlg-tkt').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>

      <div class="p-3 rounded-2xl bg-bizbg text-xs space-y-1">
        <div class="flex items-center justify-between gap-2"><b class="text-bizdark">${esc(c.n)}</b><span class="biz-pill pill-${s.t}">${s.l}</span></div>
        <p class="text-bizmuted">${esc(g.prod)}${g.serie ? ' · ' + esc(g.serie) : ''} · cubre hasta ${fdate(g.ven)}${g.val != null ? ` · valor de referencia ${$m(g.val)}` : ''}</p>
        ${s.k === 'venc' ? '<p class="text-rose-700 font-semibold">⚠️ La garantía está vencida: el servicio podría tener costo.</p>' : ''}
      </div>

      <label class="block">
        <span class="block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1">Falla reportada</span>
        <textarea id="tkt-falla" data-f="tfalla" rows="2" placeholder="Ej. No enfría, gotea agua por la unidad interior" class="${INP} resize-none">${esc(TK.falla)}</textarea>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label><span class="block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1">Vehículo</span>
          <select data-f="tveh" class="${sel}">${VEH.map(v => `<option value="${v.id}" ${v.id === TK.veh ? 'selected' : ''}>${esc(v.n)} · ${esc(v.p)}</option>`).join('')}</select>
        </label>
        <label><span class="block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1">Hora estimada</span>
          <input type="time" data-f="th" value="${esc(TK.h)}" class="${sel}">
        </label>
      </div>

      <div>
        <span class="block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1.5">Técnicos</span>
        <div class="flex flex-wrap gap-1.5">
          ${PER.map(p => chip(TK.mem.includes(p.id), `type="button" data-a="tkper" data-id="${p.id}"`, `${TK.mem.includes(p.id) ? '<i data-lucide="check" class="w-3 h-3"></i>' : ''}${esc(p.n.split(' ')[0])} <span class="opacity-60 font-medium">· ${esc(p.r.split(' ')[0])}</span>`)).join('')}
        </div>
      </div>

      <div class="flex items-center justify-between pt-3 border-t border-bizborder">
        <button onclick="$('#dlg-tkt').close()" class="px-4 py-2 rounded-full border border-bizborder text-xs font-semibold text-bizmuted hover:text-bizdark transition-all">Cancelar</button>
        <button data-a="tkok" class="px-5 py-2 rounded-full bg-bizdark text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all flex items-center gap-1.5"><i data-lucide="truck" class="w-3.5 h-3.5"></i>Crear ficha de despacho</button>
      </div>
    </div>
  `;
  lucide.createIcons();
}

const nextCod = () => 'F-' + String(F.reduce((m, f) => Math.max(m, parseInt(String(f.cod).replace(/\D/g, ''), 10) || 0), 0) + 1).padStart(2, '0');

Object.assign(ACT, {
  gnew: () => openGarForm(),
  gfil: t => { GS.f = GS.f === t.dataset.m && t.dataset.m !== 'todas' ? 'todas' : t.dataset.m; renderGarantias(); },
  gpick: t => { GS.form.cli = t.dataset.id; GS.form.nuevo = false; garRefreshCli(); const p = document.querySelector('[data-f="gprod"]'); if (p) p.focus(); },
  gclr: () => { GS.form.cli = null; garRefreshCli(); $('#gar-cq').focus(); },
  gnuevo: () => {
    const q = GS.form.cq.trim(), dig = q.replace(/\D/g, '');
    Object.assign(GS.form, { nuevo: true, nn: dig.length >= 7 ? '' : q, nt: dig.length >= 7 ? q : '' });
    garRefreshCli(); $('#gar-nn').focus();
  },
  gcat: t => {
    const c = CAT.find(x => x.id === t.dataset.id);
    Object.assign(GS.form, { prod: c.nombre, cat: c.id, val: +c.precio_estandar });
    const i = document.querySelector('[data-f="gprod"]'); if (i) i.value = c.nombre;
    garRefreshProd();
    const s = document.querySelector('[data-f="gserie"]'); if (s) s.focus();
  },
  gcatx: () => { GS.form.cat = null; GS.form.val = null; garRefreshProd(); },
  gbusca: () => { GS.form.nuevo = false; garRefreshCli(); $('#gar-cq').focus(); },
  gper: t => { GS.form.per = t.dataset.m; renderGarForm(); if (t.dataset.m === 'custom') { const d = document.querySelector('[data-f="gdias"]'); if (d) { d.focus(); d.select(); } } },
  gsave: () => {
    const fm = GS.form;
    if (!fm.cli && !fm.nuevo) return toast('Elige un cliente o crea uno nuevo', 'rose');
    if (fm.nuevo && (!fm.nn.trim() || fm.nt.replace(/\D/g, '').length < 7)) return toast('Escribe el nombre y un teléfono válido del cliente', 'rose');
    if (!fm.prod.trim()) return toast('Indica el producto o servicio cubierto', 'rose');
    const ven = garVenForm(fm);
    if (!ven) return toast('Indica la cantidad de días de cobertura', 'rose');

    let c = fm.cli && CLI.find(x => x.id === fm.cli);
    if (!c) {
      c = { id: uid(), n: fm.nn.trim(), tp: 'Persona', ct: '', t: fm.nt.replace(/\D/g, ''), t2: '', em: '', dir: '', z: '', ref: '', ml: '', hor: '', pago: 0, desc: 0, lim: 0, est: 'act', fav: false, f: '', nota: 'Creado desde Garantías.', h: [], eq: [] };
      CLI.push(c);
    }
    const g = { id: uid(), cli: c.id, prod: fm.prod.trim(), serie: fm.serie.trim(), ini: hoy(), ven, per: fm.per === 'custom' ? fm.dias + 'd' : fm.per, tk: [], cat: fm.cat || null, val: fm.val ?? null };
    GAR.push(g);
    (c.eq = c.eq || []).push({ id: g.id, n: g.prod, mm: g.serie, i: g.ini, g: g.ven });
    $('#dlg-gar').close();
    GS.f = 'todas';
    renderGarantias();
    const sc = $('#side-cli-count'); if (sc) sc.textContent = CLI.length;
    toast(`Garantía registrada para ${c.n} · vence ${fdate(ven)}`);
  },
  gdel: t => {
    const g = GAR.find(x => x.id === t.dataset.id);
    if (!g || !confirm(`¿Eliminar la garantía de "${g.prod}"?`)) return;
    GAR.splice(GAR.indexOf(g), 1);
    const c = garCli(g); if (c && c.eq) c.eq = c.eq.filter(e => e.id !== g.id);
    renderGarantias();
  },
  gtk: t => openTicket(GAR.find(x => x.id === t.dataset.id)),
  tkper: t => { const id = t.dataset.id; TK.mem = TK.mem.includes(id) ? TK.mem.filter(x => x !== id) : [...TK.mem, id]; renderTicket(); },
  tkok: () => {
    const g = GAR.find(x => x.id === TK.gid), c = garCli(g) || { n: 'Cliente', dir: '' };
    if (!TK.falla.trim()) return toast('Describe la falla reportada', 'rose');
    if (!TK.mem.length) return toast('Asigna al menos un técnico', 'rose');
    const stop = {
      id: uid(), n: c.n, t: 'Garantía', e: 'pendiente', h: TK.h, cli: c.id || null,
      srv: `Revisión en garantía: ${g.prod}${g.serie ? ' (' + g.serie + ')' : ''}. Falla reportada: ${TK.falla.trim()}`,
      it: [{ n: g.prod, q: 1, u: g.serie || 'ud' }], monto: 0, pg: true, fotos: []
    };
    const f = {
      id: uid(), cod: nextCod(), veh: VEH.find(v => v.id === TK.veh) || VEH[0], est: 'asignado',
      mem: PER.filter(p => TK.mem.includes(p.id)), par: [stop], mod: mods(['evidencia', 'firmas'])
    };
    F.push(f);
    (g.tk = g.tk || []).push({ fid: f.id, sid: stop.id, d: hoy(), falla: TK.falla.trim() });
    $('#dlg-tkt').close();
    renderGarantias(); updateStatsBanner();
    toast(`Ticket creado: ficha ${f.cod} asignada a ${f.mem.map(m => m.n.split(' ')[0]).join(', ')}`);
  }
});

Object.assign(FLD, {
  gsq: el => { GS.q = el.value; renderGarList(); },
  gcq: el => { GS.form.cq = el.value; $('#gar-sug').innerHTML = garSug(); lucide.createIcons(); },
  gnn: el => { GS.form.nn = el.value; },
  gnt: el => { GS.form.nt = el.value; },
  gprod: el => {
    GS.form.prod = el.value;
    if (GS.form.cat) { const c = CAT.find(x => x.id === GS.form.cat); if (!c || c.nombre !== el.value) { GS.form.cat = null; GS.form.val = null; } }
    garRefreshProd();
  },
  gserie: el => { GS.form.serie = el.value; },
  gdias: el => { GS.form.dias = el.value; $('#gar-ven').innerHTML = garVenHTML(garVenForm(GS.form)); lucide.createIcons(); },
  tfalla: el => { TK.falla = el.value; },
  tveh: el => { TK.veh = el.value; },
  th: el => { TK.h = el.value; }
});

// Enter en el buscador de clientes: elegir la primera sugerencia
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.matches('#gar-cq')) return;
  e.preventDefault();
  const b = document.querySelector('#gar-sug [data-a="gpick"]') || document.querySelector('#gar-sug [data-a="gnuevo"]');
  if (b) b.click();
});

// ================= VISTA: CATÁLOGO & SERVICIOS (lista de precios operativa) =================
// Tabla propia en Supabase: catalogo_servicios (ver supabase/migraciones/002_catalogo.sql)
const KCAT = {
  'Servicio': ['violet', 'wrench', 'serv.'],
  'Producto': ['sky', 'package', 'ud'],
  'Flete / Logística': ['amber', 'truck', 'viaje'],
  'Paquete / Combo': ['emerald', 'boxes', 'paq.']
};
const CAT = [];
const KS = { q: '', cat: 'todas', missing: false };
const CAT_DEMO = [
  { nombre: 'Instalación de Aire 12K BTU', categoria: 'Servicio', precio_estandar: 6500, precio_minimo: 5500, descripcion_whatsapp: 'Instalación completa de aire de 12 000 BTU: soporte, tubería de cobre hasta 3 m, drenaje y prueba de funcionamiento.' },
  { nombre: 'Mantenimiento preventivo de minisplit', categoria: 'Servicio', precio_estandar: 2500, precio_minimo: 2000, descripcion_whatsapp: 'Limpieza profunda de unidad interior y exterior, revisión de presión de gas y prueba eléctrica.' },
  { nombre: 'Aire acondicionado Inverter 12K BTU', categoria: 'Producto', precio_estandar: 32900, precio_minimo: 30500, descripcion_whatsapp: 'Equipo Inverter de 12 000 BTU, bajo consumo, con control remoto. Garantía de 1 año.' },
  { nombre: 'Cámara IP HD', categoria: 'Producto', precio_estandar: 3800, precio_minimo: 3300, descripcion_whatsapp: 'Cámara IP Full HD con visión nocturna y acceso desde el celular.' },
  { nombre: 'Flete Zona Norte', categoria: 'Flete / Logística', precio_estandar: 1500, precio_minimo: 1200, descripcion_whatsapp: 'Entrega en Zona Norte (Villa Mella, Los Prados y alrededores) el mismo día.' },
  { nombre: 'Flete Santo Domingo Este', categoria: 'Flete / Logística', precio_estandar: 1200, precio_minimo: 1000, descripcion_whatsapp: 'Entrega en Santo Domingo Este en 24 horas.' },
  { nombre: 'Kit 4 cámaras + DVR instalado', categoria: 'Paquete / Combo', precio_estandar: 24500, precio_minimo: 22000, descripcion_whatsapp: '4 cámaras HD, DVR de 4 canales, disco de 1 TB, cableado e instalación. Acceso desde el celular.' }
];

const catActivos = () => CAT.filter(x => x.estado !== 'Inactivo');
const catUnidad = c => (KCAT[c.categoria] || KCAT.Servicio)[2];
const catPill = c => { const [t, i] = KCAT[c.categoria] || KCAT.Servicio; return `<span class="biz-pill pill-${t}"><i data-lucide="${i}" class="w-3 h-3"></i>${esc(c.categoria)}</span>`; };
const catMsg = c => `*${c.nombre}*\n${c.descripcion_whatsapp ? c.descripcion_whatsapp + '\n' : ''}💵 Precio: ${$m(c.precio_estandar)}\n— ${CE.emp}`;
const sortCat = () => CAT.sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre, 'es'));
const catEnNube = () => typeof DB !== 'undefined' && DB.ready && !KS.missing;

async function loadCatalog() {
  const { data, error } = await DB.sb.from('catalogo_servicios').select('*').eq('empresa_id', DB.emp).order('nombre');
  if (error) {
    console.error(error);
    KS.missing = /catalogo_servicios|schema cache|does not exist/i.test(error.message);
    return;
  }
  KS.missing = false;
  replaceArr(CAT, data);
  sortCat();
}

// Guarda en Supabase (o en memoria si no hay conexión / falta la tabla)
async function catSave(row, id) {
  if (!catEnNube()) {
    if (id) Object.assign(CAT.find(x => x.id === id), row);
    else CAT.push({ id: uid(), created_at: new Date().toISOString(), estado: 'Activo', ...row });
    sortCat();
    return true;
  }
  const q = id
    ? DB.sb.from('catalogo_servicios').update(row).eq('id', id).select().single()
    : DB.sb.from('catalogo_servicios').insert({ ...row, empresa_id: DB.emp }).select().single();
  const { data, error } = await q;
  if (error) { toast('No se pudo guardar: ' + error.message, 'rose'); return false; }
  const i = CAT.findIndex(x => x.id === data.id);
  if (i >= 0) CAT[i] = data; else CAT.push(data);
  sortCat();
  return true;
}

async function catSeed() {
  if (!catEnNube()) { CAT_DEMO.forEach(x => CAT.push({ id: uid(), estado: 'Activo', created_at: new Date().toISOString(), ...x })); sortCat(); return; }
  const { data, error } = await DB.sb.from('catalogo_servicios').insert(CAT_DEMO.map(x => ({ ...x, empresa_id: DB.emp }))).select();
  if (error) return toast('No se pudo cargar el catálogo de ejemplo: ' + error.message, 'rose');
  data.forEach(x => { if (!CAT.some(y => y.id === x.id)) CAT.push(x); });
  sortCat();
}

// Cambios del catálogo hechos por otros usuarios
function onCatalogo({ eventType, new: nw, old }) {
  if (eventType === 'DELETE') { const i = CAT.findIndex(x => x.id === old.id); if (i >= 0) CAT.splice(i, 1); }
  else { const i = CAT.findIndex(x => x.id === nw.id); if (i >= 0) CAT[i] = nw; else CAT.push(nw); sortCat(); }
  if (STATE.view === 'cat') rerenderAll();
}

function renderCatalogo() {
  const container = $('#cat-content');
  if (!container) return;
  const cats = Object.keys(KCAT);
  container.innerHTML = `
    ${KS.missing ? `
      <div class="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-xs text-amber-900 font-semibold flex items-start gap-2">
        <i data-lucide="database-zap" class="w-4 h-4 shrink-0"></i>
        <span>Falta crear la tabla del catálogo en Supabase: ejecuta <b>supabase/migraciones/002_catalogo.sql</b> en el SQL Editor. Mientras tanto, los cambios del catálogo no se guardan.</span>
      </div>` : ''}

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="relative flex-1 min-w-[220px] max-w-md">
        <i data-lucide="search" class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-bizmuted pointer-events-none"></i>
        <input data-f="ksq" value="${esc(KS.q)}" placeholder="Buscar por nombre o categoría…" class="w-full bg-white border border-bizborder rounded-full pl-11 pr-4 py-2.5 text-sm font-medium text-bizdark placeholder:text-bizmuted focus:outline-none focus:ring-2 focus:ring-bizdark shadow-sm">
      </div>
      <button data-a="catnew" class="${BTN_DARK}"><i data-lucide="plus" class="w-4 h-4"></i><span>Nuevo ítem</span></button>
    </div>

    <div class="flex items-center gap-2 flex-wrap">
      ${chip(KS.cat === 'todas', 'data-a="catchip" data-m="todas"', `Todos (${CAT.length})`)}
      ${cats.map(c => chip(KS.cat === c, `data-a="catchip" data-m="${esc(c)}"`, `<i data-lucide="${KCAT[c][1]}" class="w-3.5 h-3.5"></i>${esc(c)} (${CAT.filter(x => x.categoria === c).length})`)).join('')}
    </div>

    <div id="cat-list" class="biz-card overflow-hidden">${catList()}</div>
  `;
  lucide.createIcons();
}

function catList() {
  const q = KS.q.toLowerCase().trim();
  const rows = CAT.filter(c => (KS.cat === 'todas' || c.categoria === KS.cat) && (!q || [c.nombre, c.categoria, c.descripcion_whatsapp].join(' ').toLowerCase().includes(q)));
  if (!rows.length) return `
    <div class="p-12 text-center space-y-3">
      <i data-lucide="tag" class="w-8 h-8 mx-auto text-bizmuted"></i>
      <p class="text-sm font-semibold text-bizmuted">${CAT.length ? 'No hay ítems con esta búsqueda.' : 'Tu catálogo está vacío.'}</p>
      ${CAT.length ? '' : `
        <div class="flex items-center justify-center gap-2 flex-wrap">
          <button data-a="catnew" class="${BTN_DARK}"><i data-lucide="plus" class="w-4 h-4"></i>Crear el primero</button>
          <button data-a="catdemo" class="${BTN}"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i>Cargar ejemplos</button>
        </div>`}
    </div>`;
  return `
    <div class="hidden lg:grid grid-cols-[2fr_1fr_0.8fr_0.8fr_auto] gap-4 px-5 py-3 border-b border-bizborder text-[11px] font-bold text-bizmuted uppercase tracking-wider">
      <span>Nombre</span><span>Categoría</span><span class="text-right">Precio estándar</span><span class="text-right">Precio mínimo</span><span class="w-[178px] text-right">Acciones</span>
    </div>
    <div class="divide-y divide-bizborder">
      ${rows.map(c => `
        <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr_0.8fr_0.8fr_auto] gap-2 lg:gap-4 px-5 py-4 items-center hover:bg-bizbg/60 transition-colors ${c.estado === 'Inactivo' ? 'opacity-60' : ''}">
          <div class="min-w-0">
            <p class="text-sm font-bold text-bizdark truncate">${esc(c.nombre)} ${c.estado === 'Inactivo' ? '<span class="biz-pill pill-slate !text-[10px] ml-1">Inactivo</span>' : ''}</p>
            <p class="text-[11px] text-bizmuted truncate" title="${esc(c.descripcion_whatsapp || '')}">${esc(c.descripcion_whatsapp || 'Sin descripción para WhatsApp')}</p>
          </div>
          <div>${catPill(c)}</div>
          <p class="text-sm font-extrabold text-bizdark lg:text-right">${$m(c.precio_estandar)}</p>
          <p class="text-xs font-semibold text-bizmuted lg:text-right">${c.precio_minimo != null ? $m(c.precio_minimo) : '—'}</p>
          <div class="flex items-center gap-1.5 lg:justify-end">
            <button data-a="catcopy" data-id="${c.id}" class="px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap" title="Copiar texto para WhatsApp"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i>Copiar info WhatsApp</button>
            <button data-a="catedit" data-id="${c.id}" class="p-1.5 text-bizmuted hover:text-bizdark" title="Editar"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
            <button data-a="catdel" data-id="${c.id}" class="p-1.5 text-bizmuted hover:text-rose-600" title="Eliminar"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
          </div>
        </div>`).join('')}
    </div>`;
}

const renderCatList = () => { const el = $('#cat-list'); if (el) { el.innerHTML = catList(); lucide.createIcons(); } };

function catForm(c) {
  formDlg('cat', c ? 'Editar ítem' : 'Nuevo ítem', c ? esc(c.nombre) : 'Producto, servicio, flete o combo de tu lista de precios', [
    { k: 'nombre', l: 'Nombre', v: c?.nombre, full: 1, ph: 'Ej. Instalación de Aire 12K BTU' },
    { k: 'categoria', l: 'Categoría', v: c?.categoria || 'Servicio', full: 1, opts: Object.keys(KCAT).map(x => [x, x]) },
    { k: 'precio_estandar', l: 'Precio estándar', type: 'number', v: c?.precio_estandar ?? '', full: 1, ph: '0.00' },
    { k: 'precio_minimo', l: 'Precio mínimo (opcional · límite para descuentos)', type: 'number', v: c?.precio_minimo ?? '', full: 1, ph: 'Sin mínimo' },
    { k: 'descripcion_whatsapp', l: 'Descripción para WhatsApp', type: 'textarea', v: c?.descripcion_whatsapp, full: 1 },
    ...(c ? [{ k: 'estado', l: 'Estado', v: c.estado || 'Activo', full: 1, opts: [['Activo', 'Activo'], ['Inactivo', 'Inactivo (no aparece al armar fichas)']] }] : [])
  ], 'catsave', c ? c.id : '');
  $$('#frm-cat input[type="number"]').forEach(i => { i.step = '0.01'; i.min = '0'; });
}

// ---------- Editor de ítems con total a cobrar (fichas de despacho) ----------
// Líneas: { cat, n, q, u, pu, min }
const LN = { lines: [], q: '' };
const lnTotal = () => LN.lines.reduce((s, l) => s + (+l.q || 0) * (+l.pu || 0), 0);
const lnBajoMin = l => l.min != null && +l.pu < +l.min;

function lnHTML() {
  LN.q = '';
  return `
    <div class="space-y-2.5">
      ${secTitle('Ítems y servicios', '<span class="text-[11px] font-semibold text-bizmuted normal-case tracking-normal">desde el catálogo</span>')}
      <div class="relative">
        <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-[22px] -translate-y-1/2 text-bizmuted pointer-events-none"></i>
        <input id="ln-q" data-f="lnq" autocomplete="off" placeholder="Buscar producto, servicio o flete…" class="${INP} pl-10">
        <div id="ln-sug" class="mt-1.5 space-y-1"></div>
      </div>
      <div id="ln-box">${lnRows()}</div>
    </div>`;
}

function lnRows() {
  const total = `
    <div class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-bizdark text-white mt-2">
      <span class="text-xs font-bold flex items-center gap-1.5"><i data-lucide="banknote" class="w-4 h-4"></i>Total a cobrar en sitio / contra entrega</span>
      <b id="ln-total" class="text-lg font-extrabold tracking-tight">${$m(lnTotal())}</b>
    </div>`;
  if (!LN.lines.length) return '<p class="text-xs text-bizmuted p-3 rounded-2xl bg-bizbg">Sin ítems. Busca en el catálogo para agregar productos, servicios o fletes.</p>' + total;
  return `
    <div class="space-y-1.5">
      ${LN.lines.map((l, i) => `
        <div class="p-2.5 rounded-2xl bg-bizbg">
          <div class="grid grid-cols-[1fr_58px_96px_auto] gap-2 items-center">
            <div class="min-w-0">
              <p class="text-xs font-bold text-bizdark truncate" title="${esc(l.n)}">${esc(l.n)}</p>
              <p id="ln-sub-${i}" class="text-[11px] text-bizmuted">${esc(l.u || 'ud')} · ${$m((+l.q || 0) * (+l.pu || 0))}</p>
            </div>
            <input type="number" min="1" step="1" value="${esc(l.q)}" data-f="lnqty" data-i="${i}" title="Cantidad" class="w-full bg-white border border-bizborder rounded-xl px-2 py-1.5 text-xs font-bold text-bizdark text-center">
            <input type="number" min="0" step="0.01" value="${esc(l.pu)}" data-f="lnpu" data-i="${i}" title="Precio unitario" class="w-full bg-white border border-bizborder rounded-xl px-2 py-1.5 text-xs font-bold text-bizdark text-right">
            <button type="button" data-a="lnrm" data-i="${i}" class="p-1 text-bizmuted hover:text-rose-600" title="Quitar"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
          </div>
          <p id="ln-warn-${i}" class="text-[11px] font-bold text-amber-700 mt-1 ${lnBajoMin(l) ? '' : 'hidden'}">⚠️ Por debajo del precio mínimo (${$m(l.min)})</p>
        </div>`).join('')}
    </div>` + total;
}

function lnSug() {
  const q = LN.q.trim().toLowerCase();
  if (!q) return '';
  const hits = catActivos().filter(c => [c.nombre, c.categoria].join(' ').toLowerCase().includes(q)).slice(0, 6);
  return `
    <div class="p-1.5 rounded-2xl border border-bizborder bg-white shadow-lg space-y-1">
      ${hits.map(c => `
        <button type="button" data-a="lnadd" data-id="${c.id}" class="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-bizbg text-left">
          <span class="flex items-center gap-2 min-w-0"><i data-lucide="${(KCAT[c.categoria] || KCAT.Servicio)[1]}" class="w-4 h-4 text-bizmuted shrink-0"></i><span class="text-xs font-bold text-bizdark truncate">${esc(c.nombre)}</span></span>
          <span class="text-xs font-extrabold text-bizdark shrink-0">${$m(c.precio_estandar)}</span>
        </button>`).join('')}
      ${hits.length ? '' : `<p class="text-[11px] text-bizmuted px-3 py-1">${CAT.length ? 'No está en el catálogo.' : 'El catálogo está vacío.'}</p>`}
      <button type="button" data-a="lnfree" class="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-bizbg text-left text-[11px] font-bold text-bizmuted">
        <i data-lucide="plus" class="w-3.5 h-3.5"></i>Agregar "${esc(LN.q.trim())}" como ítem libre
      </button>
    </div>`;
}

const lnRefresh = () => { const b = $('#ln-box'); if (b) { b.innerHTML = lnRows(); lucide.createIcons(); } };
const lnPick = () => { const q = $('#ln-q'); if (q) { q.value = ''; q.focus(); } LN.q = ''; $('#ln-sug').innerHTML = ''; lnRefresh(); };
// Convierte las líneas a los ítems de la parada (conduce) y su monto
const lnApply = p => {
  p.it = LN.lines.map(({ cat, n, q, u, pu, min }) => ({ cat: cat || null, n, q: +q || 1, u: u || 'ud', pu: +pu || 0, min: min ?? null }));
  p.monto = lnTotal();
};
// Ítems viejos sin precio: se conserva el monto acordado como una línea aparte
function lnLoad(p) {
  LN.lines = (p.it || []).map(x => ({ ...x, pu: x.pu ?? 0 }));
  const conPrecio = lnTotal();
  if ((+p.monto || 0) > conPrecio) LN.lines.push({ cat: null, n: 'Cargo acordado (sin desglose)', q: 1, u: 'serv.', pu: +p.monto - conPrecio, min: null });
}

// ---------- Ajustes & Paradas de una ficha (ítems y cobro por parada) ----------
const CFG = { fid: null, sid: null, pg: false };
const cfgCur = () => { const f = F.find(x => x.id === CFG.fid); return [f, f && f.par.find(x => x.id === CFG.sid)]; };

function openCfg(fid) {
  const f = F.find(x => x.id === fid);
  if (!f) return;
  if (!f.par.length) return toast('Esta ficha no tiene paradas', 'rose');
  CFG.fid = f.id;
  cfgSelect((f.par.find(x => x.e !== 'completado') || f.par[0]).id);
  renderCfg();
  $('#dlg-cfg').showModal();
}

function cfgSelect(sid) {
  CFG.sid = sid;
  const [, p] = cfgCur();
  lnLoad(p);
  CFG.pg = !!p.pg;
}

function renderCfg() {
  const [f, p] = cfgCur();
  $('#cfg-body').innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">Ajustes & Paradas · ${esc(f.cod)}</h3>
          <p class="text-xs text-bizmuted font-medium">${esc(f.veh.n)} · ${esc(f.veh.p)} · ítems y cobro por parada</p>
        </div>
        <button onclick="$('#dlg-cfg').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>

      <div class="flex gap-2 flex-wrap">
        ${f.par.map((x, i) => `
          <button data-a="cfgstop" data-id="${x.id}" class="px-3 py-2 rounded-2xl border text-left transition-all ${x.id === p.id ? 'bg-bizdark text-white border-bizdark' : 'bg-white border-bizborder hover:bg-bizbg'}">
            <span class="block text-xs font-bold truncate max-w-[180px]">${i + 1}. ${esc(x.n)}</span>
            <span class="block text-[11px] ${x.id === p.id ? 'text-zinc-300' : 'text-bizmuted'}">${x.monto ? $m(x.monto) + (x.pg ? ' · pagado' : '') : 'Sin cobro'}</span>
          </button>`).join('')}
      </div>

      ${lnHTML()}

      <label class="flex items-center gap-2 text-xs font-semibold text-bizdark cursor-pointer">
        <input type="checkbox" data-f="cfgpg" ${CFG.pg ? 'checked' : ''} class="w-4 h-4 accent-[#18191d]">El cliente ya pagó (no cobrar en sitio)
      </label>

      <div class="flex items-center justify-between pt-3 border-t border-bizborder">
        <button onclick="$('#dlg-cfg').close()" class="px-4 py-2 rounded-full border border-bizborder text-xs font-semibold text-bizmuted hover:text-bizdark transition-all">Cancelar</button>
        <button data-a="cfgsave" class="px-5 py-2 rounded-full bg-bizdark text-white text-xs font-bold shadow-sm hover:bg-neutral-800 transition-all">Guardar</button>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function cfgGuardarActual() {
  const [, p] = cfgCur();
  if (!p) return;
  lnApply(p);
  p.pg = CFG.pg;
}

Object.assign(ACT, {
  // Catálogo
  catnew: () => catForm(null),
  catedit: t => catForm(CAT.find(x => x.id === t.dataset.id)),
  catchip: t => { KS.cat = t.dataset.m; renderCatalogo(); },
  catcopy: t => {
    const c = CAT.find(x => x.id === t.dataset.id);
    navigator.clipboard.writeText(catMsg(c)).then(() => toast(`Info de "${c.nombre}" copiada`), () => toast('No se pudo copiar', 'rose'));
  },
  catsave: async t => {
    const d = readForm('cat'), id = t.dataset.id;
    if (!d.nombre) return toast('Escribe el nombre del ítem', 'rose');
    const pe = parseFloat(d.precio_estandar);
    if (d.precio_estandar === '' || !(pe >= 0)) return toast('Indica el precio estándar', 'rose');
    const pm = d.precio_minimo === '' ? null : parseFloat(d.precio_minimo);
    if (pm != null && (!(pm >= 0) || pm > pe)) return toast('El precio mínimo no puede ser mayor que el estándar', 'rose');
    const row = { nombre: d.nombre, categoria: d.categoria, precio_estandar: pe, precio_minimo: pm, descripcion_whatsapp: d.descripcion_whatsapp || null };
    if (d.estado) row.estado = d.estado;
    t.disabled = true;
    const ok = await catSave(row, id);
    t.disabled = false;
    if (!ok) return;
    closeDlg('dlg-cat');
    renderCatalogo();
    toast(id ? 'Ítem actualizado' : 'Ítem agregado al catálogo');
  },
  catdel: async t => {
    const c = CAT.find(x => x.id === t.dataset.id);
    if (!c || !confirm(`¿Eliminar "${c.nombre}" del catálogo?\n\nLas fichas y garantías que ya lo usan no cambian.`)) return;
    if (catEnNube()) {
      const { error } = await DB.sb.from('catalogo_servicios').delete().eq('id', c.id);
      if (error) return toast('No se pudo eliminar: ' + error.message, 'rose');
    }
    CAT.splice(CAT.indexOf(c), 1);
    renderCatalogo();
  },
  catdemo: async t => { t.disabled = true; await catSeed(); renderCatalogo(); toast('Catálogo de ejemplo cargado'); },

  // Editor de ítems
  lnadd: t => {
    const c = CAT.find(x => x.id === t.dataset.id);
    const ya = LN.lines.find(l => l.cat === c.id);
    if (ya) ya.q = (+ya.q || 0) + 1;
    else LN.lines.push({ cat: c.id, n: c.nombre, q: 1, u: catUnidad(c), pu: +c.precio_estandar, min: c.precio_minimo });
    lnPick();
  },
  lnfree: () => { LN.lines.push({ cat: null, n: LN.q.trim(), q: 1, u: 'ud', pu: 0, min: null }); lnPick(); },
  lnrm: t => { LN.lines.splice(+t.dataset.i, 1); lnRefresh(); },

  // Ajustes & Paradas
  cfg: t => { STATE.activeMenu = null; renderDespacho(); openCfg(t.dataset.id); },
  cfgstop: t => { cfgGuardarActual(); cfgSelect(t.dataset.id); renderCfg(); },
  cfgsave: () => {
    cfgGuardarActual();
    const [f] = cfgCur();
    closeDlg('dlg-cfg');
    renderDespacho(); updateStatsBanner(); refreshPortal();
    const cob = f.par.filter(x => !x.pg).reduce((s, x) => s + (+x.monto || 0), 0);
    toast(`${f.cod} actualizada · cobrar en sitio ${$m(cob)}`);
  }
});

Object.assign(FLD, {
  ksq: el => { KS.q = el.value; renderCatList(); },
  lnq: el => { LN.q = el.value; $('#ln-sug').innerHTML = lnSug(); lucide.createIcons(); },
  lnqty: el => { const l = LN.lines[+el.dataset.i]; l.q = Math.max(0, +el.value || 0); lnLineRefresh(+el.dataset.i); },
  lnpu: el => { const l = LN.lines[+el.dataset.i]; l.pu = Math.max(0, +el.value || 0); lnLineRefresh(+el.dataset.i); },
  cfgpg: el => { CFG.pg = el.checked; }
});

function lnLineRefresh(i) {
  const l = LN.lines[i];
  $(`#ln-sub-${i}`).textContent = `${l.u || 'ud'} · ${$m((+l.q || 0) * (+l.pu || 0))}`;
  $(`#ln-warn-${i}`).classList.toggle('hidden', !lnBajoMin(l));
  $('#ln-total').textContent = $m(lnTotal());
}

// Enter en el buscador del catálogo: agregar la primera sugerencia
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.matches('#ln-q')) return;
  e.preventDefault();
  const b = document.querySelector('#ln-sug [data-a="lnadd"]') || document.querySelector('#ln-sug [data-a="lnfree"]');
  if (b) b.click();
});

// ================= SUPABASE: PERSISTENCIA, LOGIN Y TIEMPO REAL =================
// La clave "anon" es pública por diseño: la seguridad la dan las políticas RLS (ver supabase/schema.sql).
const SB_URL = 'https://jhmvliungidqdojsaamy.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobXZsaXVuZ2lkcWRvanNhYW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2OTU3NzIsImV4cCI6MjEwODI3MTc3Mn0.rNWiqri8cnsgp37GUJJuVFrX3xzY1Dl5jP1CyND-mX0';
const DB = {
  on: !!(window.supabase && SB_URL && SB_KEY),
  sb: null, ready: false, uid: null, email: '', emp: null,   // emp: id de la empresa del usuario
  saved: new Map(),   // "tipo:id" → JSON guardado (para enviar solo lo que cambió)
  snaps: new Map(),   // tok → JSON del seguimiento publicado
  ch: new Map(),      // canales de difusión por enlace de cliente
  busy: false, again: false, timer: null, err: false
};
if (DB.on) DB.sb = window.supabase.createClient(SB_URL, SB_KEY);

// Código aleatorio largo para enlaces públicos (no adivinable)
const rtok = () => Array.from(crypto.getRandomValues(new Uint8Array(15)), b => (b % 36).toString(36)).join('');

// JSON con llaves ordenadas: Postgres reordena las llaves de jsonb y así comparamos sin falsos cambios
const stable = v => v === null || typeof v !== 'object' ? JSON.stringify(v)
  : Array.isArray(v) ? '[' + v.map(x => stable(x === undefined ? null : x)).join(',') + ']'
  : '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';

const replaceArr = (arr, docs) => arr.splice(0, arr.length, ...docs);

// Colecciones que se guardan: cómo leerlas como documentos y cómo reemplazarlas
const COL = {
  personal: { get: () => PER, set: d => replaceArr(PER, d) },
  vehiculos: { get: () => VEH, set: d => replaceArr(VEH, d) },
  clientes: { get: () => CLI, set: d => replaceArr(CLI, d) },
  contratistas: { get: () => CON, set: d => replaceArr(CON, d) },
  proveedores: { get: () => PROV, set: d => replaceArr(PROV, d) },
  articulos: { get: () => ART, set: d => replaceArr(ART, d) },
  garantias: { get: () => GAR, set: d => replaceArr(GAR, d) },
  movimientos: { get: () => LOG, set: d => replaceArr(LOG, d.sort((a, b) => (b.d + (b.h || '')).localeCompare(a.d + (a.h || '')))) },
  asistencia: {
    get: () => Object.entries(REG).map(([id, r]) => ({ id, ex: r.ex, fa: r.fa })),
    set: d => { Object.keys(REG).forEach(k => delete REG[k]); d.forEach(r => { REG[r.id] = { ex: r.ex, fa: r.fa }; }); }
  },
  pizarras: {
    get: () => PB.boards,
    set: d => {
      PB.boards = d.length ? d : [{ id: uid(), name: 'Pizarra principal', items: [], links: [] }];
      if (!PB.boards.some(b => b.id === PB.cur)) PB.cur = PB.boards[0].id;
    }
  },
  // Las fichas se guardan con ids de vehículo y personal (no copias)
  fichas: {
    get: () => F.map(f => ({ ...f, veh: f.veh && f.veh.id, mem: f.mem.map(m => m.id) })),
    set: d => {
      F = d.map(x => ({ ...x, veh: VEH.find(v => v.id === x.veh) || VEH[0], mem: (x.mem || []).map(id => PER.find(p => p.id === id)).filter(Boolean) }))
        .sort((a, b) => a.cod.localeCompare(b.cod, 'es', { numeric: true }));
    }
  },
  config: {
    get: () => [{ id: 'empresa', ...CE }],
    set: d => { if (d[0]) { const { id, ...rest } = d[0]; Object.assign(CE, rest); } }
  }
};
const COL_ORDEN = ['personal', 'vehiculos', 'clientes', 'contratistas', 'proveedores', 'articulos', 'movimientos', 'asistencia', 'pizarras', 'fichas', 'garantias', 'config'];

function setSync(state, msg = '') {
  const el = $('#sync-status');
  if (!el) return;
  const S = {
    ok: ['bg-emerald-50 text-emerald-700 border-emerald-200', 'cloud', 'Guardado'],
    saving: ['bg-white text-bizmuted border-bizborder', 'loader', 'Guardando…'],
    error: ['bg-rose-50 text-rose-700 border-rose-200', 'cloud-off', 'Sin conexión'],
    demo: ['bg-amber-50 text-amber-700 border-amber-200', 'flask-conical', 'Modo demo']
  }[state];
  el.className = `hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold shadow-sm ${S[0]}`;
  el.title = msg;
  el.innerHTML = `<i data-lucide="${S[1]}" class="w-3.5 h-3.5 ${state === 'saving' ? 'animate-spin' : ''}"></i><span>${S[2]}</span>`;
  lucide.createIcons();
}

function queueSave() {
  if (!DB.ready) return;
  clearTimeout(DB.timer);
  DB.timer = setTimeout(flush, 700);
}

async function flush() {
  if (!DB.ready) return;
  if (DB.busy) { DB.again = true; return; }
  DB.busy = true;
  try {
    const up = [], gone = {}, seen = new Set();
    for (const tipo of COL_ORDEN) {
      for (const d of COL[tipo].get()) {
        const k = tipo + ':' + d.id, j = stable(d);
        seen.add(k);
        if (DB.saved.get(k) !== j) up.push({ k, j, row: { empresa_id: DB.emp, tipo, id: String(d.id), data: JSON.parse(j), actualizado: new Date().toISOString(), updated_by: DB.uid } });
      }
    }
    for (const k of DB.saved.keys()) if (!seen.has(k)) { const [t, ...r] = k.split(':'); (gone[t] = gone[t] || []).push(r.join(':')); }

    if (up.length || Object.keys(gone).length) setSync('saving');
    for (let i = 0; i < up.length; i += 200) {
      const part = up.slice(i, i + 200);
      const { error } = await DB.sb.from('entidades').upsert(part.map(x => x.row));
      if (error) throw error;
      part.forEach(x => DB.saved.set(x.k, x.j));
    }
    for (const [tipo, ids] of Object.entries(gone)) {
      const { error } = await DB.sb.from('entidades').delete().eq('empresa_id', DB.emp).eq('tipo', tipo).in('id', ids);
      if (error) throw error;
      ids.forEach(id => DB.saved.delete(tipo + ':' + id));
    }
    await publishTracking();
    if (DB.err) toast('Conexión restablecida');
    DB.err = false;
    setSync('ok');
  } catch (e) {
    console.error('Error guardando en Supabase', e);
    if (!DB.err) toast('No se pudo guardar. Se reintentará automáticamente.', 'rose');
    DB.err = true;
    setSync('error', e.message || String(e));
  } finally {
    DB.busy = false;
    if (DB.again) { DB.again = false; queueSave(); }
  }
}

// Lo que el cliente puede ver de su parada (sin datos de otros clientes de la ruta)
function ptSnap(f, p) {
  stopTok(p);
  const { cli, ...stop } = p;
  return {
    i: f.par.indexOf(p),
    f: {
      id: f.id, cod: f.cod, est: f.est,
      veh: { n: f.veh.n, p: f.veh.p, k: f.veh.k },
      mem: f.mem.map((m, i) => ({ n: m.n, r: m.r, f: m.f || '', t: i === 0 ? m.t : '' }))
    },
    par: f.par.map(x => x === p ? { ...stop, dir: ptDir(p) } : { id: x.id, e: x.e, n: '', t: '', h: x.h }),
    ce: { emp: CE.emp, logo: CE.logo, col: CE.col, pay: CE.pay, banco: CE.pay ? CE.banco : '' }
  };
}

const segChannel = tok => {
  if (!DB.ch.has(tok)) { const c = DB.sb.channel('seg-' + tok); c.subscribe(); DB.ch.set(tok, c); }
  return DB.ch.get(tok);
};

async function publishTracking() {
  const rows = [];
  F.forEach(f => f.par.forEach(p => {
    const snap = ptSnap(f, p), j = stable(snap);
    if (DB.snaps.get(p.tok) !== j) rows.push({ tok: p.tok, snap, j });
  }));
  if (!rows.length) return;
  const { error } = await DB.sb.from('seguimiento').upsert(rows.map(r => ({ tok: r.tok, empresa_id: DB.emp, snap: r.snap, actualizado: new Date().toISOString() })));
  if (error) throw error;
  rows.forEach(r => {
    DB.snaps.set(r.tok, r.j);
    segChannel(r.tok).send({ type: 'broadcast', event: 'update', payload: { snap: r.snap } });
  });
}

async function fetchAll() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await DB.sb.from('entidades').select('tipo,id,data').eq('empresa_id', DB.emp).order('creado').order('id').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

function applyAll(rows) {
  const by = {};
  rows.forEach(r => { (by[r.tipo] = by[r.tipo] || []).push(r.data); DB.saved.set(r.tipo + ':' + r.id, stable(r.data)); });
  COL_ORDEN.forEach(t => { if (by[t] || t !== 'config') COL[t].set(by[t] || []); });
  // Empresas creadas antes del módulo de garantías: se generan desde los equipos instalados de cada cliente
  if (!by.garantias) CLI.forEach(c => (c.eq || []).forEach(e => GAR.push({ id: e.id, cli: c.id, prod: e.n + (e.mm ? ' · ' + e.mm : ''), serie: '', ini: e.i, ven: e.g, per: '', tk: [] })));
}

const RENDER = { desp: () => renderDespacho(), ini: () => renderInicio(), cli: () => renderClientes(), plan: () => renderPlan(), hor: () => renderHoras(), eq: () => renderEquipos(), con: () => renderContratistas(), prov: () => renderProveedores(), gar: () => renderGarantias(), cat: () => renderCatalogo() };
let rerenderT = null;
function rerenderAll() {
  clearTimeout(rerenderT);
  rerenderT = setTimeout(() => {
    const a = document.activeElement;
    if (a && a.matches('input, textarea, select') && !a.closest('#login-screen')) return rerenderAll();   // no interrumpir a quien escribe
    renderSidebarMembers();
    (RENDER[STATE.view] || RENDER.desp)();
    updateStatsBanner();
    refreshPortal();
  }, 250);
}

// Cambios hechos por otros usuarios
function onRemote({ eventType, new: nw, old }) {
  const r = eventType === 'DELETE' ? old : nw;
  if (!r || !COL[r.tipo] || (eventType !== 'DELETE' && r.updated_by === DB.uid)) return;
  const k = r.tipo + ':' + r.id, col = COL[r.tipo];
  let docs = [...col.get()];
  if (eventType === 'DELETE') {
    if (!DB.saved.has(k)) return;
    DB.saved.delete(k);
    docs = docs.filter(d => String(d.id) !== r.id);
  } else {
    const j = stable(r.data);
    if (DB.saved.get(k) === j) return;
    DB.saved.set(k, j);
    const i = docs.findIndex(d => String(d.id) === r.id);
    if (i >= 0) docs[i] = r.data; else docs.push(r.data);
  }
  col.set(docs);
  // Las fichas apuntan a personal y vehículos: se reconstruyen para no quedar con copias viejas
  if (r.tipo === 'personal' || r.tipo === 'vehiculos') COL.fichas.set(COL.fichas.get());
  rerenderAll();
}

// Firma o calificación hecha por el cliente desde su enlace
function onCliente({ new: row }) {
  if (!row || !row.cliente) return;
  const [, p] = ptFind(row.tok);
  if (!p) return;
  const c = row.cliente;
  const hechos = [];
  if (c.firma && !p.firma) { p.firma = c.firma; hechos.push('firmó la conformidad'); }
  if (c.cal && !p.cal) { p.cal = c.cal; p.com = c.com || ''; hechos.push(`calificó con ${c.cal} ★`); }
  if (!hechos.length) return;
  toast(`${p.n}: el cliente ${hechos.join(' y ')}`);
  rerenderAll();
  queueSave();
}

function subscribeRealtime() {
  const filter = 'empresa_id=eq.' + DB.emp;
  DB.sb.channel('entidades-cambios')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'entidades', filter }, onRemote)
    .subscribe();
  DB.sb.channel('seguimiento-clientes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seguimiento', filter }, onCliente)
    .subscribe();
  if (!KS.missing) DB.sb.channel('catalogo-cambios')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'catalogo_servicios', filter }, onCatalogo)
    .subscribe();
}

// Primera vez: sube los datos de ejemplo con enlaces nuevos y seguros
function prepararSemilla() {
  F.forEach(f => f.par.forEach(p => { p.tok = rtok(); }));
}

// ---------- Login, registro y recuperación de contraseña ----------
const AUTH = { modo: 'entrar' };   // entrar | registro | recuperar
const AUTH_TXT = {
  entrar: ['Iniciar sesión', 'Entra con tu correo y contraseña', 'Entrar'],
  registro: ['Crear cuenta', 'Regístrate gratis y crea el espacio de tu empresa', 'Crear cuenta'],
  recuperar: ['Recuperar contraseña', 'Te enviaremos un enlace para crear una nueva', 'Enviar enlace']
};
const AUTH_ERR = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada.',
  'User already registered': 'Ese correo ya tiene una cuenta. Inicia sesión.',
  'Password should be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  'Unable to validate email address: invalid format': 'El correo no es válido.'
};
const authErr = e => AUTH_ERR[e.message] || (/rate limit/i.test(e.message) ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' : e.message);

function setAuthMode(m) {
  AUTH.modo = m;
  const [t, s, b] = AUTH_TXT[m];
  $('#login-title').textContent = t;
  $('#login-sub').textContent = s;
  $('#login-btn').textContent = b;
  $$('.auth-reg').forEach(el => { el.style.display = m === 'registro' ? '' : 'none'; });
  $('#login-pass-wrap').style.display = m === 'recuperar' ? 'none' : '';
  $('#login-guest').style.display = m === 'recuperar' ? 'none' : '';
  $('#login-pass').autocomplete = m === 'registro' ? 'new-password' : 'current-password';
  $('#login-alt').innerHTML = m === 'entrar'
    ? '¿No tienes cuenta? <button type="button" onclick="setAuthMode(\'registro\')" class="font-bold text-bizdark underline">Crear cuenta</button><br><button type="button" onclick="setAuthMode(\'recuperar\')" class="font-semibold text-bizmuted underline mt-1">Olvidé mi contraseña</button>'
    : '¿Ya tienes cuenta? <button type="button" onclick="setAuthMode(\'entrar\')" class="font-bold text-bizdark underline">Iniciar sesión</button>';
  authMsg('');
}
window.setAuthMode = setAuthMode;

function authMsg(msg, ok = false) {
  const el = $('#login-msg');
  el.textContent = msg;
  el.className = `text-xs font-semibold empty:hidden ${ok ? 'text-emerald-700' : 'text-rose-600'}`;
}

function showLogin(msg = '', loading = false, ok = false) {
  $('#login-screen').style.display = 'flex';
  $('#login-form').style.display = loading ? 'none' : '';
  $('#login-loading').style.display = loading ? '' : 'none';
  if (loading) $('#login-loading-msg').textContent = msg;
  else { authMsg(msg, ok); setTimeout(() => $('#login-email').focus(), 50); }
  lucide.createIcons();
}
const hideLogin = () => { $('#login-screen').style.display = 'none'; };

async function doLogin() {
  const email = $('#login-email').value.trim(), password = $('#login-pass').value;
  const m = AUTH.modo, btn = $('#login-btn');
  if (!email) return authMsg('Escribe tu correo.');
  if (m !== 'recuperar' && !password) return authMsg('Escribe tu contraseña.');
  if (m === 'registro' && !$('#login-empresa').value.trim()) return authMsg('Escribe el nombre de tu empresa.');

  btn.disabled = true; btn.textContent = 'Un momento…';
  const volver = location.href.split('#')[0];
  let res;
  if (m === 'entrar') res = await DB.sb.auth.signInWithPassword({ email, password });
  else if (m === 'registro') res = await DB.sb.auth.signUp({
    email, password,
    options: { emailRedirectTo: volver, data: { empresa: $('#login-empresa').value.trim(), nombre: $('#login-nombre').value.trim() } }
  });
  else res = await DB.sb.auth.resetPasswordForEmail(email, { redirectTo: volver });
  btn.disabled = false; btn.textContent = AUTH_TXT[m][2];

  if (res.error) return authMsg(authErr(res.error));
  if (m === 'recuperar') return authMsg('Si el correo tiene cuenta, te llegará un enlace para crear una nueva contraseña.', true);
  if (m === 'registro' && res.data.user && (res.data.user.identities || []).length === 0) return authMsg(AUTH_ERR['User already registered']);
  if (!res.data.session) return authMsg('¡Cuenta creada! Te enviamos un correo para confirmarla. Ábrelo y luego inicia sesión.', true);
  $('#login-pass').value = '';
  dbBoot(res.data.session);
}
window.doLogin = doLogin;

// Acceso provisional para pruebas: sesión anónima de Supabase.
// Funciona igual que una cuenta (su propia empresa, guardado, tiempo real) y el navegador la recuerda.
async function doGuest() {
  const btn = $('#login-guest'), html = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Entrando…';
  const { data, error } = await DB.sb.auth.signInAnonymously({ options: { data: { empresa: 'Empresa de prueba', nombre: 'Invitado' } } });
  btn.disabled = false;
  btn.innerHTML = html;
  lucide.createIcons();
  if (error) {
    return authMsg(/anonymous sign-ins are disabled/i.test(error.message)
      ? 'Para entrar como invitado activa "Allow anonymous sign-ins" en Supabase → Authentication → Sign In / Providers.'
      : authErr(error));
  }
  dbBoot(data.session);
}
window.doGuest = doGuest;

// Enlace de "Olvidé mi contraseña": pedir la nueva al volver a la app
if (DB.on) DB.sb.auth.onAuthStateChange(async ev => {
  if (ev !== 'PASSWORD_RECOVERY') return;
  const nueva = prompt('Escribe tu nueva contraseña (mínimo 6 caracteres):');
  if (!nueva) return;
  const { error } = await DB.sb.auth.updateUser({ password: nueva });
  toast(error ? authErr(error) : 'Contraseña actualizada', error ? 'rose' : 'dark');
});

async function miEmpresa(session) {
  const q = () => DB.sb.from('miembros').select('empresa_id, nombre, rol, empresas(nombre)').eq('user_id', session.user.id).order('creado').limit(1);
  let { data, error } = await q();
  if (error) throw error;
  if (!data.length) {
    // Cuenta creada antes del trigger o desde el panel: se le crea su empresa
    const meta = session.user.user_metadata || {};
    const r = await DB.sb.rpc('crear_mi_empresa', { p_nombre: meta.empresa || '' });
    if (r.error) throw r.error;
    ({ data, error } = await q());
    if (error) throw error;
  }
  return data[0];
}

async function dbBoot(session) {
  DB.uid = session.user.id;
  DB.email = session.user.email;
  showLogin('Cargando datos de la empresa…', true);
  try {
    const yo = await miEmpresa(session);
    DB.emp = yo.empresa_id;
    const empNombre = (yo.empresas && yo.empresas.nombre) || '';
    const rows = await fetchAll();
    await loadCatalog();
    if (rows.length) applyAll(rows);
    else {
      prepararSemilla();
      if (!KS.missing && !CAT.length) await catSeed();
      if (empNombre) CE.emp = empNombre;
      toast(`Bienvenido. Cargamos datos de ejemplo para que veas cómo funciona ${empNombre || 'tu espacio'}.`);
    }
    DB.ready = true;
    const nm = $('#user-name'), rl = $('#user-role'), av = $('#user-ini');
    const quien = yo.nombre || (session.user.user_metadata || {}).nombre || DB.email.split('@')[0];
    if (nm) nm.textContent = quien;
    if (rl) rl.textContent = (empNombre || DB.email || '') + (session.user.is_anonymous ? ' · invitado' : '');
    if (av) av.textContent = ini(quien);
    hideLogin();
    rerenderAll();
    subscribeRealtime();
    await flush();
  } catch (e) {
    console.error(e);
    const falta = /relation .* does not exist|Could not find the (table|function)|schema cache/i.test(e.message || '');
    showLogin(falta ? 'Falta crear las tablas: ejecuta supabase/schema.sql en el SQL Editor de Supabase.' : 'No se pudo cargar: ' + (e.message || e));
  }
}

async function dbStart() {
  if (!DB.on) { catSeed(); return setSync('demo', 'Sin conexión a Supabase: los datos no se guardan'); }
  const { data: { session } } = await DB.sb.auth.getSession();
  if (session) dbBoot(session); else showLogin();
}

// Guardar después de cada acción del usuario y cada pocos segundos (fotos, firmas, etc.)
['click', 'change', 'input', 'pointerup'].forEach(ev => document.addEventListener(ev, queueSave));
setInterval(() => { if (DB.ready && !DB.busy) flush(); }, 5000);
window.addEventListener('beforeunload', e => {
  if (!DB.ready) return;
  const pendiente = COL_ORDEN.some(t => COL[t].get().some(d => DB.saved.get(t + ':' + d.id) !== stable(d)));
  if (pendiente) { flush(); e.preventDefault(); e.returnValue = ''; }
});

// Sube una imagen (data URL) al bucket y devuelve su URL pública
async function subirImg(dataUrl, carpeta) {
  if (!DB.ready) return dataUrl;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${DB.emp}/${carpeta}/${rtok()}.${blob.type === 'image/png' ? 'png' : 'jpg'}`;
    const { error } = await DB.sb.storage.from('evidencias').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
    if (error) throw error;
    return DB.sb.storage.from('evidencias').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error(e);
    toast('No se pudo subir la imagen a la nube; se guardó localmente', 'rose');
    return dataUrl;
  }
}

Object.assign(ACT, {
  logout: async () => {
    if (!DB.on) return toast('Modo demo: no hay sesión iniciada');
    const { data: { session } } = await DB.sb.auth.getSession();
    const invitado = session && session.user.is_anonymous;
    if (!confirm(invitado
      ? '¿Cerrar sesión de invitado?\n\nNo podrás volver a entrar a esta empresa de prueba: la próxima vez como invitado se creará una nueva.'
      : '¿Cerrar sesión?')) return;
    await flush();
    await DB.sb.auth.signOut();
    location.reload();
  }
});

// ================= PORTAL DE SEGUIMIENTO PARA CLIENTES =================
// Enlace público por parada: index.html#/t/<tok>  (sin login; el token es el acceso)
const PTS = {
  prog: ['Programado', '⚪', 'slate', 'Su servicio está programado'],
  ruta: ['En camino', '🟡', 'amber', 'Nuestro equipo va en camino'],
  sitio: ['En sitio', '🟣', 'violet', 'El equipo está trabajando en su ubicación'],
  fin: ['Completado', '🟢', 'emerald', '¡Servicio completado!']
};
const PTL = { fid: 'f1', sid: 's2', rate: 0, com: '', drawn: false };
const isPublic = () => document.body.classList.contains('public-mode');
const stopTok = p => p.tok || (p.tok = rtok());
const ptLink = p => location.href.split('#')[0] + '#/t/' + stopTok(p);
const ptFind = tok => { for (const f of F) { const p = f.par.find(x => x.tok === tok); if (p) return [f, p]; } return []; };
const ptCli = p => (p.cli && CLI.find(c => c.id === p.cli)) || CLI.find(c => c.n === p.n);
const ptDir = p => { const c = ptCli(p); return p.dir || (c ? [c.dir, c.z].filter(Boolean).join(', ') : ''); };
const ptNum = (f, p) => `${f.cod}-${f.par.indexOf(p) + 1}`;
const ahora = () => new Date().toTimeString().slice(0, 5);

function ptSt(f, p) {
  if (p.e === 'completado') return 'fin';
  if (p.e === 'en_proceso') return 'sitio';
  if (f.est === 'en_sitio' && f.par.find(x => x.e !== 'completado') === p) return 'sitio';
  if (['en_ruta', 'en_sitio'].includes(f.est)) return 'ruta';
  return 'prog';
}

function ptEta(f, p) {
  const antes = f.par.slice(0, f.par.indexOf(p)).filter(x => x.e !== 'completado').length;
  let min = null;
  if (p.h) {
    const [hh, mm] = p.h.split(':').map(Number), d = new Date();
    min = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm) - d) / 6e4);
  }
  return { antes, min };
}

function portalHTML(f, p) {
  const st = ptSt(f, p), [sl, , tone, title] = PTS[st];
  const steps = Object.keys(PTS), si = steps.indexOf(st);
  const col = CE.col, lead = f.mem[0] || { n: 'Equipo asignado', r: '' }, otros = f.mem.slice(1);
  const dir = ptDir(p), fotos = p.fotos || [], items = p.it || [];
  const { antes, min } = ptEta(f, p);
  const live = st === 'ruta' || st === 'sitio';
  const msgEq = `Hola ${lead.n.split(' ')[0]}, le escribo por el servicio ${ptNum(f, p)} en ${p.n}. Tengo una consulta:`;
  const sub = st === 'prog' ? (p.h ? `Hora programada: ${p.h}. Le avisaremos cuando el equipo salga hacia su ubicación.` : 'Le avisaremos cuando el equipo salga hacia su ubicación.')
    : st === 'ruta' ? (antes ? `Hay ${antes} parada${antes === 1 ? '' : 's'} antes de la suya.` : 'Usted es la próxima parada de la ruta.')
    : st === 'sitio' ? 'Nuestro equipo ya está en su ubicación realizando el trabajo.'
    : 'Gracias por confiar en nosotros. Abajo encontrará las evidencias y su comprobante.';

  return `
    <div class="min-h-full bg-bizbg text-bizdark" data-tok="${stopTok(p)}">
      <header class="bg-white/90 backdrop-blur border-b border-bizborder px-5 py-3.5 flex items-center justify-between gap-3 sticky top-0 z-10">
        ${CE.logo
          ? `<img src="${CE.logo}" alt="${esc(CE.emp)}" class="h-9 max-w-[170px] object-contain">`
          : `<span class="text-lg font-extrabold tracking-tight truncate" style="color: ${col}">${esc(CE.emp)}</span>`}
        <span class="text-[11px] font-bold text-bizmuted flex items-center gap-1.5 shrink-0">
          <span class="relative flex w-2 h-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full w-2 h-2 bg-emerald-500"></span></span>
          Seguimiento en vivo
        </span>
      </header>

      <main class="p-4 space-y-4 max-w-md mx-auto">
        <!-- A. Estado en vivo -->
        <section class="biz-card p-5 space-y-4">
          <div class="flex items-center justify-between gap-2 text-[11px] font-bold text-bizmuted uppercase tracking-wider">
            <span>Orden ${esc(ptNum(f, p))}</span>
            <span>${new Date().toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <span class="biz-pill pill-${tone} !text-sm !px-4 !py-1.5">
            <span class="relative flex w-2.5 h-2.5">
              ${live ? '<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-50"></span>' : ''}
              <span class="relative inline-flex rounded-full w-2.5 h-2.5 bg-current"></span>
            </span>
            ${sl}
          </span>
          <div>
            <h1 class="text-xl font-extrabold leading-tight">${title}</h1>
            <p class="text-sm text-bizmuted font-medium mt-1">${sub}</p>
          </div>
          ${st === 'ruta' && p.h ? `
            <div class="flex items-center justify-between gap-3 p-4 rounded-2xl text-white" style="background: ${col}">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-wider opacity-80">Llegada estimada</p>
                <p class="text-3xl font-extrabold tracking-tight">${esc(p.h)}</p>
              </div>
              <p class="text-sm font-bold text-right opacity-90">${min == null ? '' : min > 0 ? `en ~${min} min` : 'Llegando'}</p>
            </div>` : ''}
          <div class="grid grid-cols-4 gap-1.5">
            ${steps.map((s, i) => `
              <div class="space-y-1.5">
                <div class="h-1.5 rounded-full transition-all" style="background: ${i <= si ? col : '#e4e2d9'}"></div>
                <p class="text-[10px] font-bold ${i === si ? 'text-bizdark' : 'text-bizmuted'}">${PTS[s][0]}</p>
              </div>`).join('')}
          </div>
        </section>

        <!-- Célula de trabajo -->
        <section class="biz-card p-5 space-y-4">
          ${secTitle('Su equipo asignado')}
          <div class="flex items-center gap-3">
            ${avatar(lead, 'w-14 h-14 text-lg rounded-2xl')}
            <div class="min-w-0">
              <p class="text-base font-bold truncate">${esc(lead.n)}</p>
              <p class="text-xs text-bizmuted font-medium">${esc(lead.r || 'Técnico')} · a cargo del servicio</p>
              ${otros.length ? `<p class="text-[11px] text-bizmuted mt-0.5">Acompañado por ${otros.map(m => esc(m.n.split(' ')[0])).join(', ')}</p>` : ''}
            </div>
          </div>
          <div class="flex items-center justify-between gap-3 p-3 rounded-2xl bg-bizbg">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-white border border-bizborder flex items-center justify-center shrink-0"><i data-lucide="${f.veh.k === 'bus' ? 'bus' : f.veh.k === 'car' ? 'car' : 'truck'}" class="w-5 h-5"></i></div>
              <div class="min-w-0">
                <p class="text-sm font-bold truncate">${esc(f.veh.n)}</p>
                <p class="text-[11px] text-bizmuted">Vehículo asignado · para su garita</p>
              </div>
            </div>
            <span class="pt-plate">${esc(f.veh.p)}</span>
          </div>
        </section>

        <!-- B. Detalle y ubicación -->
        <section class="biz-card p-5 space-y-4">
          ${secTitle('Detalle del servicio', `<span class="biz-pill pill-slate">${esc(p.t)}</span>`)}
          <div class="flex items-start gap-3">
            <i data-lucide="map-pin" class="w-4 h-4 mt-0.5 shrink-0" style="color: ${col}"></i>
            <div class="min-w-0">
              <p class="text-sm font-bold">${esc(p.n)}</p>
              ${dir ? `<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}" class="text-xs text-bizmuted font-medium underline decoration-dotted">${esc(dir)}</a>` : ''}
            </div>
          </div>
          ${p.srv ? `<div class="flex items-start gap-3"><i data-lucide="clipboard-list" class="w-4 h-4 mt-0.5 shrink-0" style="color: ${col}"></i><p class="text-sm text-bizdark font-medium">${esc(p.srv)}</p></div>` : ''}
          ${items.length ? `
            <details class="group rounded-2xl border border-bizborder overflow-hidden">
              <summary class="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none text-sm font-bold">
                <span class="flex items-center gap-2"><i data-lucide="receipt-text" class="w-4 h-4 text-bizmuted"></i>Conduce digital · ${items.length} ítem${items.length === 1 ? '' : 's'}</span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-bizmuted transition-transform group-open:rotate-180"></i>
              </summary>
              <ul class="divide-y divide-bizborder border-t border-bizborder">
                ${items.map(x => `<li class="flex items-center justify-between gap-3 px-4 py-2.5 text-xs"><span class="font-semibold">${esc(x.n)}</span><span class="text-bizmuted font-bold shrink-0">${esc(x.q)} ${esc(x.u || '')}</span></li>`).join('')}
              </ul>
            </details>` : ''}
        </section>

        <!-- C. Evidencias -->
        <section class="biz-card p-5 space-y-3">
          ${secTitle('Evidencias fotográficas', `<span class="text-[11px] font-semibold text-bizmuted">${fotos.length} foto${fotos.length === 1 ? '' : 's'}</span>`)}
          ${fotos.length ? `
            <div class="grid grid-cols-2 gap-2">
              ${fotos.map((x, i) => `
                <button data-a="ptimg" data-s="${stopTok(p)}" data-m="${i}" class="relative rounded-2xl overflow-hidden border border-bizborder aspect-[4/3] bg-bizbg">
                  <img src="${x.src}" alt="Evidencia" class="w-full h-full object-cover">
                  <span class="absolute left-2 bottom-2 biz-pill bg-white/90 text-bizdark !text-[10px]">${x.k === 'fin' ? 'Fin' : 'Inicio'}${x.h ? ' · ' + esc(x.h) : ''}</span>
                </button>`).join('')}
            </div>` : '<p class="text-xs text-bizmuted p-3 rounded-2xl bg-bizbg">Las fotos de inicio y fin aparecerán aquí cuando el equipo las cargue.</p>'}
        </section>

        <!-- Conformidad / firma -->
        <section class="biz-card p-5 space-y-3">
          ${secTitle('Conformidad del cliente', p.firma ? '<span class="biz-pill pill-emerald">Firmado</span>' : '')}
          ${p.firma ? `
            <div class="rounded-2xl border border-bizborder bg-white p-3"><img src="${p.firma.img}" alt="Firma" class="w-full h-28 object-contain"></div>
            <p class="text-xs text-bizmuted font-medium">Recibido conforme por <b class="text-bizdark">${esc(p.firma.n)}</b> · ${fdate(p.firma.d)} ${esc(p.firma.h || '')}</p>`
          : st === 'sitio' || st === 'fin' ? `
            <p class="text-xs text-bizmuted font-medium">Firme con su dedo dentro del recuadro para confirmar que recibió el servicio conforme.</p>
            <canvas id="pt-sig" class="pt-sig w-full h-40 rounded-2xl border-2 border-dashed border-bizborder bg-white"></canvas>
            <input id="pt-sig-name" type="text" placeholder="Nombre de quien recibe" class="${INP}">
            <div class="flex items-center justify-between gap-2">
              <button data-a="ptsigclr" class="${BTN_MINI}"><i data-lucide="eraser" class="w-3 h-3"></i>Limpiar</button>
              <button data-a="ptsigok" data-s="${stopTok(p)}" class="px-4 py-2 rounded-full text-white text-xs font-bold shadow-sm" style="background: ${col}">Firmar conformidad</button>
            </div>`
          : '<p class="text-xs text-bizmuted p-3 rounded-2xl bg-bizbg">Podrá firmar su conformidad cuando el equipo esté en sitio o al finalizar el servicio.</p>'}
        </section>

        ${st === 'fin' ? `
          <!-- Calificación -->
          <section class="biz-card p-5 space-y-3">
            ${secTitle('Califique el servicio')}
            ${p.cal ? `
              <div class="flex items-center gap-1">${[1, 2, 3, 4, 5].map(i => `<i data-lucide="star" class="w-7 h-7 ${i <= p.cal ? 'fill-amber-400 text-amber-400' : 'text-bizborder'}"></i>`).join('')}</div>
              <p class="text-xs text-bizmuted font-medium">¡Gracias por su valoración!${p.com ? ` “${esc(p.com)}”` : ''}</p>`
            : `
              <div class="flex items-center gap-1">${[1, 2, 3, 4, 5].map(i => `<button data-a="ptstar" data-m="${i}" class="p-0.5 transition-transform active:scale-90" title="${i} estrella${i === 1 ? '' : 's'}"><i data-lucide="star" class="w-8 h-8 ${i <= PTL.rate ? 'fill-amber-400 text-amber-400' : 'text-bizborder'}"></i></button>`).join('')}</div>
              <textarea data-f="ptcom" rows="2" placeholder="Comentario opcional…" class="${INP} resize-none text-xs">${esc(PTL.com)}</textarea>
              <div class="flex justify-end"><button data-a="ptrate" data-s="${stopTok(p)}" class="px-4 py-2 rounded-full text-white text-xs font-bold shadow-sm ${PTL.rate ? '' : 'opacity-50'}" style="background: ${col}">Enviar calificación</button></div>`}
          </section>` : ''}

        ${CE.pay && +p.monto ? `
          <!-- D. Pago -->
          <section class="biz-card p-5 space-y-3">
            ${secTitle('Resumen de pago', `<span class="biz-pill ${p.pg ? 'pill-emerald' : 'pill-amber'}">${p.pg ? 'Pagado' : 'Pendiente de pago'}</span>`)}
            <div class="flex items-end justify-between">
              <span class="text-xs text-bizmuted font-semibold">Monto total</span>
              <span class="text-2xl font-extrabold tracking-tight">${$m(p.monto)}</span>
            </div>
            ${!p.pg && CE.banco ? `
              <div class="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                <p class="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Datos para transferencia</p>
                <p class="text-xs text-bizdark font-medium whitespace-pre-line">${esc(CE.banco)}</p>
                <button data-a="ptbank" class="${BTN_MINI}"><i data-lucide="copy" class="w-3 h-3"></i>Copiar datos</button>
              </div>` : ''}
          </section>` : ''}

        <!-- E. Acciones rápidas -->
        <section class="grid grid-cols-1 gap-2">
          <button data-a="ptpdf" data-s="${stopTok(p)}" class="w-full py-3 rounded-2xl bg-white border border-bizborder text-sm font-bold flex items-center justify-center gap-2 hover:bg-bizsubtle transition-all">
            <i data-lucide="file-down" class="w-4 h-4"></i>Descargar conduce / comprobante
          </button>
          ${lead.t ? `
            <a target="_blank" rel="noopener" href="${wlink(lead, msgEq)}" class="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all">
              <i data-lucide="message-circle" class="w-4 h-4"></i>Contactar al equipo por WhatsApp
            </a>` : ''}
        </section>
      </main>

      <footer class="text-center text-[11px] text-bizmuted font-medium py-6 px-4">
        Proporcionado por <b class="text-bizdark">${esc(CE.emp)}</b> · Powered by BizLink
      </footer>
    </div>
  `;
}

const ptNotFound = () => `
  <div class="min-h-[60vh] flex items-center justify-center p-6">
    <div class="biz-card p-8 max-w-sm text-center space-y-2">
      <i data-lucide="link-2-off" class="w-8 h-8 mx-auto text-bizmuted"></i>
      <h1 class="text-lg font-bold">Enlace no disponible</h1>
      <p class="text-sm text-bizmuted">Este enlace de seguimiento no existe o ya expiró. Contacte a ${esc(CE.emp)} para recibir uno nuevo.</p>
    </div>
  </div>`;

function mountPortal(el, f, p) {
  if (!el) return;
  const top = el.scrollTop;
  el.innerHTML = f ? portalHTML(f, p) : ptNotFound();
  el.scrollTop = top;
  lucide.createIcons();
  initSig();
}

// Lienzo de firma (dedo o mouse)
function initSig() {
  const cv = $('#pt-sig');
  PTL.drawn = false;
  if (!cv) return;
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.max(1, r.width * dpr);
  cv.height = Math.max(1, r.height * dpr);
  const ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
  Object.assign(ctx, { lineWidth: 2.4, lineCap: 'round', lineJoin: 'round', strokeStyle: '#18191d' });
  const pt = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  let on = false;
  cv.onpointerdown = e => { on = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pt(e)); };
  cv.onpointermove = e => { if (!on) return; ctx.lineTo(...pt(e)); ctx.stroke(); PTL.drawn = true; };
  cv.onpointerup = cv.onpointercancel = () => { on = false; };
}

function renderPortalPage() {
  const tok = (location.hash.match(/^#\/t\/([\w-]+)/) || [])[1];
  const [f, p] = ptFind(tok);
  document.title = `Seguimiento · ${CE.emp}`;
  mountPortal($('#portal-page'), f, p);
}

// Modal interno: simula lo que ve el cliente + controles de cuadrilla y marca blanca
function ptCur() {
  const f = F.find(x => x.id === PTL.fid) || F[0];
  const p = f && (f.par.find(x => x.id === PTL.sid) || f.par[0]);
  return [f, p];
}

function openPortalModal(fid) {
  const f = F.find(x => x.id === fid) || F[0];
  PTL.fid = f.id;
  PTL.sid = (f.par.find(x => x.e !== 'completado') || f.par[0] || {}).id;
  PTL.rate = 0; PTL.com = '';
  renderPortalModal();
  $('#dlg-portal').showModal();
  renderPtlPhone();
}

function renderPtlPhone() {
  const [f, p] = ptCur();
  mountPortal($('#ptl-phone'), p ? f : null, p);
}

function renderPortalModal() {
  const [f, p] = ptCur();
  const c = p && ptCli(p);
  const link = p ? ptLink(p) : '';
  const lab = 'block text-[11px] font-bold text-bizmuted uppercase tracking-wider mb-1';
  const box = 'p-4 rounded-2xl border border-bizborder space-y-3';
  const sel = 'w-full bg-bizbg border border-bizborder rounded-xl px-3 py-2 text-xs font-semibold text-bizdark';

  $('#portal-body').innerHTML = `
    <div class="space-y-5">
      <div class="flex items-center justify-between pb-3 border-b border-bizborder">
        <div>
          <h3 class="text-base font-bold text-bizdark">Vista del cliente · Portal de seguimiento</h3>
          <p class="text-xs text-bizmuted font-medium">Así verá su cliente el enlace público, sin iniciar sesión</p>
        </div>
        <button onclick="$('#dlg-portal').close()" class="p-1 rounded-lg text-bizmuted hover:text-bizdark"><i data-lucide="x" class="w-4 h-4"></i></button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <label><span class="${lab}">Ficha</span>
              <select data-f="ptlf" class="${sel}">${F.map(x => `<option value="${x.id}" ${x.id === f.id ? 'selected' : ''}>${esc(x.cod)} · ${esc(x.veh.n)}</option>`).join('')}</select>
            </label>
            <label><span class="${lab}">Cliente / parada</span>
              <select data-f="ptls" class="${sel}">${f.par.map(x => `<option value="${x.id}" ${p && x.id === p.id ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select>
            </label>
          </div>

          ${p ? `
          <div class="${box}">
            <span class="${lab}">Enlace público del cliente</span>
            <div class="flex items-center gap-2">
              <input readonly value="${esc(link)}" class="flex-1 min-w-0 bg-bizbg border border-bizborder rounded-xl px-3 py-2 text-[11px] font-mono text-bizdark">
              <button data-a="ptcopycur" class="${BTN_MINI}"><i data-lucide="copy" class="w-3 h-3"></i>Copiar</button>
              <a href="${esc(link)}" target="_blank" rel="noopener" class="${BTN_MINI}"><i data-lucide="external-link" class="w-3 h-3"></i>Abrir</a>
            </div>
            ${c && c.t ? `
              <a target="_blank" rel="noopener" href="${wlink(c, `Hola ${(c.ct || c.n).split(' ')[0]}, le escribe ${CE.emp}. Puede seguir su servicio en vivo aquí: ${link}`)}" class="inline-flex px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold items-center gap-1.5">
                <i data-lucide="send" class="w-3.5 h-3.5"></i>Enviar enlace a ${esc(c.n)}
              </a>` : '<p class="text-[11px] text-bizmuted">Esta parada no está vinculada a un cliente con teléfono. Copia el enlace y envíalo por el medio que prefieras.</p>'}
          </div>

          <div class="${box}">
            <span class="${lab}">Simular avance de la cuadrilla</span>
            <div class="grid grid-cols-2 gap-3">
              <label><span class="text-[11px] font-semibold text-bizmuted">Estado de la ficha</span>
                <select data-f="ptfest" class="${sel}">${FL.map(x => `<option value="${x.id}" ${x.id === f.est ? 'selected' : ''}>${x.l}</option>`).join('')}</select>
              </label>
              <label><span class="text-[11px] font-semibold text-bizmuted">Estado de esta parada</span>
                <select data-f="ptpest" class="${sel}">${Object.entries(PS).map(([k, v]) => `<option value="${k}" ${k === p.e ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
              </label>
              <label><span class="text-[11px] font-semibold text-bizmuted">Hora estimada</span>
                <input type="time" data-f="pteta" value="${esc(p.h || '')}" class="${sel}">
              </label>
              <label><span class="text-[11px] font-semibold text-bizmuted">Monto del servicio</span>
                <input type="number" data-f="ptmonto" value="${+p.monto || 0}" class="${sel}">
              </label>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <label class="${BTN_MINI} cursor-pointer"><i data-lucide="camera" class="w-3 h-3"></i>Foto de inicio<input type="file" accept="image/*" capture="environment" data-f="ptfoto" data-m="ini" class="hidden"></label>
              <label class="${BTN_MINI} cursor-pointer"><i data-lucide="camera" class="w-3 h-3"></i>Foto de fin<input type="file" accept="image/*" capture="environment" data-f="ptfoto" data-m="fin" class="hidden"></label>
              <button data-a="ptpg" class="${BTN_MINI}"><i data-lucide="${p.pg ? 'rotate-ccw' : 'badge-check'}" class="w-3 h-3"></i>${p.pg ? 'Marcar pendiente' : 'Marcar pagado'}</button>
              ${p.firma ? `<button data-a="ptsigdel" class="${BTN_MINI} text-rose-600"><i data-lucide="eraser" class="w-3 h-3"></i>Quitar firma</button>` : ''}
              ${(p.fotos || []).length ? `<button data-a="ptfotodel" class="${BTN_MINI} text-rose-600"><i data-lucide="image-off" class="w-3 h-3"></i>Quitar fotos</button>` : ''}
            </div>
          </div>` : '<p class="text-xs text-bizmuted">Esta ficha no tiene paradas.</p>'}

          <div class="${box}">
            <span class="${lab}">Marca blanca de tu empresa</span>
            <div class="grid grid-cols-[1fr_auto] gap-3 items-end">
              <label><span class="text-[11px] font-semibold text-bizmuted">Nombre comercial</span>
                <input type="text" data-f="ptemp" value="${esc(CE.emp)}" class="${sel}">
              </label>
              <label><span class="text-[11px] font-semibold text-bizmuted">Color</span>
                <input type="color" data-f="ptcol" value="${esc(CE.col)}" class="block w-12 h-[34px] rounded-xl border border-bizborder bg-white cursor-pointer">
              </label>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              ${CE.logo ? `<img src="${CE.logo}" alt="Logo" class="h-8 max-w-[120px] object-contain rounded-lg border border-bizborder bg-white p-1">` : ''}
              <label class="${BTN_MINI} cursor-pointer"><i data-lucide="image-up" class="w-3 h-3"></i>${CE.logo ? 'Cambiar logo' : 'Subir logo'}<input type="file" accept="image/*" data-f="ptlogo" class="hidden"></label>
              ${CE.logo ? `<button data-a="ptlogodel" class="${BTN_MINI} text-rose-600">Quitar logo</button>` : '<span class="text-[11px] text-bizmuted">Sin logo se muestra el nombre con tu color.</span>'}
            </div>
            <label class="flex items-center gap-2 text-xs font-semibold text-bizdark cursor-pointer">
              <input type="checkbox" data-f="ptpay" ${CE.pay ? 'checked' : ''} class="w-4 h-4 accent-[#18191d]">Mostrar resumen de pago al cliente
            </label>
            <label class="block"><span class="text-[11px] font-semibold text-bizmuted">Datos bancarios / instrucciones de pago</span>
              <textarea data-f="ptbanco" rows="3" class="${sel} resize-none">${esc(CE.banco)}</textarea>
            </label>
          </div>
        </div>

        <div class="lg:sticky lg:top-0">
          <div class="pt-phone"><div id="ptl-phone" class="h-full overflow-y-auto"></div></div>
          <p class="text-[11px] text-bizmuted text-center mt-2">Vista previa en vivo · los cambios se reflejan al instante</p>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function refreshPortal() {
  if (isPublic()) renderPortalPage();
  const dlg = $('#dlg-portal');
  if (dlg && dlg.open) renderPtlPhone();
}

// Reduce las fotos/logos antes de guardarlos
function readImg(file, max, cb) {
  const fr = new FileReader();
  fr.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, max / Math.max(im.width, im.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(im.width * s);
      cv.height = Math.round(im.height * s);
      cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
      cb(cv.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85));
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}

// Conduce / comprobante imprimible (Guardar como PDF desde el diálogo de impresión)
function ptPrint(f, p) {
  let area = $('#print-area');
  if (!area) { area = document.createElement('div'); area.id = 'print-area'; document.body.appendChild(area); }
  const lead = f.mem[0] || { n: '—' }, c = ptCli(p), items = p.it || [];
  const th = 'text-left text-[11px] uppercase tracking-wider text-bizmuted py-2 border-b border-bizborder';
  area.innerHTML = `
    <div class="p-10 text-bizdark text-sm space-y-6 bg-white">
      <div class="flex items-start justify-between gap-6 pb-4 border-b-2 border-bizdark">
        <div>
          ${CE.logo ? `<img src="${CE.logo}" class="h-12 max-w-[200px] object-contain mb-1">` : `<p class="text-2xl font-extrabold" style="color: ${CE.col}">${esc(CE.emp)}</p>`}
          <p class="text-xs text-bizmuted">${esc(CE.emp)}</p>
        </div>
        <div class="text-right">
          <p class="text-lg font-extrabold uppercase tracking-wide">Conduce / Comprobante</p>
          <p class="text-xs">No. <b>${esc(ptNum(f, p))}</b> · ${fdate(hoy())}</p>
          <p class="text-xs">Estado: <b>${PTS[ptSt(f, p)][0]}</b></p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-6 text-xs">
        <div><p class="font-bold uppercase text-[11px] text-bizmuted mb-1">Cliente / destino</p><p class="font-bold">${esc(c ? c.n : p.n)}</p><p>${esc(ptDir(p) || p.n)}</p>${c && c.ct ? `<p>Contacto: ${esc(c.ct)}</p>` : ''}</div>
        <div><p class="font-bold uppercase text-[11px] text-bizmuted mb-1">Equipo y vehículo</p><p class="font-bold">${esc(lead.n)}</p><p>${esc(f.veh.n)} · Placa ${esc(f.veh.p)}</p><p>Servicio: ${esc(p.t)}${p.h ? ' · ' + esc(p.h) : ''}</p></div>
      </div>
      ${p.srv ? `<p class="text-xs"><b>Descripción:</b> ${esc(p.srv)}</p>` : ''}
      <table class="w-full text-xs">
        <thead><tr><th class="${th}">Descripción</th><th class="${th} !text-right">Cantidad</th><th class="${th} !text-right">Unidad</th></tr></thead>
        <tbody>${items.map(x => `<tr><td class="py-2 border-b border-bizborder">${esc(x.n)}</td><td class="py-2 border-b border-bizborder text-right">${esc(x.q)}</td><td class="py-2 border-b border-bizborder text-right">${esc(x.u || '')}</td></tr>`).join('') || '<tr><td colspan="3" class="py-3 text-bizmuted">Sin ítems registrados</td></tr>'}</tbody>
      </table>
      ${+p.monto ? `<div class="flex justify-end"><div class="text-right"><p class="text-xs text-bizmuted">Total</p><p class="text-2xl font-extrabold">${$m(p.monto)}</p><p class="text-xs font-bold ${p.pg ? 'text-emerald-700' : 'text-amber-700'}">${p.pg ? 'PAGADO' : 'PENDIENTE DE PAGO'}</p></div></div>` : ''}
      ${(p.fotos || []).length ? `<div class="flex gap-3">${p.fotos.slice(0, 4).map(x => `<img src="${x.src}" class="w-32 h-24 object-cover rounded-lg border border-bizborder">`).join('')}</div>` : ''}
      <div class="grid grid-cols-2 gap-10 pt-6">
        <div class="text-center text-xs">${p.firma ? `<img src="${p.firma.img}" class="h-16 mx-auto object-contain">` : '<div class="h-16"></div>'}<div class="border-t border-bizdark pt-1">Recibido conforme${p.firma ? ': ' + esc(p.firma.n) + ' · ' + fdate(p.firma.d) : ''}</div></div>
        <div class="text-center text-xs"><div class="h-16"></div><div class="border-t border-bizdark pt-1">Entregado por: ${esc(lead.n)}</div></div>
      </div>
      <p class="text-center text-[10px] text-bizmuted pt-4">Proporcionado por ${esc(CE.emp)} · Powered by BizLink</p>
    </div>
  `;
  window.print();
}

function ptLightbox(src) {
  const el = document.createElement('div');
  el.className = 'fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out';
  el.innerHTML = `<img src="${src}" class="max-w-full max-h-full rounded-2xl shadow-2xl">`;
  el.onclick = () => el.remove();
  (document.querySelector('dialog[open]') || document.body).appendChild(el);
}

const ptByTok = t => ptFind(t.dataset.s || (t.closest('[data-tok]') || {}).dataset?.tok);
const ptAfter = () => { refreshPortal(); if (!isPublic()) { renderDespacho(); updateStatsBanner(); } };

Object.assign(ACT, {
  ptview: t => { STATE.activeMenu = null; renderDespacho(); openPortalModal(t.dataset.id); },
  ptcopy: t => {
    const f = F.find(x => x.id === t.dataset.id), p = f && (f.par.find(x => x.e !== 'completado') || f.par[0]);
    STATE.activeMenu = null; renderDespacho();
    if (!p) return toast('La ficha no tiene paradas', 'rose');
    navigator.clipboard.writeText(ptLink(p)).then(() => toast(`Link de ${p.n} copiado`), () => toast('No se pudo copiar', 'rose'));
  },
  ptcopycur: () => { const [, p] = ptCur(); navigator.clipboard.writeText(ptLink(p)).then(() => toast('Link copiado'), () => toast('No se pudo copiar', 'rose')); },
  ptimg: t => { const [, p] = ptByTok(t); if (p) ptLightbox(p.fotos[+t.dataset.m].src); },
  ptsigclr: () => initSig(),
  ptsigok: async t => {
    const [, p] = ptByTok(t), cv = $('#pt-sig'), name = ($('#pt-sig-name') || {}).value?.trim();
    if (!p || !cv) return;
    if (!PTL.drawn) return toast('Dibuje su firma en el recuadro', 'rose');
    if (!name) return toast('Escriba el nombre de quien recibe', 'rose');
    const firma = { img: cv.toDataURL('image/png'), n: name, d: hoy(), h: ahora() };
    if (isPublic() && DB.on) {
      t.disabled = true;
      const { data, error } = await DB.sb.rpc('seguimiento_firmar', { p_tok: p.tok, p_img: firma.img, p_nombre: name });
      t.disabled = false;
      if (error || !data) return toast(error ? 'No se pudo registrar la firma. Intente de nuevo.' : 'Esta orden ya tiene una firma registrada.', 'rose');
      PTL.cliente = { ...PTL.cliente, firma };
    }
    p.firma = firma;
    ptAfter(); toast('¡Gracias! Conformidad registrada');
  },
  ptstar: t => { PTL.rate = +t.dataset.m; refreshPortal(); },
  ptrate: async t => {
    const [, p] = ptByTok(t);
    if (!p) return;
    if (!PTL.rate) return toast('Seleccione de 1 a 5 estrellas', 'rose');
    if (isPublic() && DB.on) {
      const { data, error } = await DB.sb.rpc('seguimiento_calificar', { p_tok: p.tok, p_cal: PTL.rate, p_com: PTL.com.trim() });
      if (error || !data) return toast(error ? 'No se pudo enviar la calificación. Intente de nuevo.' : 'Esta orden ya fue calificada.', 'rose');
      PTL.cliente = { ...PTL.cliente, cal: PTL.rate, com: PTL.com.trim() };
    }
    p.cal = PTL.rate; p.com = PTL.com.trim();
    PTL.rate = 0; PTL.com = '';
    ptAfter(); toast('¡Gracias por su calificación!');
  },
  ptbank: () => navigator.clipboard.writeText(CE.banco).then(() => toast('Datos bancarios copiados'), () => toast('No se pudo copiar', 'rose')),
  ptpdf: t => { const [f, p] = ptByTok(t); if (p) ptPrint(f, p); },
  ptpg: () => { const [, p] = ptCur(); p.pg = !p.pg; renderPortalModal(); ptAfter(); },
  ptsigdel: async () => {
    const [, p] = ptCur();
    p.firma = null;
    renderPortalModal(); ptAfter();
    if (DB.ready) {
      // También se borra la firma que el cliente hizo desde su enlace
      const { data } = await DB.sb.from('seguimiento').select('cliente').eq('tok', p.tok).maybeSingle();
      if (data && data.cliente && data.cliente.firma) {
        const { firma, ...resto } = data.cliente;
        await DB.sb.from('seguimiento').update({ cliente: resto }).eq('tok', p.tok);
      }
    }
  },
  ptfotodel: () => { const [, p] = ptCur(); p.fotos = []; renderPortalModal(); ptAfter(); },
  ptlogodel: () => { CE.logo = ''; renderPortalModal(); ptAfter(); }
});

Object.assign(FLD, {
  ptlf: el => { const f = F.find(x => x.id === el.value); PTL.fid = f.id; PTL.sid = (f.par.find(x => x.e !== 'completado') || f.par[0] || {}).id; renderPortalModal(); renderPtlPhone(); },
  ptls: el => { PTL.sid = el.value; PTL.rate = 0; PTL.com = ''; renderPortalModal(); renderPtlPhone(); },
  ptfest: el => { ptCur()[0].est = el.value; ptAfter(); },
  ptpest: el => {
    const [f, p] = ptCur();
    p.e = el.value;
    if (f.par.every(x => x.e === 'completado')) f.est = 'completado';
    renderPortalModal(); ptAfter();
  },
  pteta: el => { ptCur()[1].h = el.value; ptAfter(); },
  ptmonto: el => { ptCur()[1].monto = +el.value || 0; refreshPortal(); },
  ptfoto: el => {
    const file = el.files && el.files[0], [, p] = ptCur();
    if (!file) return;
    toast('Subiendo foto…');
    readImg(file, 1000, async src => {
      src = await subirImg(src, 'fotos/' + stopTok(p));
      (p.fotos = p.fotos || []).push({ k: el.dataset.m, src, h: ahora() });
      renderPortalModal(); ptAfter(); queueSave(); toast('Foto cargada');
    });
  },
  ptemp: el => { CE.emp = el.value || 'Mi empresa'; refreshPortal(); },
  ptcol: el => { CE.col = el.value; refreshPortal(); },
  ptlogo: el => {
    const file = el.files && el.files[0];
    if (file) readImg(file, 400, async src => { CE.logo = await subirImg(src, 'marca'); renderPortalModal(); ptAfter(); queueSave(); });
  },
  ptpay: el => { CE.pay = el.checked; refreshPortal(); },
  ptbanco: el => { CE.banco = el.value; refreshPortal(); },
  ptcom: el => { PTL.com = el.value; }
});

// Modo demo (sin Supabase): sincronización en vivo entre pestañas del mismo navegador
const BC = !DB.on && 'BroadcastChannel' in window ? new BroadcastChannel('bizlink-seguimiento') : null;
let syncT = null;
function syncOut() {
  if (!BC) return;
  clearTimeout(syncT);
  syncT = setTimeout(() => BC.postMessage({ type: 'state', pub: isPublic(), F: JSON.parse(JSON.stringify(F)), CE: { ...CE } }), 80);
}
if (BC) {
  BC.onmessage = ({ data }) => {
    if (data.type === 'hello' && !isPublic()) return syncOut();
    if (data.type !== 'state') return;
    if (isPublic() && !data.pub) {
      // El cliente recibe el estado completo de la empresa
      F = data.F;
      Object.assign(CE, data.CE);
      if (!PTL.drawn) renderPortalPage();
    } else if (!isPublic() && data.pub) {
      // La empresa solo recibe lo que hace el cliente: firma y calificación
      data.F.forEach(rf => rf.par.forEach(rp => {
        const p = (F.find(x => x.id === rf.id) || { par: [] }).par.find(x => x.id === rp.id);
        if (p) Object.assign(p, { firma: rp.firma, cal: rp.cal, com: rp.com });
      }));
      refreshPortal();
    }
  };
  ['click', 'change', 'input'].forEach(ev => document.addEventListener(ev, syncOut));
}

// Con Supabase: el cliente lee su parada por la función seguimiento_get y escucha cambios por difusión
const hashTok = () => (location.hash.match(/^#\/t\/([\w-]+)/) || [])[1];

function applySnap({ snap, cliente }) {
  PTL.cliente = cliente || PTL.cliente || {};
  const f = { ...snap.f, par: snap.par.map(x => ({ ...x })) }, p = f.par[snap.i], c = PTL.cliente;
  if (!p.firma && c.firma) p.firma = c.firma;
  if (!p.cal && c.cal) { p.cal = c.cal; p.com = c.com || ''; }
  F = [f];
  Object.assign(CE, snap.ce);
}

async function refetchPortal(tok) {
  const { data, error } = await DB.sb.rpc('seguimiento_get', { p_tok: tok });
  if (error) console.error(error);
  if (data && data.snap) applySnap(data); else F = [];
  if (!PTL.drawn) renderPortalPage();
}

async function loadPortalRemote(tok) {
  $('#portal-page').innerHTML = '<div class="min-h-[60vh] flex items-center justify-center text-sm text-bizmuted font-semibold">Cargando seguimiento…</div>';
  await refetchPortal(tok);
  if (!DB.ch.has('pub-' + tok)) {
    const c = DB.sb.channel('seg-' + tok)
      .on('broadcast', { event: 'update' }, ({ payload }) => {
        applySnap({ snap: payload.snap });
        if (!PTL.drawn) renderPortalPage();
      })
      .subscribe();
    DB.ch.set('pub-' + tok, c);
  }
}

function routePortal() {
  const pub = /^#\/t\//.test(location.hash);
  document.body.classList.toggle('public-mode', pub);
  if (!pub) return;
  hideLogin();
  if (DB.on) return loadPortalRemote(hashTok());
  renderPortalPage();
  if (BC) BC.postMessage({ type: 'hello' });
}
window.addEventListener('hashchange', () => { if (/^#\/t\//.test(location.hash) || isPublic()) location.reload(); });

// Refresca estado y tiempo estimado (sin interrumpir si el cliente está firmando o escribiendo)
setInterval(() => {
  if (!isPublic() || PTL.drawn || (document.activeElement && document.activeElement.closest('#portal-page input, #portal-page textarea'))) return;
  if (DB.on) refetchPortal(hashTok()); else renderPortalPage();
}, 20000);

// ================= NAVEGACIÓN Y EVENTOS =================
function switchView(viewName) {
  STATE.view = viewName;
  VW.v = viewName;

  // Toggle view containers
  const views = ['desp', 'ini', 'cli', 'gar', 'cat', 'plan', 'hor', 'eq', 'con', 'prov'];
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
    } else if (viewName === 'gar') {
      label.textContent = '+ Nueva Garantía';
      btn.dataset.a = 'gnew';
    } else if (viewName === 'cat') {
      label.textContent = '+ Nuevo Ítem';
      btn.dataset.a = 'catnew';
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
  else if (viewName === 'gar') renderGarantias();
  else if (viewName === 'cat') renderCatalogo();

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
  CS.q = VS.q = EQ.q = GS.q = KS.q = e.target.value;
  if (STATE.view === 'cat') renderCatalogo();
  if (STATE.view === 'gar') renderGarantias();
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
  STATE.wizard = { p: 0, v: VEH[0].id, eq: [PER[0].id], s: '', it: [] };
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
            <div class="pt-2">${(LN.lines = w.it, lnHTML())}</div>
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
      par: [{ id: uid(), n: firstStop, t: 'Entrega', e: 'pendiente', h: '08:30', pg: false }],
      mod: mods()
    };
    LN.lines = w.it;
    lnApply(newFicha.par[0]);

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
  const msgContent = `*Hoja de ruta ${f.cod}* — ${dateStr}\n🚚 ${f.veh.n} (${f.veh.p})\n\n*Equipo:*\n${f.mem.map(m => `• ${m.n} (${m.r})`).join('\n')}\n\n*Ruta:*\n${f.par.map((p, i) => `${i + 1}. ${p.h ? p.h + ' – ' : ''}${p.n} (${p.t})${(p.it || []).length ? '\n   ' + p.it.map(x => `${x.q} × ${x.n}`).join('\n   ') : ''}${+p.monto && !p.pg ? `\n   💵 Cobrar: ${$m(p.monto)}` : ''}`).join('\n')}${(() => { const cob = f.par.filter(p => !p.pg && p.e !== 'completado').reduce((s, p) => s + (+p.monto || 0), 0); return cob ? `\n\n*Total a cobrar en ruta:* ${$m(cob)}` : ''; })()}\n\nResponde *OK* para confirmar recepción.`;

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
  routePortal();
  if (!isPublic()) dbStart();
}

window.addEventListener('DOMContentLoaded', init);
