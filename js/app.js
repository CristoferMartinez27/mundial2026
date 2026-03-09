// ============================================================
//  app.js v2  — Lógica del juego (estadísticas, predicciones,
//               clasificación). Usa DB.* de supabase.js para datos.
// ============================================================

// ── ESTADÍSTICAS POR SELECCIÓN (datos reales, solo clasificados al Mundial 2026) ─
// Las selecciones "extra" del CSV (Italia, Polonia, Chile, etc.) son las que
// disputaron el repechaje — se usan solo como referencia en predicciones.html
const EQUIPOS_STATS_DEFAULT = {
  "Alemania":        { goles:2.0, tarjetas:1.0, offsides:3.3, ranking:10 },
  "Arabia Saudí":    { goles:1.5, tarjetas:1.4, offsides:1.6, ranking:32 },
  "Argelia":         { goles:1.4, tarjetas:1.1, offsides:1.4, ranking:55 },
  "Argentina":       { goles:2.2, tarjetas:1.5, offsides:4.3, ranking:2  },
  "Australia":       { goles:1.4, tarjetas:1.2, offsides:1.5, ranking:54 },
  "Austria":         { goles:1.8, tarjetas:1.0, offsides:2.9, ranking:51 },
  "Brasil":          { goles:2.1, tarjetas:1.3, offsides:4.1, ranking:5  },
  "Bélgica":         { goles:1.6, tarjetas:0.9, offsides:3.0, ranking:9  },
  "Cabo Verde":      { goles:0.9, tarjetas:1.0, offsides:1.0, ranking:67 },
  "Canadá":          { goles:1.8, tarjetas:1.2, offsides:2.8, ranking:29 },
  "Catar":           { goles:1.0, tarjetas:1.0, offsides:1.0, ranking:56 },
  "Colombia":        { goles:1.5, tarjetas:1.4, offsides:2.3, ranking:14 },
  "Corea del Sur":   { goles:1.5, tarjetas:1.1, offsides:1.5, ranking:49 },
  "Costa de Marfil": { goles:1.6, tarjetas:1.2, offsides:1.6, ranking:64 },
  "Croacia":         { goles:1.5, tarjetas:1.2, offsides:3.1, ranking:11 },
  "Curasao":         { goles:1.1, tarjetas:1.5, offsides:2.0, ranking:81 },
  "EEUU":            { goles:1.5, tarjetas:1.8, offsides:3.2, ranking:15 },
  "Ecuador":         { goles:1.3, tarjetas:1.5, offsides:1.7, ranking:50 },
  "Egipto":          { goles:1.3, tarjetas:1.3, offsides:1.3, ranking:58 },
  "Escocia":         { goles:1.4, tarjetas:1.6, offsides:1.7, ranking:38 },
  "España":          { goles:2.3, tarjetas:1.2, offsides:3.4, ranking:1  },
  "Fifa Play-Off 1": { goles:1.3, tarjetas:1.5, offsides:1.3, ranking:55 },
  "Fifa Play-Off 2": { goles:1.3, tarjetas:1.5, offsides:1.3, ranking:58 },
  "Francia":         { goles:2.0, tarjetas:1.1, offsides:3.2, ranking:3  },
  "Ghana":           { goles:1.4, tarjetas:1.5, offsides:1.4, ranking:72 },
  "Haití":           { goles:0.8, tarjetas:2.5, offsides:1.9, ranking:73 },
  "Holanda":         { goles:2.0, tarjetas:0.9, offsides:3.2, ranking:7  },
  "Inglaterra":      { goles:1.9, tarjetas:1.0, offsides:3.5, ranking:4  },
  "Irán":            { goles:1.3, tarjetas:0.8, offsides:1.4, ranking:47 },
  "Japón":           { goles:1.7, tarjetas:1.0, offsides:1.7, ranking:46 },
  "Jordania":        { goles:1.1, tarjetas:0.9, offsides:1.3, ranking:64 },
  "Marruecos":       { goles:1.2, tarjetas:1.4, offsides:1.2, ranking:8  },
  "México":          { goles:2.0, tarjetas:1.4, offsides:3.0, ranking:16 },
  "Noruega":         { goles:2.1, tarjetas:0.8, offsides:3.0, ranking:59 },
  "Nueva Zelanda":   { goles:1.6, tarjetas:1.2, offsides:1.6, ranking:85 },
  "Panamá":          { goles:0.9, tarjetas:2.0, offsides:2.4, ranking:60 },
  "Paraguay":        { goles:1.2, tarjetas:1.7, offsides:1.5, ranking:67 },
  "Portugal":        { goles:1.7, tarjetas:0.8, offsides:3.0, ranking:6  },
  "RD Congo":        { goles:1.2, tarjetas:1.3, offsides:1.2, ranking:62 },
  "Senegal":         { goles:1.3, tarjetas:1.1, offsides:1.3, ranking:12 },
  "Sudáfrica":       { goles:1.2, tarjetas:1.6, offsides:1.2, ranking:60 },
  "Suiza":           { goles:1.3, tarjetas:1.0, offsides:2.8, ranking:18 },
  "Túnez":           { goles:1.1, tarjetas:1.3, offsides:1.1, ranking:47 },
  "UEFA Play-Off A": { goles:1.3, tarjetas:1.5, offsides:1.3, ranking:35 },
  "UEFA Play-Off B": { goles:1.3, tarjetas:1.5, offsides:1.3, ranking:43 },
  "UEFA Play-Off C": { goles:1.3, tarjetas:1.5, offsides:1.3, ranking:46 },
  "UEFA Play-Off D": { goles:1.3, tarjetas:1.5, offsides:1.3, ranking:50 },
  "Uruguay":         { goles:1.7, tarjetas:1.6, offsides:2.1, ranking:44 },
  "Uzbekistán":      { goles:1.0, tarjetas:1.0, offsides:1.2, ranking:52 },
};

// Cache en memoria (se carga desde BD al iniciar)
let _statsCache = null;
let _partidosCache = null;

async function obtenerStats() {
  if (_statsCache) return _statsCache;
  try {
    const fromDB = await DB.getStats();
    // Merge: defaults first, then BD overrides (BD data wins)
    _statsCache = { ...EQUIPOS_STATS_DEFAULT, ...fromDB };
  } catch {
    _statsCache = { ...EQUIPOS_STATS_DEFAULT };
  }
  return _statsCache;
}

async function obtenerPartidos() {
  if (_partidosCache) return _partidosCache;
  _partidosCache = await DB.getPartidos();
  return _partidosCache;
}

function invalidarCachePartidos() { _partidosCache = null; }
function invalidarCacheStats()    { _statsCache = null; }

// ── GRUPOS ─────────────────────────────────────────────────
const GRUPOS = {
  A: ["México","Sudáfrica","Corea del Sur","UEFA Play-Off D"],
  B: ["Canadá","Catar","Suiza","UEFA Play-Off A"],
  C: ["Brasil","Marruecos","Haití","Escocia"],
  D: ["EEUU","Paraguay","Australia","UEFA Play-Off C"],
  E: ["Alemania","Curasao","Costa de Marfil","Ecuador"],
  F: ["Holanda","Japón","UEFA Play-Off B","Túnez"],
  G: ["Bélgica","Egipto","Irán","Nueva Zelanda"],
  H: ["España","Cabo Verde","Arabia Saudí","Uruguay"],
  I: ["Francia","Senegal","Fifa Play-Off 2","Noruega"],
  J: ["Argentina","Argelia","Austria","Jordania"],
  K: ["Portugal","Uzbekistán","Colombia","Fifa Play-Off 1"],
  L: ["Inglaterra","Croacia","Ghana","Panamá"],
};

// ── DEADLINE ─────────────────────────────────────────────
const FECHA_ISO = {
  "Jue 11 Jun":"2026-06-11","Vie 12 Jun":"2026-06-12","Sáb 13 Jun":"2026-06-13",
  "Dom 14 Jun":"2026-06-14","Lun 15 Jun":"2026-06-15","Mar 16 Jun":"2026-06-16",
  "Mié 17 Jun":"2026-06-17","Jue 18 Jun":"2026-06-18","Vie 19 Jun":"2026-06-19",
  "Sáb 20 Jun":"2026-06-20","Dom 21 Jun":"2026-06-21","Lun 22 Jun":"2026-06-22",
  "Mar 23 Jun":"2026-06-23","Mié 24 Jun":"2026-06-24","Jue 25 Jun":"2026-06-25",
  "Vie 26 Jun":"2026-06-26","Sáb 27 Jun":"2026-06-27","Dom 28 Jun":"2026-06-28",
  "Lun 29 Jun":"2026-06-29","Mar 30 Jun":"2026-06-30","Mié 1 Jul" :"2026-07-01",
  "Jue 2 Jul" :"2026-07-02","Vie 3 Jul" :"2026-07-03","Sáb 4 Jul" :"2026-07-04",
  "Dom 5 Jul" :"2026-07-05","Lun 6 Jul" :"2026-07-06","Mar 7 Jul" :"2026-07-07",
  "Jue 9 Jul" :"2026-07-09","Vie 10 Jul":"2026-07-10","Sáb 11 Jul":"2026-07-11",
  "Mar 14 Jul":"2026-07-14","Mié 15 Jul":"2026-07-15","Sáb 18 Jul":"2026-07-18",
  "Dom 19 Jul":"2026-07-19",
};

function partidoEditable(p) {
  if (p.estado === 'finalizado') return false;
  const iso = FECHA_ISO[p.fecha];
  if (!iso) return true;
  return new Date() < new Date(iso + 'T15:30:00Z'); // 9:30am Guatemala = 15:30 UTC
}
function textoDeadline(p) { return `Cierra ${p.fecha} 9:30am`; }

// ── MOTOR DE PREDICCIÓN ───────────────────────────────────
async function predecirPartido(eqA, eqB) {
  const S  = await obtenerStats();
  const A  = S[eqA] || { goles:1.2, tarjetas:1.5, offsides:1.4, ranking:50 };
  const B  = S[eqB] || { goles:1.2, tarjetas:1.5, offsides:1.4, ranking:50 };
  const f  = r => r<=5?1.25 : r<=15?1.12 : r<=30?1.00 : r<=50?0.88 : 0.78;
  const fA = f(A.ranking), fB = f(B.ranking);
  const gA = +(A.goles * fA * 0.9).toFixed(2);
  const gB = +(B.goles * fB * 0.9).toFixed(2);
  const mA = Math.round(gA), mB = Math.round(gB);
  const empV = Math.max(mA, mB);
  const sugerencias = [
    { a:mA,    b:mB,    label:"Más probable" },
    { a:mA+1,  b:mB,    label:`Gana ${eqA.split(' ')[0]}` },
    { a:mA,    b:mB+1,  label:`Gana ${eqB.split(' ')[0]}` },
    { a:empV,  b:empV,  label:"Empate" },
  ];
  let probA = Math.min(72, Math.max(20, Math.round((gA/(gA+gB+0.001))*100*(fA/fB))));
  const probEmpate = 15;
  const probB = 100 - probA - probEmpate;
  const tarjAm = +((A.tarjetas+B.tarjetas)/2).toFixed(1);
  const tarjRj = +(tarjAm*0.15).toFixed(1);
  const offs   = +((A.offsides+B.offsides)/2).toFixed(1);
  let exp = A.goles > B.goles
    ? `${eqA} tiene mayor promedio de goles (${A.goles} vs ${B.goles}).`
    : B.goles > A.goles
      ? `${eqB} tiene mayor promedio de goles (${B.goles} vs ${A.goles}).`
      : `Promedios similares (${A.goles}). Partido equilibrado.`;
  if (A.ranking < B.ranking) exp += ` ${eqA} aventaja en FIFA (#${A.ranking} vs #${B.ranking}).`;
  else if (B.ranking < A.ranking) exp += ` ${eqB} aventaja en FIFA (#${B.ranking} vs #${A.ranking}).`;
  return { marcA:mA, marcB:mB, probA, probEmpate, probB,
           tarjAm, tarjRj, offs, explicacion:exp, sugerencias,
           rankA:A.ranking, rankB:B.ranking, golesA:gA, golesB:gB };
}

// ── CLASIFICACIÓN DE GRUPOS ───────────────────────────────
function calcularClasificacion(grupo, partidos) {
  const equipos = GRUPOS[grupo];
  if (!equipos) return [];
  const tabla = {};
  equipos.forEach(eq => { tabla[eq]={equipo:eq,pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,pts:0}; });
  partidos
    .filter(p => p.grupo === grupo && p.estado === 'finalizado')
    .forEach(p => {
      const L = tabla[p.local], V = tabla[p.visitante];
      if (!L || !V) return;
      L.pj++; V.pj++;
      L.gf += p.goles_local||0;  L.gc += p.goles_visitante||0;
      V.gf += p.goles_visitante||0; V.gc += p.goles_local||0;
      if      (p.goles_local > p.goles_visitante) { L.pg++; L.pts+=3; V.pp++; }
      else if (p.goles_local < p.goles_visitante) { V.pg++; V.pts+=3; L.pp++; }
      else                                         { L.pe++; V.pe++; L.pts++; V.pts++; }
    });
  return Object.values(tabla)
    .map(e => ({...e, dg:e.gf-e.gc}))
    .sort((a,b) => b.pts-a.pts || b.dg-a.dg || b.gf-a.gf);
}

// ── RESOLUCIÓN DE CLASIFICADOS ────────────────────────────
// Convierte "1A", "W74", "L101" → nombre real del equipo
function resolverEquipo(label, partidos) {
  if (!label || !partidos) return label;
  const mPos = label.match(/^([123])([A-L])$/);
  if (mPos) {
    const t = calcularClasificacion(mPos[2], partidos);
    const pos = parseInt(mPos[1]) - 1;
    if (t[pos] && t[pos].pj > 0) return t[pos].equipo;
    return label;
  }
  const mW = label.match(/^W(\d+)$/);
  if (mW) {
    const p = partidos.find(x => x.num === parseInt(mW[1]));
    if (!p || p.estado !== 'finalizado') return label;
    if (p.tiene_penales) return (p.penales_local||0) > (p.penales_visitante||0) ? p.local : p.visitante;
    return p.goles_local > p.goles_visitante ? p.local : p.visitante;
  }
  const mL = label.match(/^L(\d+)$/);
  if (mL) {
    const p = partidos.find(x => x.num === parseInt(mL[1]));
    if (!p || p.estado !== 'finalizado') return label;
    if (p.tiene_penales) return (p.penales_local||0) < (p.penales_visitante||0) ? p.local : p.visitante;
    return p.goles_local < p.goles_visitante ? p.local : p.visitante;
  }
  return label;
}

// ── PUNTOS QUINIELA ───────────────────────────────────────
function calcularPuntos(pred, partido) {
  return calcularPuntosRaw(pred, {
    ...partido,
    goles_local:      partido.goles_local,
    goles_visitante:  partido.goles_visitante,
    tiene_penales:    partido.tiene_penales,
    penales_local:    partido.penales_local,
    penales_visitante:partido.penales_visitante,
  });
}

// ── HELPERS UI ────────────────────────────────────────────
function mostrarError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = `<div class="alert alert-error">${msg}</div>`;
}
function mostrarOk(elId, msg) {
  const el = document.getElementById(elId);
  if (el) {
    el.innerHTML = `<div class="alert alert-success">${msg}</div>`;
    setTimeout(() => { if (el) el.innerHTML = ''; }, 3500);
  }
}
function setLoading(elId, txt = 'Cargando...') {
  const el = document.getElementById(elId);
  if (el) el.innerHTML = `<div class="loading"><div class="spinner"></div>${txt}</div>`;
}