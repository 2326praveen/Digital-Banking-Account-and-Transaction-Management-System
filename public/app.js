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
  const isPending = account.status === 'PENDING';
  return `
    <article class="account-card">
      <div class="account-card-top">
        <span class="account-type">${account.type}</span>
        <span class="status ${statusClass}">${account.status}</span>
      </div>
      <h3>${formatMoney(account.balance)}</h3>
      <div class="account-number" style="font-size: 13px; font-weight: 700; color: #1f5960; margin: 8px 0;">
        Account #: <strong>${account.accountNumber}</strong>
        <button class="copy-acc-btn" data-acc="${account.accountNumber}" style="margin-left: 8px; padding: 2px 8px; font-size: 10px; border-radius: 4px; background: #e8ede9; cursor: pointer;">Copy</button>
      </div>
      ${isPending ? `
        <div style="margin-top: 10px; padding: 8px 10px; background: #fff0cd; border-radius: 6px; font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
          <span>⏳ Awaiting Staff Approval</span>
          <button class="fast-approve-acc-btn" data-id="${account._id}" style="padding: 4px 8px; background: #1f5960; color: #fff; border-radius: 4px; font-size: 10px; font-weight: 700;">⚡ Fast-Approve (Demo)</button>
        </div>
      ` : ''}
      <div class="account-card-footer">
        Opened ${formatDate(account.createdAt)} 
        <span style="float:right">${account.dailyTransferLimit ? `Daily Limit: ${formatMoney(account.dailyTransferLimit)}` : ''}</span>
      </div>
    </article>
  `;
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

  // Attach fast-approve listener
  document.querySelectorAll('.fast-approve-acc-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await request(`/accounts/${btn.dataset.id}/approve`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'APPROVED', remarks: 'Fast-approved for testing demo' })
        });
        showToast('Account approved! It is now ACTIVE.');
        await loadDashboard();
      } catch (err) {
        showToast(err.message);
      }
    });
  });

  // Attach copy-acc-btn listener
  document.querySelectorAll('.copy-acc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(btn.dataset.acc);
      showToast(`Copied Account #${btn.dataset.acc}`);
    });
  });
}

function populateAccountSelects() {
  const activeAccounts = state.accounts.filter(account => account.status === 'ACTIVE');
  const options = activeAccounts.length ? activeAccounts.map(account => `<option value="${account._id}">${account.type} (#${account.accountNumber}) · ${formatMoney(account.balance)}</option>`).join('') : '<option value="">No active accounts available</option>';
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
  $('#kyc-note').textContent = state.user.kycStatus === 'VERIFIED' ? 'Your identity is verified' : 'Verification required';
  $('#today-label').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  
  // Show KYC alert banner if PENDING
  const kycAlert = $('#kyc-alert-box');
  if (kycAlert) {
    kycAlert.classList.toggle('hidden', state.user.kycStatus === 'VERIFIED');
  }

  // Display role badge
  const roleBadge = $('#current-role-badge');
  if (roleBadge) roleBadge.textContent = state.user.role || 'CUSTOMER';
  const emailDisplay = $('#user-email-display');
  if (emailDisplay) emailDisplay.textContent = state.user.email || '';

  // Show Staff tab if Staff/Admin
  const staffNav = $('#staff-nav-item');
  if (staffNav) {
    const isStaff = state.user.role === 'BANK_STAFF' || state.user.role === 'ADMIN';
    staffNav.classList.toggle('hidden', !isStaff);
    if (isStaff) loadStaffData();
  }
}

async function loadStaffData() {
  try {
    // 1. Load pending accounts
    const pendingRes = await request('/staff/pending-accounts');
    const pendingList = pendingRes.data || [];
    const tableWrap = $('#pending-accounts-table-wrap');
    if (tableWrap) {
      if (!pendingList.length) {
        tableWrap.innerHTML = '<p style="color: #5d706e; font-size: 13px;">No pending account applications.</p>';
      } else {
        tableWrap.innerHTML = `
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="text-align: left; border-bottom: 2px solid #dce1dc; color: #718083;">
                <th style="padding: 8px;">Account #</th>
                <th style="padding: 8px;">Type</th>
                <th style="padding: 8px;">Initial Deposit</th>
                <th style="padding: 8px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${pendingList.map(acc => `
                <tr style="border-bottom: 1px solid #dce1dc;">
                  <td style="padding: 10px 8px;"><strong>${acc.accountNumber}</strong><br><small style="color:#718083;">ID: ${acc._id}</small></td>
                  <td style="padding: 10px 8px;">${acc.type}</td>
                  <td style="padding: 10px 8px;">${formatMoney(acc.balance)}</td>
                  <td style="padding: 10px 8px;">
                    <button class="approve-btn" data-id="${acc._id}" style="padding: 5px 10px; background: #1f5960; color: #fff; border-radius: 4px; font-weight: 700; margin-right: 6px;">Approve</button>
                    <button class="reject-btn" data-id="${acc._id}" style="padding: 5px 10px; background: #b2574e; color: #fff; border-radius: 4px; font-weight: 700;">Reject</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        document.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', () => handleApproval(btn.dataset.id, 'APPROVED')));
        document.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', () => handleApproval(btn.dataset.id, 'REJECTED')));
      }
    }

    // 2. Load flagged transactions
    const flaggedRes = await request('/staff/flagged-transactions');
    const flaggedList = flaggedRes.data?.transactions || [];
    const flaggedWrap = $('#flagged-transactions-wrap');
    if (flaggedWrap) {
      if (!flaggedList.length) {
        flaggedWrap.innerHTML = '<p style="color: #5d706e; font-size: 13px;">No suspicious flagged transactions.</p>';
      } else {
        flaggedWrap.innerHTML = flaggedList.map(t => `
          <div style="padding: 10px; background: #f9e5e0; border-radius: 6px; margin-bottom: 8px; font-size: 12px;">
            <strong>${t.type} · ${formatMoney(t.amount)}</strong><br>
            <span style="color: #b2574e;">Reason: ${t.flagReason || 'High value'}</span><br>
            <small style="color: #718083;">Account: ${t.accountId}</small>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load staff portal data:', err);
  }
}

async function handleApproval(accountId, status) {
  try {
    await request(`/accounts/${accountId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ status, remarks: `Reviewed & ${status.toLowerCase()} by staff` })
    });
    showToast(`Account application ${status.toLowerCase()}!`);
    await loadStaffData();
  } catch (err) {
    showToast(err.message);
  }
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

// Demo role login chips
document.querySelectorAll('.role-chip').forEach(chip => chip.addEventListener('click', () => {
  $('#login-form input[name="email"]').value = chip.dataset.email;
  $('#login-form input[name="password"]').value = chip.dataset.pass;
  showToast(`Filled ${chip.textContent.trim()} credentials.`);
}));

// Quick fill beneficiary buttons
document.querySelectorAll('.quick-fill-ben').forEach(btn => {
  btn.addEventListener('click', () => {
    const accInput = $('#ben-acc-input');
    const nickInput = $('#ben-nick-input');
    if (accInput) accInput.value = btn.dataset.acc;
    if (nickInput) nickInput.value = btn.dataset.name;
    showToast(`Selected beneficiary: ${btn.dataset.name} (${btn.dataset.acc})`);
  });
});


// Instant Self-Verify KYC Button (Demo helper)
const selfVerifyBtn = $('#self-verify-kyc-btn');
if (selfVerifyBtn) {
  selfVerifyBtn.addEventListener('click', async () => {
    try {
      // Updates current customer's KYC
      await request(`/customers/${state.user.id}/kyc`, {
        method: 'PUT',
        body: JSON.stringify({ kycStatus: 'VERIFIED' })
      });
      state.user.kycStatus = 'VERIFIED';
      renderUser();
      showToast('KYC successfully verified! You can now open accounts.');
    } catch (err) {
      showToast(err.message);
    }
  });
}

// Freeze action form
const freezeForm = $('#freeze-action-form');
if (freezeForm) {
  freezeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    $('#freeze-message').textContent = '';
    try {
      const path = `/accounts/${data.accountId}/${data.action}`;
      const res = await request(path, {
        method: 'PUT',
        body: JSON.stringify({ reason: data.reason })
      });
      showToast(res.message || 'Status updated');
      freezeForm.reset();
    } catch (err) {
      $('#freeze-message').textContent = err.message;
    }
  });
}

// Run monthly interest button
const runInterestBtn = $('#run-interest-btn');
if (runInterestBtn) {
  runInterestBtn.addEventListener('click', async () => {
    try {
      const res = await request('/staff/interest/run', { method: 'POST' });
      showToast(res.message || 'Interest calculation executed');
    } catch (err) {
      showToast(err.message);
    }
  });
}

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
  if (button.dataset.view === 'staff') loadStaffData();
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
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  try {
    await request('/beneficiaries', { method: 'POST', body: JSON.stringify(values) });
    form.reset();
    await loadBeneficiaries(values.accountId);
    $('#beneficiary-account').value = values.accountId;
    showToast('Beneficiary saved.');
  } catch (error) { $('#beneficiary-message').textContent = error.message; }
});

$('#transfer-form').addEventListener('submit', async event => {
  event.preventDefault();
  $('#transfer-message').textContent = '';
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  try {
    const result = await request('/transactions/transfer', { method: 'POST', body: JSON.stringify({ ...values, amount: Number(values.amount) }) });
    await loadDashboard();
    form.reset();
    showToast(`Transfer complete · ${formatMoney(result.data.amount)}`);
  } catch (error) { $('#transfer-message').textContent = error.message; }
});

$('#account-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  try {
    await request('/accounts', { method: 'POST', body: JSON.stringify({ ...values, initialDeposit: Number(values.initialDeposit) }) });
    $('#account-dialog').close();
    await loadDashboard();
    showToast('Account application submitted.');
    form.reset();
  } catch (error) { setAccountMessage(error.message); }
});

if (state.token) loadDashboard();
