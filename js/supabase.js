// ============================================================
//  supabase.js  — Configuración y todas las operaciones de BD
//  ⚠️ REEMPLAZA estas dos líneas con tus credenciales reales
//     de tu proyecto en https://supabase.com/dashboard
// ============================================================

const SUPABASE_URL = 'https://fpnyxizzxrukbyryuiih.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwbnl4aXp6eHJ1a2J5cnl1aWloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDEwMTksImV4cCI6MjA4ODYxNzAxOX0.lTtS6x5a69TKJTs8fS_NtcpXStaifqmz80FgFF460nQ';

// Cliente Supabase (usamos la API REST directamente, sin SDK extra)
const SB = {
  url: SUPABASE_URL,
  key: SUPABASE_KEY,

  headers() {
    const h = {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Authorization': 'Bearer ' + this.key,
    };
    const session = SBAuth.getSession();
    if (session?.access_token) {
      h['Authorization'] = 'Bearer ' + session.access_token;
    }
    return h;
  },

  // Ejecuta un fetch y si recibe 401 (JWT expirado), refresca el token y reintenta una vez
  async _fetch(url, options = {}) {
    let res = await fetch(url, { ...options, headers: { ...this.headers(), ...(options.headers||{}) } });
    if (res.status === 401) {
      const refreshed = await SBAuth.refreshSession();
      if (!refreshed) {
        window.location.href = getBasePath() + 'pages/login.html';
        throw new Error('Sesión expirada');
      }
      res = await fetch(url, { ...options, headers: { ...this.headers(), ...(options.headers||{}) } });
    }
    return res;
  },

  async get(table, query = '') {
    const res = await this._fetch(`${this.url}/rest/v1/${table}${query}`);
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async post(table, body) {
    const res = await this._fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async patch(table, query, body) {
    const res = await this._fetch(`${this.url}/rest/v1/${table}${query}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async delete(table, query) {
    const res = await this._fetch(`${this.url}/rest/v1/${table}${query}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw await res.json();
    return true;
  },

  async rpc(fn, params = {}) {
    const res = await fetch(`${this.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
};

// ── AUTH ────────────────────────────────────────────────────
const SBAuth = {
  SESSION_KEY: 'sb_session',

  getSession() {
    const s = localStorage.getItem(this.SESSION_KEY);
    return s ? JSON.parse(s) : null;
  },

  setSession(session) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
  },

  getUser() {
    return this.getSession()?.user || null;
  },

  async getProfile(userId) {
    try {
      const rows = await SB.get('profiles', `?id=eq.${userId}&select=*`);
      return rows[0] || null;
    } catch { return null; }
  },

  _toEmail(username) {
    return `${username.toLowerCase().replace(/[^a-z0-9._-]/g, '_')}@mundial2026.app`;
  },

  async login(username, password) {
    const email = this._toEmail(username);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Usuario o contraseña incorrectos');
    this.setSession(data);
    return data;
  },

  async register(username, password, nombre) {
    const email = this._toEmail(username);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, password, data: { nombre, username } }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Error al registrar');
    return data;
  },

  async logout() {
    try {
      const session = this.getSession();
      if (session?.access_token) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY,
                     'Authorization': 'Bearer ' + session.access_token },
        });
      }
    } catch {}
    this.clearSession();
    window.location.href = getBasePath() + 'index.html';
  },

  async updatePassword(newPassword) {
    const session = this.getSession();
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY,
                 'Authorization': 'Bearer ' + session.access_token },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  isAdmin() {
    const profile = JSON.parse(localStorage.getItem('user_profile') || 'null');
    return profile?.es_admin === true;
  },

  async refreshSession() {
    const session = this.getSession();
    if (!session?.refresh_token) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (!res.ok) {
        this.clearSession();
        localStorage.removeItem('user_profile');
        return null;
      }
      const data = await res.json();
      this.setSession(data);
      return data;
    } catch {
      return null;
    }
  },

  isExpired() {
    const session = this.getSession();
    if (!session?.access_token) return true;
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      return (payload.exp - 60) < (Date.now() / 1000);
    } catch {
      return true;
    }
  },

  async ensureSession() {
    if (this.isExpired()) {
      const refreshed = await this.refreshSession();
      if (!refreshed) {
        window.location.href = getBasePath() + 'pages/login.html';
        return false;
      }
    }
    return true;
  },
};

// ── OPERACIONES DE BASE DE DATOS ────────────────────────────

const DB = {

  // ── PARTIDOS ──
  async getPartidos() {
    return SB.get('partidos', '?select=*&order=id.asc');
  },

  async updatePartido(id, data) {
    return SB.patch('partidos', `?id=eq.${id}`, data);
  },

  // ── ESTADÍSTICAS ──
  async getStats() {
    const rows = await SB.get('equipos_stats', '?select=*');
    const obj = {};
    rows.forEach(r => { obj[r.equipo] = { goles: r.goles, tarjetas: r.tarjetas, offsides: r.offsides, ranking: r.ranking }; });
    return obj;
  },

  async upsertStats(equipo, data) {
    const res = await fetch(`${SB.url}/rest/v1/equipos_stats`, {
      method: 'POST',
      headers: { ...SB.headers(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ equipo, ...data }),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async upsertStatsBulk(statsArray) {
    const res = await fetch(`${SB.url}/rest/v1/equipos_stats`, {
      method: 'POST',
      headers: { ...SB.headers(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(statsArray),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  // ── PREDICCIONES ──
  async getPredicciones(userId) {
    const rows = await SB.get('predicciones', `?user_id=eq.${userId}&select=*`);
    const obj = {};
    rows.forEach(r => { obj[r.partido_id] = { golesLocal: r.goles_local, golesVisitante: r.goles_visitante }; });
    return obj;
  },

  // ── UPSERT PRINCIPAL ──
  // Estrategia: GET para saber qué ya existe → INSERT para nuevos → PATCH para existentes.
  // No usa DELETE, respetando la política RLS de "solo admins borran".
  // No usa merge-duplicates porque la política de UPDATE bloquea el upsert interno de Postgres.
  async upsertPrediccionesBulk(userId, preds) {
  if (!preds.length) return [];

  // 1. Traer las predicciones que ya existen para estos partido_id
  const ids = preds.map(p => p.partido_id).join(',');
  let existentes = [];
  try {
    existentes = await SB.get(
      'predicciones',
      `?user_id=eq.${userId}&partido_id=in.(${ids})&select=partido_id`
    );
  } catch {
    existentes = [];
  }
  const setExistentes = new Set(existentes.map(r => r.partido_id));

  const paraInsertar   = preds.filter(p => !setExistentes.has(p.partido_id));
  const paraActualizar = preds.filter(p =>  setExistentes.has(p.partido_id));

  const errores = [];

  // 2. INSERT uno por uno (no en bloque) para manejar duplicados inesperados
  for (const p of paraInsertar) {
    const res = await fetch(`${SB.url}/rest/v1/predicciones`, {
      method: 'POST',
      headers: { ...SB.headers(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({ user_id: userId, ...p }),
    });
    if (!res.ok) {
      const err = await res.json();
      if (err.code === '23505') {
        // Duplicate key — ya existe aunque el GET no lo vio (race condition).
        // Reconvertir a PATCH en lugar de fallar.
        try {
          const resPatch = await fetch(
            `${SB.url}/rest/v1/predicciones?user_id=eq.${userId}&partido_id=eq.${p.partido_id}`,
            {
              method: 'PATCH',
              headers: { ...SB.headers(), 'Prefer': 'return=minimal' },
              body: JSON.stringify({ goles_local: p.goles_local, goles_visitante: p.goles_visitante }),
            }
          );
          if (!resPatch.ok && resPatch.status !== 403) {
            const errPatch = await resPatch.json();
            if (errPatch.code !== '42501') errores.push(errPatch);
          }
        } catch (e) { errores.push(e); }
      } else if (err.code !== '42501' && res.status !== 403) {
        errores.push(err);
      }
    }
  }

  // 3. PATCH para predicciones que ya existían
  for (const p of paraActualizar) {
    try {
      const res = await fetch(
        `${SB.url}/rest/v1/predicciones?user_id=eq.${userId}&partido_id=eq.${p.partido_id}`,
        {
          method: 'PATCH',
          headers: { ...SB.headers(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({ goles_local: p.goles_local, goles_visitante: p.goles_visitante }),
        }
      );
      if (!res.ok && res.status !== 403) {
        const err = await res.json();
        if (err.code !== '42501') errores.push(err);
      }
    } catch (e) { errores.push(e); }
  }

  if (errores.length) throw errores[0];
  return [];
},

  // ── PROFILES / USUARIOS ──
  async getProfiles() {
    return SB.get('profiles', '?select=*&order=nombre.asc');
  },

  async updateProfile(id, data) {
    return SB.patch('profiles', `?id=eq.${id}`, data);
  },

  async deleteProfile(id) {
    await SB.delete('predicciones', `?user_id=eq.${id}`);
    return SB.delete('profiles', `?id=eq.${id}`);
  },

  // ── TABLA DE LÍDERES (calculada en cliente) ──
  async calcularLideres() {
    const todasLasPredicciones = await this._getAllPredicciones();

    const [partidosFrescos, profiles] = await Promise.all([
      SB.get('partidos', '?select=*&order=id.asc'),
      DB.getProfiles(),
    ]);

    _partidosCache = partidosFrescos;

    return profiles.filter(p => !p.es_admin).map(p => {
      const misPreds = todasLasPredicciones.filter(x => x.user_id === p.id);
      let total = 0;
      misPreds.forEach(pred => {
        const partido = partidosFrescos.find(x => x.id === pred.partido_id);
        if (!partido || partido.estado !== 'finalizado') return;
        const pts = calcularPuntosRaw(
          { golesLocal: pred.goles_local, golesVisitante: pred.goles_visitante }, partido
        );
        total += pts || 0;
      });
      return { ...p, puntos: total };
    }).sort((a, b) => b.puntos - a.puntos);
  },

  // Trae TODAS las predicciones paginando de 1000 en 1000
  async _getAllPredicciones() {
    const pageSize = 1000;
    let todas = [];
    let offset = 0;
    while (true) {
      const res = await fetch(
        `${SB.url}/rest/v1/predicciones?select=*&order=id.asc&limit=${pageSize}&offset=${offset}`,
        { headers: { ...SB.headers(), 'Prefer': 'count=none' } }
      );
      if (!res.ok) throw await res.json();
      const page = await res.json();
      todas = todas.concat(page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }
    return todas;
  },
};

// ── HELPER PUNTOS (sin depender de localStorage) ────────────
function calcularPuntosRaw(pred, partido) {
  if (!pred || partido.estado !== 'finalizado') return null;
  const ra = partido.goles_local, rb = partido.goles_visitante;
  const pa = pred.golesLocal,     pb = pred.golesVisitante;
  if (pa === undefined || pa === null || pa === '') return null;
  if (pa === ra && pb === rb) return 5;
  let ganReal;
  if (partido.tiene_penales) {
    ganReal = (partido.penales_local || 0) > (partido.penales_visitante || 0) ? 'L' : 'V';
  } else {
    ganReal = ra > rb ? 'L' : rb > ra ? 'V' : 'E';
  }
  const ganPred = pa > pb ? 'L' : pb > pa ? 'V' : 'E';
  if (ganReal === ganPred && (ra - rb) === (pa - pb)) return 3;
  if (ganReal === ganPred) return 2;
  if ((ra + rb) === (pa + pb)) return 1;
  return 0;
}

function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}