/* =====================================================================
   STORAGE HELPERS
   All data is kept in the browser's localStorage. Nothing is sent to
   a server. Replace this layer with real API calls if you build a
   backend later.
===================================================================== */
const USERS_KEY = 'labscan_users';
const SESSION_KEY = 'labscan_session';

function getUsers(){
  return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
}
function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function getHistoryKey(id){ return 'labscan_history_' + id; }
function getHistory(id){
  return JSON.parse(localStorage.getItem(getHistoryKey(id)) || '[]');
}
function saveHistory(id, list){
  localStorage.setItem(getHistoryKey(id), JSON.stringify(list));
}

/* Simple client-side password hashing using SubtleCrypto (SHA-256).
   NOTE: this is fine for a student prototype / local demo, but is not
   a substitute for real server-side auth in a production system. */
async function hashPassword(password){
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

/* =====================================================================
   AUTH: REGISTER / LOGIN / LOGOUT
===================================================================== */
function switchTab(which){
  document.getElementById('tab-login').classList.toggle('active', which==='login');
  document.getElementById('tab-register').classList.toggle('active', which==='register');
  document.getElementById('form-login').classList.toggle('hidden', which!=='login');
  document.getElementById('form-register').classList.toggle('hidden', which!=='register');
}

async function handleRegister(e){
  e.preventDefault();
  const id = document.getElementById('reg-id').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;
  const msg = document.getElementById('register-msg');

  if(pass !== pass2){
    msg.textContent = 'Passwords do not match.';
    msg.className = 'form-msg err';
    return false;
  }

  const users = getUsers();
  if(users[id]){
    msg.textContent = 'That Lab Assistant ID is already registered.';
    msg.className = 'form-msg err';
    return false;
  }

  users[id] = { passwordHash: await hashPassword(pass), createdAt: new Date().toISOString() };
  saveUsers(users);

  msg.textContent = 'Account created. You can log in now.';
  msg.className = 'form-msg ok';
  document.getElementById('form-register').reset();
  setTimeout(() => switchTab('login'), 700);
  return false;
}

async function handleLogin(e){
  e.preventDefault();
  const id = document.getElementById('login-id').value.trim();
  const pass = document.getElementById('login-pass').value;
  const msg = document.getElementById('login-msg');

  const users = getUsers();
  if(!users[id]){
    msg.textContent = 'No account found with that ID.';
    msg.className = 'form-msg err';
    return false;
  }

  const hash = await hashPassword(pass);
  if(users[id].passwordHash !== hash){
    msg.textContent = 'Incorrect password.';
    msg.className = 'form-msg err';
    return false;
  }

  localStorage.setItem(SESSION_KEY, id);
  enterDashboard(id);
  return false;
}

function showView(viewName){
  ['view-auth', 'view-mode-select', 'view-dashboard', 'view-batch'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden');
  });
  const target = document.getElementById('view-' + viewName);
  if(target) target.classList.remove('hidden');
}

function handleLogout(){
  localStorage.removeItem(SESSION_KEY);
  showView('auth');
  document.getElementById('session-info').innerHTML = '';
}

function enterDashboard(id){
  document.getElementById('session-info').innerHTML =
    `<span>Signed in as <b>${escapeHtml(id)}</b></span><button class="btn-ghost" onclick="handleLogout()">Log Out</button>`;
  showView('mode-select');
  renderHistory(id);
}

/* Restore session and setup Drag & Drop on page load */
window.addEventListener('DOMContentLoaded', () => {
  const savedSession = localStorage.getItem(SESSION_KEY);
  if(savedSession && getUsers()[savedSession]){
    enterDashboard(savedSession);
  }

  const dropZone = document.getElementById('drop-zone');
  if(dropZone){
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-active'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-active'), false);
    });
    dropZone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if(files.length > 0) processFile(files[0]);
    }, false);
  }
});

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* Toggle password visibility */
function togglePasswordVisibility(inputId, btn){
  const input = document.getElementById(inputId);
  if(!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  const eyeIcon = `<svg class="eye-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const eyeOffIcon = `<svg class="eye-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24L1 1l22 22"></path></svg>`;

  btn.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
}

/* =====================================================================
   RANGE SLIDER SYNC
===================================================================== */
function syncVal(inputId, labelId){
  document.getElementById(labelId).textContent = document.getElementById(inputId).value;
}

function updateAutoAge(){
  const yearInput = document.getElementById('in-year');
  if(!yearInput) return;
  const yearVal = Number(yearInput.value);
  if(yearVal && yearVal >= 1900 && yearVal <= 2026){
    const age = Math.max(0, 2026 - yearVal);
    document.getElementById('in-age').value = age;
    document.getElementById('in-age-display').value = `${age} yrs`;
  } else {
    document.getElementById('in-age').value = 0;
    document.getElementById('in-age-display').value = '--';
  }
}

/* =====================================================================
   DECISION MODEL
   Five criteria are each converted to a 0-100 "risk" sub-score
   (higher = stronger case for replacement), then combined using
   fixed weights into one composite risk score.

   Weights (sum to 100):
     Age                    20%
     Performance            30%
     Repair frequency       10%
     Maintenance cost ratio 25%
     Energy Cost            15%

   Thresholds on the composite score:
     0-41   -> KEEP
     42-65  -> MONITOR
     66-100 -> REPLACE
===================================================================== */
const WEIGHTS = {
  age: 0.20,
  performance: 0.30,
  repairs: 0.10,
  costRatio: 0.25,
  energyCost: 0.15
};

const AGE_CAP_YEARS = 10;       // risk maxes out at this age
const REPAIRS_CAP = 6;          // risk maxes out at this many repairs/yr
const ENERGY_COST_CAP = 12000;  // risk maxes out at this annual energy cost (BDT)

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function computeScan(data){
  const ageRisk        = clamp(data.age / AGE_CAP_YEARS, 0, 1) * 100;
  const perfRisk        = clamp(100 - data.performance, 0, 100);
  const repairsRisk     = clamp(data.repairs / REPAIRS_CAP, 0, 1) * 100;
  const costRatioRaw    = data.cost / (0.05 * data.replaceCost); // cost vs. 5% of replacement value annually
  const costRisk        = clamp(costRatioRaw, 0, 1) * 100;
  const energyRisk      = clamp(data.energyCost / ENERGY_COST_CAP, 0, 1) * 100;

  const contributions = {
    age:         ageRisk * WEIGHTS.age,
    performance: perfRisk * WEIGHTS.performance,
    repairs:     repairsRisk * WEIGHTS.repairs,
    costRatio:   costRisk * WEIGHTS.costRatio,
    energyCost:  energyRisk * WEIGHTS.energyCost
  };

  const composite = Object.values(contributions).reduce((a,b) => a+b, 0);

  let verdict;
  if(composite < 42) verdict = 'KEEP';
  else if(composite <= 65) verdict = 'MONITOR';
  else verdict = 'REPLACE';

  return {
    composite: Math.round(composite),
    verdict,
    subScores: { ageRisk, perfRisk, repairsRisk, costRisk, energyRisk },
    contributions
  };
}

/* =====================================================================
   SCAN FORM HANDLING + RENDERING RESULT
===================================================================== */
function handleScan(e){
  e.preventDefault();

  const year = Number(document.getElementById('in-year').value);
  const age = year ? Math.max(0, 2026 - year) : Number(document.getElementById('in-age').value || 0);

  const data = {
    name: document.getElementById('in-name').value.trim(),
    year: year,
    age: age,
    performance: Number(document.getElementById('in-perf').value),
    repairs: Number(document.getElementById('in-repairs').value),
    cost: Number(document.getElementById('in-cost').value),
    replaceCost: Number(document.getElementById('in-replacecost').value),
    energyCost: Number(document.getElementById('in-energycost').value)
  };

  const result = computeScan(data);
  renderResult(result);

  const id = localStorage.getItem(SESSION_KEY);
  const list = getHistory(id);
  list.unshift({
    name: data.name,
    date: new Date().toISOString(),
    composite: result.composite,
    verdict: result.verdict
  });
  saveHistory(id, list.slice(0, 50)); // keep last 50
  renderHistory(id);

  return false;
}

function verdictClass(v){
  if(v==='KEEP') return 'v-keep';
  if(v==='MONITOR') return 'v-monitor';
  return 'v-replace';
}
function verdictColor(v){
  if(v==='KEEP') return getComputedStyle(document.documentElement).getPropertyValue('--keep').trim();
  if(v==='MONITOR') return getComputedStyle(document.documentElement).getPropertyValue('--monitor').trim();
  return getComputedStyle(document.documentElement).getPropertyValue('--replace').trim();
}

function renderResult(result){
  document.getElementById('result-empty').classList.add('hidden');
  document.getElementById('result-body').classList.remove('hidden');

  // Gauge arc: full arc length is 283 (approx for this path)
  const arcLen = 283;
  const offset = arcLen - (result.composite/100)*arcLen;
  const arc = document.getElementById('gauge-arc');
  arc.style.stroke = verdictColor(result.verdict);
  arc.setAttribute('stroke-dashoffset', offset);

  document.getElementById('gauge-score').textContent = result.composite;
  document.getElementById('gauge-score').style.color = verdictColor(result.verdict);

  const badge = document.getElementById('verdict-badge');
  badge.textContent = result.verdict;
  badge.className = 'verdict ' + verdictClass(result.verdict);

  const rows = [
    ['Age', result.subScores.ageRisk, WEIGHTS.age],
    ['Performance', result.subScores.perfRisk, WEIGHTS.performance],
    ['Repair Frequency', result.subScores.repairsRisk, WEIGHTS.repairs],
    ['Maintenance Cost Ratio', result.subScores.costRisk, WEIGHTS.costRatio],
    ['Energy Cost', result.subScores.energyRisk, WEIGHTS.energyCost],
  ];

  const container = document.getElementById('breakdown');
  container.innerHTML = rows.map(([label, risk, weight]) => `
    <div class="b-row">
      <div class="b-top"><span>${label} <em style="opacity:.6">(${Math.round(weight*100)}% weight)</em></span><b>${Math.round(risk)}</b></div>
      <div class="b-track"><div class="b-fill" style="width:${risk}%; background:${verdictColor(risk>65?'REPLACE':risk>=42?'MONITOR':'KEEP')}"></div></div>
    </div>
  `).join('');
}

/* =====================================================================
   HISTORY RENDERING
===================================================================== */
function renderHistory(id){
  const list = getHistory(id);
  const emptyEl = document.getElementById('history-empty');
  const listEl = document.getElementById('history-list');

  if(list.length === 0){
    emptyEl.classList.remove('hidden');
    listEl.innerHTML = '';
    return;
  }
  emptyEl.classList.add('hidden');

  listEl.innerHTML = list.map(item => {
    const color = verdictColor(item.verdict);
    const d = new Date(item.date);
    const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    return `
      <div class="h-row">
        <span class="h-dot" style="background:${color}"></span>
        <span class="h-name">${escapeHtml(item.name)}</span>
        <span class="h-date">${dateStr}</span>
        <span class="h-score">Score ${item.composite}</span>
        <span class="h-badge" style="color:${color}; border:1px solid ${color}; background:${color}22;">${item.verdict}</span>
      </div>
    `;
  }).join('');
}

/* =====================================================================
   MULTIPLE DEVICES BATCH ASSESSMENT
===================================================================== */
let currentBatchResults = [];
let currentFilter = 'ALL';

function handleFileUpload(e){
  const file = e.target.files[0];
  if(!file) return;
  processFile(file);
}

function processFile(file){
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();

  if(ext === 'json'){
    reader.onload = function(evt){
      try{
        const json = JSON.parse(evt.target.result);
        const dataArr = Array.isArray(json) ? json : [json];
        processBatchData(dataArr);
      }catch(err){
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  } else if(ext === 'csv' || ext === 'xlsx' || ext === 'xls'){
    reader.onload = function(evt){
      try{
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const json = XLSX.utils.sheet_to_json(worksheet);
        processBatchData(json);
      }catch(err){
        alert('Could not parse spreadsheet file. Please check file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    alert('Unsupported file type. Please upload .csv, .xlsx, or .json file.');
  }
}

async function loadSampleLabData(labName){
  try{
    const res = await fetch(`Data/${labName}/${labName}.json`);
    if(!res.ok) throw new Error('File not found');
    const json = await res.json();
    processBatchData(json);
  }catch(err){
    alert(`Could not load ${labName} sample dataset.`);
  }
}

function mapRowToDeviceData(row){
  const rawId = row.Device_ID || row.Name || row['Device ID'] || row.Tag || 'PC-Unknown';
  const lab = row.Lab_Name || row.Lab || 'Lab';
  const model = row.Brand_Model || row.Model || row.Device_Type || 'Desktop PC';

  let age = Number(row.Age_Years || row.Age || 0);
  let year = Number(row.Purchase_Year || row.Year || (new Date().getFullYear() - age));
  if(!age && year) age = Math.max(0, new Date().getFullYear() - year);

  let performance = 70;
  if(row.Performance_Condition){
    const matches = String(row.Performance_Condition).match(/\d+/g);
    if(matches && matches.length >= 2) performance = (Number(matches[0]) + Number(matches[1])) / 2;
    else if(matches && matches.length === 1) performance = Number(matches[0]);
  } else if(row.Benchmark_Score !== undefined){
    const b = Number(row.Benchmark_Score);
    performance = b <= 100 ? b : Math.min(100, Math.round(b / 10));
  } else if(row.Performance !== undefined){
    performance = Number(row.Performance);
  }

  let repairs = 0;
  if(row.Number_of_Failures !== undefined && row.Number_of_Failures !== null && row.Number_of_Failures !== ''){
    repairs = Number(row.Number_of_Failures);
  } else if(row.Repair_Count){
    const matches = String(row.Repair_Count).match(/\d+/g);
    if(matches && matches.length >= 2) repairs = (Number(matches[0]) + Number(matches[1])) / 2;
    else if(matches && matches.length === 1) repairs = Number(matches[0]);
  } else if(row.Repairs !== undefined){
    repairs = Number(row.Repairs);
  }

  const cost = Number(row.Annual_Maintenance_Cost_TK || row.Maintenance_Cost || row.Cost || 1500);
  const replaceCost = Number(row.Current_Replacement_Price_TK || row.Replacement_Cost || row.ReplaceCost || 65000);
  const energyCost = Number(row.Estimated_Annual_Energy_Cost_TK || row.Energy_Cost || row.EnergyCost || 7490);

  return {
    name: `${rawId} (${lab})`,
    rawId,
    lab,
    model,
    year,
    age,
    performance,
    repairs,
    cost,
    replaceCost,
    energyCost
  };
}

function processBatchData(rawRows){
  if(!Array.isArray(rawRows) || rawRows.length === 0){
    alert('No device records found in file.');
    return;
  }

  currentBatchResults = rawRows.map(row => {
    const data = mapRowToDeviceData(row);
    const result = computeScan(data);
    const fileVerdict = row.Decision || row.decision || row.Verdict || row.verdict;
    return {
      ...data,
      composite: result.composite,
      verdict: fileVerdict ? String(fileVerdict).trim().toUpperCase() : result.verdict,
      subScores: result.subScores
    };
  });

  document.getElementById('batch-results-container').classList.remove('hidden');
  updateBatchStats();
  renderBatchTable();
}

function updateBatchStats(){
  const total = currentBatchResults.length;
  const keep = currentBatchResults.filter(r => r.verdict === 'KEEP').length;
  const monitor = currentBatchResults.filter(r => r.verdict === 'MONITOR').length;
  const replace = currentBatchResults.filter(r => r.verdict === 'REPLACE').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-keep').textContent = keep;
  document.getElementById('stat-monitor').textContent = monitor;
  document.getElementById('stat-replace').textContent = replace;
}

function filterBatchTable(verdict, btn){
  currentFilter = verdict;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderBatchTable();
}

function renderBatchTable(){
  const search = (document.getElementById('batch-search').value || '').toLowerCase();
  const tbody = document.getElementById('batch-table-body');

  const filtered = currentBatchResults.filter(item => {
    const matchesFilter = currentFilter === 'ALL' || item.verdict === currentFilter;
    const matchesSearch = item.rawId.toLowerCase().includes(search) ||
                          item.model.toLowerCase().includes(search) ||
                          item.lab.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });

  if(filtered.length === 0){
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:30px; color:var(--muted);">No matching devices found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const color = verdictColor(item.verdict);
    return `
      <tr>
        <td style="font-weight:600;">${escapeHtml(item.rawId)}</td>
        <td>${escapeHtml(item.lab)}</td>
        <td style="font-size:12px; color:var(--muted);">${escapeHtml(item.model)}</td>
        <td>${item.age} yrs</td>
        <td>${item.performance}/100</td>
        <td>${item.repairs}</td>
        <td>৳${item.cost.toLocaleString()}</td>
        <td>৳${item.energyCost.toLocaleString()}</td>
        <td><strong style="color:${color}">${item.composite}</strong></td>
        <td><span class="h-badge" style="color:${color}; border:1px solid ${color}; background:${color}22;">${item.verdict}</span></td>
      </tr>
    `;
  }).join('');
}

function exportBatchCSV(){
  if(currentBatchResults.length === 0) return;
  const headers = ['Device ID', 'Lab', 'Model', 'Age', 'Perf Score', 'Repairs', 'Maintenance Cost (TK)', 'Energy Cost (TK)', 'Replacement Cost (TK)', 'Composite Risk Score', 'Verdict'];
  const rows = currentBatchResults.map(r => [
    `"${r.rawId}"`, `"${r.lab}"`, `"${r.model}"`, r.age, r.performance, r.repairs, r.cost, r.energyCost, r.replaceCost, r.composite, r.verdict
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `LabScan_Batch_Report_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}