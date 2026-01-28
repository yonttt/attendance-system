// API Base URL - empty for relative paths in Vercel
const API_BASE = '';

// State
let incidents = [];
let currentEmployee = {
    unit: '',
    jabatan: ''
};

// DOM Elements
const unitSelect = document.getElementById('unitSelect');
const jabatanSelect = document.getElementById('jabatanSelect');
const lateType = document.getElementById('lateType');
const minutesInput = document.getElementById('minutes');
const calculatorForm = document.getElementById('calculatorForm');
const singleResult = document.getElementById('singleResult');
const incidentsList = document.getElementById('incidentsList');
const batchControls = document.getElementById('batchControls');
const batchResult = document.getElementById('batchResult');
const deductionTables = document.getElementById('deductionTables');
const addIncidentBtn = document.getElementById('addIncidentBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const calculateBatchBtn = document.getElementById('calculateBatchBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUnits();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    unitSelect.addEventListener('change', handleUnitChange);
    jabatanSelect.addEventListener('change', handleJabatanChange);
    calculatorForm.addEventListener('submit', handleCalculate);
    addIncidentBtn.addEventListener('click', handleAddIncident);
    clearAllBtn.addEventListener('click', handleClearAll);
    calculateBatchBtn.addEventListener('click', handleCalculateBatch);
}

// Load Units from API
async function loadUnits() {
    try {
        const response = await fetch(`${API_BASE}/api/units`);
        const data = await response.json();
        
        if (data.success) {
            unitSelect.innerHTML = '<option value="">-- Pilih Unit --</option>';
            data.data.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit;
                option.textContent = unit;
                unitSelect.appendChild(option);
            });
        } else {
            showError('Gagal memuat data unit: ' + data.error);
        }
    } catch (error) {
        showError('Gagal terhubung ke server: ' + error.message);
    }
}

// Handle Unit Change - Updated for Vercel query params
async function handleUnitChange() {
    const unit = unitSelect.value;
    jabatanSelect.innerHTML = '<option value="">-- Pilih Jabatan --</option>';
    jabatanSelect.disabled = true;
    deductionTables.classList.add('hidden');
    singleResult.classList.add('hidden');
    
    if (!unit) return;
    
    try {
        // Changed: Using query params instead of path params for Vercel serverless
        const response = await fetch(`${API_BASE}/api/positions?unit=${encodeURIComponent(unit)}`);
        const data = await response.json();
        
        if (data.success) {
            jabatanSelect.disabled = false;
            data.data.forEach(position => {
                const option = document.createElement('option');
                option.value = position;
                option.textContent = position;
                jabatanSelect.appendChild(option);
            });
        } else {
            showError('Gagal memuat data jabatan: ' + data.error);
        }
    } catch (error) {
        showError('Gagal terhubung ke server: ' + error.message);
    }
}

// Handle Jabatan Change - Updated for Vercel query params
async function handleJabatanChange() {
    const unit = unitSelect.value;
    const jabatan = jabatanSelect.value;
    
    if (!unit || !jabatan) {
        deductionTables.classList.add('hidden');
        return;
    }
    
    currentEmployee = { unit, jabatan };
    await loadDeductionTable(unit, jabatan);
}

// Load Deduction Table - Updated for Vercel query params
async function loadDeductionTable(unit, jabatan) {
    try {
        // Changed: Using query params instead of path params for Vercel serverless
        const response = await fetch(`${API_BASE}/api/deduction-table?unit=${encodeURIComponent(unit)}&jabatan=${encodeURIComponent(jabatan)}`);
        const data = await response.json();
        
        if (data.success) {
            const { deduction_table } = data.data;
            
            // Populate Late Table
            const lateTableBody = document.querySelector('#lateTable tbody');
            lateTableBody.innerHTML = '';
            deduction_table.terlambat.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.range}</td>
                    <td class="deduction">Rp ${Math.abs(item.deduction).toLocaleString('id-ID')}</td>
                `;
                lateTableBody.appendChild(row);
            });
            
            // Populate Early Leave Table
            const earlyTableBody = document.querySelector('#earlyTable tbody');
            earlyTableBody.innerHTML = '';
            deduction_table.pulang_awal.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.range}</td>
                    <td class="deduction">Rp ${Math.abs(item.deduction).toLocaleString('id-ID')}</td>
                `;
                earlyTableBody.appendChild(row);
            });
            
            deductionTables.classList.remove('hidden');
        } else {
            showError('Gagal memuat tabel potongan: ' + data.error);
        }
    } catch (error) {
        showError('Gagal terhubung ke server: ' + error.message);
    }
}

// Handle Calculate (Single) - Updated for Vercel
async function handleCalculate(e) {
    e.preventDefault();
    
    const unit = unitSelect.value;
    const jabatan = jabatanSelect.value;
    const type = lateType.value;
    const minutes = parseInt(minutesInput.value);
    
    if (!unit || !jabatan || !type || !minutes) {
        showError('Mohon lengkapi semua field');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                unit,
                jabatan,
                type: type,
                minutes
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displaySingleResult(data.data);
        } else {
            showError('Gagal menghitung potongan: ' + data.error);
        }
    } catch (error) {
        showError('Gagal terhubung ke server: ' + error.message);
    }
}

// Display Single Result - Updated field names
function displaySingleResult(result) {
    document.getElementById('resultUnit').textContent = result.unit;
    document.getElementById('resultJabatan').textContent = result.jabatan;
    document.getElementById('resultType').textContent = result.type === 'terlambat' ? 'Terlambat Datang' : 'Pulang Lebih Awal';
    document.getElementById('resultMinutes').textContent = `${result.minutes} menit (${result.range})`;
    document.getElementById('resultDeduction').textContent = `Rp ${Math.abs(result.deduction).toLocaleString('id-ID')}`;
    
    singleResult.classList.remove('hidden');
    singleResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Handle Add Incident
function handleAddIncident() {
    const unit = unitSelect.value;
    const jabatan = jabatanSelect.value;
    const type = lateType.value;
    const minutes = parseInt(minutesInput.value);
    
    if (!unit || !jabatan || !type || !minutes) {
        showError('Mohon lengkapi semua field sebelum menambahkan ke daftar');
        return;
    }
    
    // Check if changing employee
    if (incidents.length > 0 && (currentEmployee.unit !== unit || currentEmployee.jabatan !== jabatan)) {
        if (!confirm('Anda akan menambahkan insiden untuk karyawan berbeda. Daftar sebelumnya akan dihapus. Lanjutkan?')) {
            return;
        }
        incidents = [];
    }
    
    currentEmployee = { unit, jabatan };
    
    incidents.push({
        id: Date.now(),
        type: type,
        minutes: minutes,
        typeLabel: type === 'terlambat' ? 'Terlambat Datang' : 'Pulang Lebih Awal'
    });
    
    updateIncidentsList();
    
    // Clear form inputs (except unit and jabatan)
    lateType.value = '';
    minutesInput.value = '';
}

// Update Incidents List
function updateIncidentsList() {
    if (incidents.length === 0) {
        incidentsList.innerHTML = '<p class="empty-message">Kosong</p>';
        batchControls.classList.add('hidden');
        batchResult.classList.add('hidden');
        return;
    }
    
    let html = `
        <div class="employee-info">
            ${currentEmployee.unit} - ${currentEmployee.jabatan}
        </div>
        <div class="incidents-grid">`;
    
    incidents.forEach((incident, index) => {
        const icon = incident.type === 'terlambat' ? '🔴' : '🟡';
        const shortType = incident.type === 'terlambat' ? 'Terlambat' : 'Pulang';
        html += `
            <div class="incident-card">
                <div class="info">
                    <span class="type">${icon} ${shortType}</span>
                    <span class="mins">${incident.minutes}m</span>
                </div>
                <button class="btn-remove" onclick="removeIncident(${incident.id})">✕</button>
            </div>
        `;
    });
    
    html += '</div>';
    incidentsList.innerHTML = html;
    batchControls.classList.remove('hidden');
}

// Remove Incident
function removeIncident(id) {
    incidents = incidents.filter(inc => inc.id !== id);
    updateIncidentsList();
}

// Handle Clear All
function handleClearAll() {
    if (confirm('Hapus semua insiden dari daftar?')) {
        incidents = [];
        updateIncidentsList();
    }
}

// Handle Calculate Batch - Calculates client-side for simplicity
async function handleCalculateBatch() {
    if (incidents.length === 0) {
        showError('Tidak ada insiden untuk dihitung');
        return;
    }
    
    try {
        // Calculate each incident individually and sum up
        const details = [];
        let total = 0;
        
        for (const incident of incidents) {
            const response = await fetch(`${API_BASE}/api/calculate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    unit: currentEmployee.unit,
                    jabatan: currentEmployee.jabatan,
                    type: incident.type,
                    minutes: incident.minutes
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                details.push({
                    type: incident.type,
                    minutes: incident.minutes,
                    deduction: data.data.deduction
                });
                total += Math.abs(data.data.deduction);
            }
        }
        
        displayBatchResult({ details, total });
    } catch (error) {
        showError('Gagal menghitung total potongan: ' + error.message);
    }
}

// Display Batch Result
function displayBatchResult(result) {
    const detailsDiv = document.getElementById('batchDetails');
    let html = '';
    
    result.details.forEach((detail, index) => {
        const icon = detail.type === 'terlambat' ? '🔴' : '🟡';
        const typeLabel = detail.type === 'terlambat' ? 'Terlambat' : 'Pulang Awal';
        html += `
            <div class="detail-row">
                <span class="detail-label">${icon} ${typeLabel} (${detail.minutes} menit)</span>
                <span class="detail-value">Rp ${Math.abs(detail.deduction).toLocaleString('id-ID')}</span>
            </div>
        `;
    });
    
    detailsDiv.innerHTML = html;
    document.getElementById('totalDeduction').textContent = `Rp ${result.total.toLocaleString('id-ID')}`;
    
    batchResult.classList.remove('hidden');
    batchResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Show Error
function showError(message) {
    alert('Error: ' + message);
}

// Make removeIncident available globally
window.removeIncident = removeIncident;
