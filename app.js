const state = {
  user: null,
  transactions: [],
  budget: 0,
};

const API_BASE_URL = (() => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const origin = window.location.origin;

  if (origin && origin !== 'null') {
    if (port === '5050' || hostname === 'localhost' && port === '5050' || hostname === '127.0.0.1' && port === '5050') {
      return origin;
    }

    if (port === '5500' || port === '8000' || port === '4173' || !port) {
      return 'http://localhost:5050';
    }
  }

  return 'http://localhost:5050';
})();

const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const authTabs = document.querySelectorAll('.auth-tab');
const signinMessage = document.getElementById('signinMessage');
const signupMessage = document.getElementById('signupMessage');
const form = document.getElementById('transactionForm');
const transactionList = document.getElementById('transactionList');
const typeFilter = document.getElementById('typeFilter');
const searchInput = document.getElementById('searchInput');
const logoutBtn = document.getElementById('logoutBtn');
const userNameTag = document.getElementById('userNameTag');
const userAvatar = document.getElementById('userAvatar');
const categoryBreakdown = document.getElementById('categoryBreakdown');
const insightList = document.getElementById('insightList');
const budgetInput = document.getElementById('budgetInput');
const budgetSaveBtn = document.getElementById('budgetSaveBtn');
const budgetProgress = document.getElementById('budgetProgress');
const budgetText = document.getElementById('budgetText');
const budgetSpentLabel = document.getElementById('budgetSpentLabel');
const budgetStatus = document.getElementById('budgetStatus');
const balanceValue = document.getElementById('balanceValue');
const incomeValue = document.getElementById('incomeValue');
const expenseValue = document.getElementById('expenseValue');

const savingIdeas = [
  {
    title: 'Grocery savings',
    points: [
      'Plan a 7-day meal list before you shop to avoid impulse buys.',
      'Use store-brand staples and compare unit prices when buying in bulk.',
      'Keep a weekly grocery cap and treat extra spending as a challenge.',
    ],
  },
  {
    title: 'Transport savings',
    points: [
      'Group errands into one trip to cut fuel and parking costs.',
      'Choose public transit or carpooling on days with heavy traffic.',
      'Track weekly rides and remove non-essential travel when your budget dips.',
    ],
  },
  {
    title: 'Bills and utilities',
    points: [
      'Set reminders to review plans and switch to cheaper providers.',
      'Reduce power usage by unplugging idle devices and adjusting temperature settings.',
      'Use a fixed payment calendar so you avoid late fees and surprise expenses.',
    ],
  },
  {
    title: 'Shopping control',
    points: [
      'Wait 24 hours before buying non-essential items to reduce impulse spending.',
      'Set a monthly wishlist and buy only from your planned budget.',
      'Use a no-buy rule for 1 weekend per month to reset your habits.',
    ],
  },
];

const defaultDate = () => new Date().toISOString().split('T')[0];
const defaultTime = () => new Date().toTimeString().slice(0, 5);

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0);
}

async function apiRequest(path, options = {}) {
  try {
    const url = /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}${path}`;
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(!options.headers || !options.headers['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });

    const rawText = await response.text();
    let payload = {};

    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch (error) {
        payload = { error: rawText };
      }
    }

    if (!response.ok) {
      throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
    }

    return payload;
  } catch (error) {
    if (error instanceof TypeError && /fetch|network|Failed to fetch/i.test(error.message)) {
      throw new Error('Unable to reach the server. Please start the app and try again.');
    }
    throw error;
  }
}

function setAuthTab(tabName) {
  const isSignin = tabName === 'signin';
  authTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.auth === tabName);
  });
  signInForm.classList.toggle('active', isSignin);
  signUpForm.classList.toggle('active', !isSignin);
}

function showApp() {
  if (!state.user) {
    authView.classList.remove('hidden');
    appView.classList.add('hidden');
    return;
  }

  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  userNameTag.textContent = state.user.name;
  userAvatar.textContent = state.user.name.charAt(0).toUpperCase();
  document.getElementById('date').value = defaultDate();
  document.getElementById('time').value = defaultTime();
  renderDashboard();
}

function formatTimeLabel(timeValue) {
  if (!timeValue) return '—';
  const [hours, minutes] = String(timeValue).split(':');
  const parsedHours = Number(hours);
  const suffix = parsedHours >= 12 ? 'PM' : 'AM';
  const twelveHour = parsedHours % 12 || 12;
  return `${twelveHour}:${minutes} ${suffix}`;
}

function renderSummary() {
  const totals = state.transactions.reduce(
    (acc, transaction) => {
      if (transaction.type === 'income') {
        acc.income += Number(transaction.amount);
      } else {
        acc.expense += Number(transaction.amount);
      }
      return acc;
    },
    { income: 0, expense: 0 }
  );

  totals.balance = totals.income - totals.expense;
  balanceValue.textContent = formatCurrency(totals.balance);
  incomeValue.textContent = formatCurrency(totals.income);
  expenseValue.textContent = formatCurrency(totals.expense);
  balanceValue.style.color = totals.balance >= 0 ? '#12b886' : '#ef476f';
}

function renderBudget() {
  const monthlyBudget = Number(state.budget || 0);
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const expenses = (state.transactions || []).filter((transaction) => {
    const date = new Date(transaction.date);
    return transaction.type === 'expense' && date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });

  const spent = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const share = monthlyBudget > 0 ? Math.min((spent / monthlyBudget) * 100, 100) : 0;
  const remaining = monthlyBudget - spent;

  budgetProgress.style.width = `${Math.max(share, 0)}%`;
  budgetText.textContent = `${formatCurrency(spent)} of ${formatCurrency(monthlyBudget)}`;
  budgetSpentLabel.textContent = formatCurrency(spent);

  if (monthlyBudget <= 0) {
    budgetStatus.textContent = 'Set budget';
    budgetStatus.className = 'budget-status';
    return;
  }

  if (remaining >= 0) {
    budgetStatus.textContent = 'On track';
    budgetStatus.className = 'budget-status';
  } else {
    budgetStatus.textContent = 'Over budget';
    budgetStatus.className = 'budget-status danger';
  }

  if (share > 75 && share < 100) {
    budgetStatus.textContent = 'Watch it';
    budgetStatus.className = 'budget-status warning';
  }
}

function renderCategoryBreakdown() {
  const expenses = (state.transactions || []).filter((transaction) => transaction.type === 'expense');
  const totals = expenses.reduce((acc, transaction) => {
    acc[transaction.category] = (acc[transaction.category] || 0) + Number(transaction.amount);
    return acc;
  }, {});

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    categoryBreakdown.innerHTML = '<li class="empty-state">No expense data yet.</li>';
    return;
  }

  const max = Math.max(...entries.map((entry) => entry[1]));
  const palette = ['#6157f8', '#12b886', '#f59e0b', '#ef476f', '#0ea5e9', '#a78bfa'];

  categoryBreakdown.innerHTML = entries
    .map(([category, amount], index) => {
      const width = (amount / max) * 100;
      return `
        <li class="category-item">
          <div class="category-left">
            <span class="cat-dot" style="background:${palette[index % palette.length]};"></span>
            <div class="category-meta">
              <strong>${category}</strong>
              <span>${formatCurrency(amount)}</span>
            </div>
          </div>
          <span>${Math.round(width)}%</span>
        </li>
      `;
    })
    .join('');
}

function renderInsights() {
  const expenses = state.transactions.filter((item) => item.type === 'expense');
  const income = state.transactions.filter((item) => item.type === 'income');

  const topExpenseCategory = Object.entries(
    expenses.reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + Number(transaction.amount);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];

  const currentMonthExpenses = expenses.filter((item) => {
    const date = new Date(item.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, item) => sum + Number(item.amount), 0);

  const biggestIncome = income.length
    ? income.reduce((max, item) => (Number(item.amount) > Number(max.amount) ? item : max), income[0])
    : null;

  const insights = [
    {
      label: topExpenseCategory ? 'Top category' : 'No spending yet',
      value: topExpenseCategory ? topExpenseCategory[0] : 'Add a spend',
      detail: topExpenseCategory ? formatCurrency(topExpenseCategory[1]) : 'Your first expense is waiting',
    },
    {
      label: 'Monthly spend',
      value: formatCurrency(currentMonthExpenses),
      detail: 'This month so far',
    },
    {
      label: 'Biggest income',
      value: biggestIncome ? biggestIncome.title : 'No income',
      detail: biggestIncome ? formatCurrency(biggestIncome.amount) : 'No income logged yet',
    },
  ];

  insightList.innerHTML = insights
    .map(
      (insight) => `
        <li class="insight-item">
          <div class="insight-left">
            <div class="insight-meta">
              <span>${insight.label}</span>
              <strong>${insight.value}</strong>
            </div>
          </div>
          <span>${insight.detail}</span>
        </li>
      `
    )
    .join('');
}

function renderSavingWays() {
  const container = document.getElementById('savingWays');
  if (!container) return;

  container.innerHTML = savingIdeas
    .map(
      (idea, index) => `
        <div class="saving-card ${index === 0 ? 'active' : ''}">
          <button type="button" data-index="${index}">
            <span class="saving-header">
              <span>${idea.title}</span>
              <span class="saving-arrow">⌄</span>
            </span>
          </button>
          <div class="saving-points">
            <ul>
              ${idea.points.map((point) => `<li>${point}</li>`).join('')}
            </ul>
          </div>
        </div>
      `
    )
    .join('');
}

function renderTransactions() {
  const filterValue = typeFilter.value;
  const searchTerm = (searchInput.value || '').trim().toLowerCase();
  const visibleTransactions = [...state.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((transaction) => {
      const matchesType = filterValue === 'all' || transaction.type === filterValue;
      const matchesSearch = !searchTerm || transaction.title.toLowerCase().includes(searchTerm);
      return matchesType && matchesSearch;
    });

  if (!visibleTransactions.length) {
    transactionList.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">No matching transactions found.</td>
      </tr>
    `;
    return;
  }

  transactionList.innerHTML = visibleTransactions
    .map(
      (transaction) => `
        <tr>
          <td>${transaction.title}</td>
          <td>${transaction.category}</td>
          <td>${new Date(transaction.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}</td>
          <td>${formatTimeLabel(transaction.time)}</td>
          <td>
            <span class="type-pill ${transaction.type}">${transaction.type}</span>
          </td>
          <td class="${transaction.type === 'income' ? 'amount-positive' : 'amount-negative'}">
            ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)}
          </td>
          <td>
            <button class="delete-button" data-id="${transaction.id}" type="button">Delete</button>
          </td>
        </tr>
      `
    )
    .join('');
}

function renderDashboard() {
  if (!state.user) {
    showApp();
    return;
  }

  renderSummary();
  renderBudget();
  renderCategoryBreakdown();
  renderInsights();
  renderSavingWays();
  renderTransactions();
}

async function loadDashboard() {
  try {
    const data = await apiRequest('/api/dashboard');
    state.user = data.user;
    state.transactions = data.transactions || [];
    state.budget = data.budget || 0;
    renderDashboard();
    return true;
  } catch (error) {
    signinMessage.textContent = error.message;
    state.user = null;
    showApp();
    return false;
  }
}

async function initializeApp() {
  const isDashboardRoute = window.location.pathname === '/dashboard/' || window.location.pathname === '/dashboard';

  if (isDashboardRoute) {
    const loaded = await loadDashboard();
    if (!loaded) {
      window.location.assign('/');
    }
    return;
  }

  showApp();
}

async function handleSignUp(event) {
  event.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value.trim();

  if (!name || !email || !password) {
    signupMessage.textContent = 'Please fill in all fields.';
    return;
  }

  try {
    const response = await apiRequest('/api/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    state.user = response.user;
    signUpForm.reset();
    signupMessage.textContent = '';
    await loadDashboard();
    showApp();
  } catch (error) {
    signupMessage.textContent = error.message;
  }
}

async function handleSignIn(event) {
  event.preventDefault();
  const email = document.getElementById('signinEmail').value.trim().toLowerCase();
  const password = document.getElementById('signinPassword').value.trim();

  if (!email || !password) {
    signinMessage.textContent = 'Please fill in all fields.';
    return;
  }

  try {
    const response = await apiRequest('/api/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    state.user = response.user;
    signinMessage.textContent = '';
    signInForm.reset();
    await loadDashboard();
    showApp();
  } catch (error) {
    signinMessage.textContent = error.message;
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const rawAmount = Number(formData.get('amount'));
  const title = String(formData.get('title')).trim();
  const date = String(formData.get('date'));

  if (!title || !date || Number.isNaN(rawAmount) || rawAmount <= 0) {
    alert('Please enter a valid title, date, and amount greater than zero.');
    return;
  }

  try {
    await apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        title,
        amount: rawAmount,
        category: formData.get('category'),
        type: formData.get('type'),
        date,
        time: formData.get('time') || defaultTime(),
      }),
    });

    form.reset();
    document.getElementById('date').value = defaultDate();
    document.getElementById('time').value = defaultTime();
    document.getElementById('type').value = 'expense';
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
}

async function handleDelete(event) {
  const button = event.target.closest('.delete-button');
  if (!button) return;

  const id = Number(button.dataset.id);
  try {
    await apiRequest(`/api/transactions/${id}`, { method: 'DELETE' });
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
}

async function handleSaveBudget() {
  const value = Number(budgetInput.value);
  if (!value || value <= 0) {
    alert('Enter a valid budget value greater than zero.');
    return;
  }

  try {
    const response = await apiRequest('/api/budget', {
      method: 'POST',
      body: JSON.stringify({ budget: value }),
    });
    state.budget = response.budget || value;
    budgetInput.value = '';
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
}

async function onLogout() {
  try {
    await apiRequest('/api/logout', { method: 'POST' });
  } catch (error) {
    console.error(error);
  }

  state.user = null;
  state.transactions = [];
  state.budget = 0;
  authView.classList.remove('hidden');
  appView.classList.add('hidden');
  signInForm.reset();
  signUpForm.reset();
  signinMessage.textContent = '';
  signupMessage.textContent = '';
  window.location.assign('/');
}

signInForm.addEventListener('submit', handleSignIn);
signUpForm.addEventListener('submit', handleSignUp);
authTabs.forEach((tab) => {
  tab.addEventListener('click', () => setAuthTab(tab.dataset.auth));
});
form.addEventListener('submit', handleSubmit);
transactionList.addEventListener('click', handleDelete);
typeFilter.addEventListener('change', renderDashboard);
searchInput.addEventListener('input', renderDashboard);
budgetSaveBtn.addEventListener('click', handleSaveBudget);
logoutBtn.addEventListener('click', onLogout);

const savingWaysContainer = document.getElementById('savingWays');
savingWaysContainer?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-index]');
  if (!button) return;

  const card = button.closest('.saving-card');
  if (!card) return;

  const isActive = card.classList.contains('active');
  document.querySelectorAll('.saving-card').forEach((item) => item.classList.remove('active'));
  if (!isActive) {
    card.classList.add('active');
  }
});

document.getElementById('date').value = defaultDate();
document.getElementById('time').value = defaultTime();
initializeApp();
