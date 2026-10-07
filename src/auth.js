// Supabase konfiguratsiya
const SUPABASE_URL = 'https://tborpvwoqceigeqhtpkh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib3JwdndvcWNlaWdlcWh0cGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MDExMDgsImV4cCI6MjEwNjk3NzEwOH0.ETB41QM7LSgkXpqir-Z-3CZqXk_CL5oSLMkURC53AHQ';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// Foydalanuvchi holatini tekshirish
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  updateAuthUI();
}

// UI ni yangilash
function updateAuthUI() {
  const statusEl = document.getElementById('auth-status');
  if (currentUser) {
    statusEl.innerHTML = `
      <span style="font-size:12px;color:#666;">${currentUser.email}</span>
      <button id="logoutBtn" style="margin-left:10px;padding:5px 10px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Chiqish</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    statusEl.innerHTML = `
      <button id="loginBtn" style="padding:5px 10px;background:#4F46E5;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Kirish</button>
    `;
    document.getElementById('loginBtn').addEventListener('click', showAuthModal);
  }
}

// Auth modal ko'rsatish
function showAuthModal() {
  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:30px;max-width:400px;width:90%;">
      <h2 style="margin-bottom:20px;">Kirish / Ro'yxatdan o'tish</h2>
      <input type="email" id="authEmail" placeholder="Email" style="width:100%;padding:10px;margin-bottom:10px;border:1px solid #ccc;border-radius:6px;">
      <input type="password" id="authPassword" placeholder="Parol" style="width:100%;padding:10px;margin-bottom:20px;border:1px solid #ccc;border-radius:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button id="loginSubmit" style="padding:10px;background:#4F46E5;color:white;border:none;border-radius:6px;cursor:pointer;">Kirish</button>
        <button id="signupSubmit" style="padding:10px;background:#10B981;color:white;border:none;border-radius:6px;cursor:pointer;">Ro'yxatdan o'tish</button>
      </div>
      <button id="closeAuth" style="margin-top:10px;width:100%;padding:10px;background:#eee;border:none;border-radius:6px;cursor:pointer;">Bekor qilish</button>
    </div>
  `;
  document.body.appendChild(modal);
  
  document.getElementById('closeAuth').addEventListener('click', () => modal.remove());
  document.getElementById('loginSubmit').addEventListener('click', login);
  document.getElementById('signupSubmit').addEventListener('click', signup);
}

// Kirish
async function login() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert('Xato: ' + error.message);
  else {
    document.getElementById('authModal').remove();
    checkAuth();
  }
}

// Ro'yxatdan o'tish
async function signup() {
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) alert('Xato: ' + error.message);
  else {
    alert('Ro\'yxatdan o\'tdingiz! Endi tizimga kiring.');
    document.getElementById('authModal').remove();
  }
}

// Chiqish
async function logout() {
  await supabase.auth.signOut();
  currentUser = null;
  updateAuthUI();
}

// Foydalanuvchi auth qilinganmi?
export function isAuthenticated() {
  return currentUser !== null;
}

// Foydalanuvchi email
export function getUserEmail() {
  return currentUser?.email || '';
}

// Sahifa yuklanganda tekshirish
checkAuth();
