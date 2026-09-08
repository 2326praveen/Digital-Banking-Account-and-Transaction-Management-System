const state = { token: localStorage.getItem('northstar_token'), user: null, accounts: [] };
const beneficiaryState = new Map();
const $ = (selector) => document.querySelector(selector);

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3200);
}

function setAuthMessage(message = '') { $('#auth-message').textContent = message; }
function setAccountMessage(message = '') { $('#account-message').textContent = message; }
function formatMoney(value) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0); }
function formatDate(value) { return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Something went wrong. Please try again.');
  return body;
}

function showApp() {
  $('#auth-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
}
function showAuth() {
  $('#app-view').classList.add('hidden');
  $('#auth-view').classList.remove('hidden');
}

function accountCard(account) {
  const statusClass = account.status.toLowerCase();
  return `<article class="account-card"><div class="account-card-top"><span class="account-type">${account.type}</span><span class="status ${statusClass}">${account.status}</span></div><h3>${formatMoney(account.balance)}</h3><div class="account-number">•••• ${String(account.accountNumber).slice(-4)}</div><div class="account-card-footer">Opened ${formatDate(account.createdAt)} <span style="float:right">${account.dailyTransferLimit ? `Limit ${formatMoney(account.dailyTransferLimit)}` : ''}</span></div></article>`;
}

function renderAccounts() {
  const html = state.accounts.map(accountCard).join('');
  $('#account-list').innerHTML = html;
  $('#account-list-two').innerHTML = html;
  $('#no-accounts').classList.toggle('hidden', state.accounts.length > 0);
  const total = state.accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const active = state.accounts.filter(account => account.status === 'ACTIVE').reduce((sum, account) => sum + Number(account.balance || 0), 0);
  $('#total-balance').textContent = formatMoney(total);
  $('#available-balance').textContent = formatMoney(active);
  $('#account-count').textContent = `${state.accounts.length} ${state.accounts.length === 1 ? 'account' : 'accounts'}`;
  populateAccountSelects();
}

function populateAccountSelects() {
  const activeAccounts = state.accounts.filter(account => account.status === 'ACTIVE');
  const options = activeAccounts.length ? activeAccounts.map(account => `<option value="${account._id}">${account.type} •••• ${String(account.accountNumber).slice(-4)} · ${formatMoney(account.balance)}</option>`).join('') : '<option value="">No active accounts available</option>';
  $('#transfer-account').innerHTML = options;
  $('#beneficiary-account').innerHTML = options;
  loadBeneficiaries(activeAccounts[0]?._id);
}

function renderBeneficiaries(accountId) {
  const beneficiaries = beneficiaryState.get(accountId) || [];
  $('#transfer-beneficiary').innerHTML = beneficiaries.length ? '<option value="">Select a beneficiary</option>' + beneficiaries.map(item => `<option value="${item._id}">${item.nickname} · ${item.beneficiaryAccountNumber}</option>`).join('') : '<option value="">No beneficiaries saved</option>';
  $('#beneficiary-list').innerHTML = beneficiaries.length ? beneficiaries.map(item => `<div class="beneficiary-item"><div class="beneficiary-identity"><span class="beneficiary-avatar">${item.nickname.slice(0, 2).toUpperCase()}</span><div><strong>${item.nickname}</strong><small>${item.beneficiaryAccountNumber}</small></div></div><button class="delete-beneficiary" data-id="${item._id}" title="Delete beneficiary">×</button></div>`).join('') : '<div class="list-placeholder">No beneficiaries saved for this account yet.</div>';
  document.querySelectorAll('.delete-beneficiary').forEach(button => button.addEventListener('click', () => deleteBeneficiary(button.dataset.id, accountId)));
}

async function loadBeneficiaries(accountId) {
  if (!accountId) { renderBeneficiaries(''); return; }
  try {
    const result = await request(`/beneficiaries/account/${accountId}`);
    beneficiaryState.set(accountId, result.data || []);
    renderBeneficiaries(accountId);
  } catch (error) { $('#beneficiary-list').innerHTML = `<div class="list-placeholder">${error.message}</div>`; }
}

async function deleteBeneficiary(id, accountId) {
  try { await request(`/beneficiaries/${id}`, { method: 'DELETE' }); await loadBeneficiaries(accountId); showToast('Beneficiary removed.'); } catch (error) { showToast(error.message); }
}

function renderUser() {
  const firstName = (state.user.name || 'there').split(' ')[0];
  $('#user-first-name').textContent = `, ${firstName}`;
  $('#user-avatar').textContent = state.user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  $('#kyc-status').textContent = state.user.kycStatus;
  $('#kyc-note').textContent = state.user.kycStatus === 'VERIFIED' ? 'Your identity is verified' : 'Verification still required';
  $('#today-label').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

async function loadDashboard() {
  try {
    const [profile, accounts] = await Promise.all([request('/customers/me'), request('/accounts')]);
    state.user = profile.data;
    state.accounts = accounts.data || [];
    renderUser();
    renderAccounts();
    showApp();
  } catch (error) {
    localStorage.removeItem('northstar_token');
    state.token = null;
    showAuth();
  }
}

function openAccountDialog() { setAccountMessage(''); $('#account-dialog').showModal(); }

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setAuthMessage('');
  const form = new FormData(event.currentTarget);
  try {
    const result = await request('/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) });
    state.token = result.data.token;
    localStorage.setItem('northstar_token', state.token);
    await loadDashboard();
    showToast('Welcome back to Northstar.');
  } catch (error) { setAuthMessage(error.message); }
});

$('#register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  setAuthMessage('');
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await request('/auth/register', { method: 'POST', body: JSON.stringify(values) });
    $('#login-form input[name="email"]').value = values.email;
    $('#auth-title').innerHTML = 'Sign in to your<br><span>financial home.</span>';
    $('#auth-eyebrow').textContent = 'Account created';
    $('#auth-subtitle').textContent = 'Your account is ready when you are.';
    $('#register-form').classList.add('hidden');
    $('#login-form').classList.remove('hidden');
    $('#switch-copy').textContent = 'Already with Northstar?';
    $('#switch-auth').textContent = 'Sign in';
    setAuthMessage('Registration complete. Sign in to continue.');
  } catch (error) { setAuthMessage(error.message); }
});

$('#switch-auth').addEventListener('click', () => {
  const registering = !$('#register-form').classList.contains('hidden');
  $('#login-form').classList.toggle('hidden', !registering);
  $('#register-form').classList.toggle('hidden', registering);
  $('#auth-eyebrow').textContent = registering ? 'Welcome back' : 'First things first';
  $('#auth-title').innerHTML = registering ? 'Sign in to your<br><span>financial home.</span>' : 'Start your<br><span>financial home.</span>';
  $('#auth-subtitle').textContent = registering ? 'Your accounts, at a glance.' : 'A better view starts here.';
  $('#switch-copy').textContent = registering ? 'New to Northstar?' : 'Already with Northstar?';
  $('#switch-auth').textContent = registering ? 'Create an account' : 'Sign in';
  setAuthMessage('');
});

document.querySelectorAll('.password-toggle').forEach(button => button.addEventListener('click', () => {
  const input = document.querySelector(`#${button.dataset.target} input[type="password"], #${button.dataset.target} input[type="text"]`);
  input.type = input.type === 'password' ? 'text' : 'password';
  button.textContent = input.type === 'password' ? 'Show' : 'Hide';
}));

document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  document.querySelectorAll('.content').forEach(view => view.classList.add('hidden'));
  $(`#${button.dataset.view}-view`).classList.remove('hidden');
  $('.sidebar').classList.remove('open');
  if (button.dataset.view === 'payments') populateAccountSelects();
}));

$('#logout-button').addEventListener('click', () => { localStorage.removeItem('northstar_token'); state.token = null; state.user = null; showAuth(); });
$('#new-account-button').addEventListener('click', openAccountDialog);
$('#new-account-button-two').addEventListener('click', openAccountDialog);
$('#empty-open-button').addEventListener('click', openAccountDialog);
$('.mobile-menu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
$('#transfer-account').addEventListener('change', event => loadBeneficiaries(event.target.value));
$('#beneficiary-account').addEventListener('change', event => loadBeneficiaries(event.target.value));

$('#beneficiary-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('#beneficiary-message').textContent = '';
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await request('/beneficiaries', { method: 'POST', body: JSON.stringify(values) });
    event.currentTarget.reset();
    await loadBeneficiaries(values.accountId);
    $('#beneficiary-account').value = values.accountId;
    showToast('Beneficiary saved.');
  } catch (error) { $('#beneficiary-message').textContent = error.message; }
});

$('#transfer-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('#transfer-message').textContent = '';
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    const result = await request('/transactions/transfer', { method: 'POST', body: JSON.stringify({ ...values, amount: Number(values.amount) }) });
    await loadDashboard();
    event.currentTarget.reset();
    showToast(`Transfer complete · ${formatMoney(result.data.amount)}`);
  } catch (error) { $('#transfer-message').textContent = error.message; }
});

$('#account-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await request('/accounts', { method: 'POST', body: JSON.stringify({ ...values, initialDeposit: Number(values.initialDeposit) }) });
    $('#account-dialog').close();
    await loadDashboard();
    showToast('Account application submitted.');
    event.currentTarget.reset();
  } catch (error) { setAccountMessage(error.message); }
});

if (state.token) loadDashboard();
