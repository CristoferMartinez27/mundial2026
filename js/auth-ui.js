// ============================================================
//  auth-ui.js — Helpers de UI para navegación y sesión
// ============================================================

function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}

function renderAuthArea() {
  const area = document.getElementById('authArea');
  if (!area) return;
  const session = SBAuth.getSession();
  const profile = JSON.parse(localStorage.getItem('user_profile') || 'null');
  if (session && profile) {
    area.innerHTML = `
      <span style="color:var(--text-dim);font-size:.8rem;margin-right:.5rem">
        ${profile.es_admin ? '🔑' : '👤'} ${profile.nombre}
      </span>
      ${profile.es_admin
        ? `<a href="${getBasePath()}pages/admin.html" class="btn-nav" style="margin-right:.4rem">Admin</a>`
        : ''}
      <button onclick="SBAuth.logout()"
        style="background:#c0392b;border:1px solid #e74c3c;color:#fff;font-weight:700;
               padding:.35rem .8rem;border-radius:5px;cursor:pointer;font-size:.82rem">
        🚪 Salir
      </button>
    `;
  } else {
    area.innerHTML = `<a href="${getBasePath()}pages/login.html" class="btn-nav">Entrar</a>`;
  }
}

function requiereLogin() {
  if (!SBAuth.getSession()) {
    window.location.href = getBasePath() + 'pages/login.html';
    return false;
  }
  return true;
}

function requiereAdmin() {
  const profile = JSON.parse(localStorage.getItem('user_profile') || 'null');
  if (!SBAuth.getSession() || !profile?.es_admin) {
    alert('Acceso solo para administrador.');
    window.location.href = getBasePath() + 'index.html';
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', renderAuthArea);
