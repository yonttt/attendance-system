// Constants
const API_BASE = '';
const WORK_START = '09:00';
const WORK_END = '18:00';
const STORAGE_KEY = 'attendance_records';

// DOM Elements
const unitSelect = document.getElementById('unitSelect');
const jabatanSelect = document.getElementById('jabatanSelect');
const attendanceDate = document.getElementById('attendanceDate');
const arrivalTime = document.getElementById('arrivalTime');
const departureTime = document.getElementById('departureTime');
const timeStatus = document.getElementById('timeStatus');
const attendanceForm = document.getElementById('attendanceForm');
const singleResult = document.getElementById('singleResult');

const summaryUnit = document.getElementById('summaryUnit');
const summaryJabatan = document.getElementById('summaryJabatan');
const loadSummaryBtn = document.getElementById('loadSummaryBtn');
const employeeSummary = document.getElementById('employeeSummary');
const attendanceHistory = document.getElementById('attendanceHistory');
const tablesContent = document.getElementById('tablesContent');
const tableHint = document.getElementById('tableHint');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    attendanceDate.valueAsDate = new Date();
    
    loadUnits();
    setupEventListeners();
});

function setupEventListeners() {
    unitSelect.addEventListener('change', () => handleUnitChange(unitSelect, jabatanSelect));
    jabatanSelect.addEventListener('change', handleJabatanChange);
    summaryUnit.addEventListener('change', () => handleUnitChange(summaryUnit, summaryJabatan));
    
    arrivalTime.addEventListener('change', updateTimeStatus);
    departureTime.addEventListener('change', updateTimeStatus);
    
    attendanceForm.addEventListener('submit', handleSaveAttendance);
    loadSummaryBtn.addEventListener('click', loadEmployeeSummary);
}

// Load Units
async function loadUnits() {
    try {
        const response = await fetch(`${API_BASE}/api/units`);
        const data = await response.json();
        
        if (data.success) {
            [unitSelect, summaryUnit].forEach(select => {
                select.innerHTML = '<option value="">-- Pilih Unit --</option>';
                data.data.forEach(unit => {
                    const option = document.createElement('option');
                    option.value = unit;
                    option.textContent = unit;
                    select.appendChild(option);
                });
            });
        }
    } catch (error) {
        console.error('Error loading units:', error);
    }
}

// Handle Unit Change
async function handleUnitChange(unitEl, jabatanEl) {
    const unit = unitEl.value;
    jabatanEl.innerHTML = '<option value="">-- Pilih Jabatan --</option>';
    jabatanEl.disabled = true;
    
    if (!unit) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/positions?unit=${encodeURIComponent(unit)}`);
        const data = await response.json();
        
        if (data.success) {
            jabatanEl.disabled = false;
            data.data.forEach(position => {
                const option = document.createElement('option');
                option.value = position;
                option.textContent = position;
                jabatanEl.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading positions:', error);
    }
}

// Handle Jabatan Change - Load deduction table
async function handleJabatanChange() {
    const unit = unitSelect.value;
    const jabatan = jabatanSelect.value;
    
    if (!unit || !jabatan) {
        tablesContent.classList.add('hidden');
        tableHint.classList.remove('hidden');
        return;
    }
    
    try {
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
            
            tablesContent.classList.remove('hidden');
            tableHint.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error loading deduction table:', error);
    }
}

// Update Time Status (real-time feedback)
function updateTimeStatus() {
    const arrival = arrivalTime.value;
    const departure = departureTime.value;
    
    if (!arrival || !departure) {
        timeStatus.classList.remove('show');
        return;
    }
    
    const lateMinutes = calculateLateness(arrival, WORK_START);
    const earlyMinutes = calculateEarlyLeave(departure, WORK_END);
    
    let statusHtml = '';
    let statusClass = 'ok';
    
    if (lateMinutes > 5) { // More than 5 minutes late
        statusClass = 'late';
        statusHtml += `🔴 Terlambat <strong>${lateMinutes} menit</strong><br>`;
    }
    
    if (earlyMinutes > 0) {
        statusClass = statusClass === 'late' ? 'late' : 'early';
        statusHtml += `🟡 Pulang Awal <strong>${earlyMinutes} menit</strong>`;
    }
    
    if (lateMinutes <= 5 && earlyMinutes <= 0) {
        statusHtml = '✅ Tepat Waktu';
    }
    
    timeStatus.innerHTML = statusHtml;
    timeStatus.className = `time-status show ${statusClass}`;
}

// Calculate lateness in minutes
function calculateLateness(actual, expected) {
    const [aH, aM] = actual.split(':').map(Number);
    const [eH, eM] = expected.split(':').map(Number);
    
    const actualMinutes = aH * 60 + aM;
    const expectedMinutes = eH * 60 + eM;
    
    return Math.max(0, actualMinutes - expectedMinutes);
}

// Calculate early leave in minutes
function calculateEarlyLeave(actual, expected) {
    const [aH, aM] = actual.split(':').map(Number);
    const [eH, eM] = expected.split(':').map(Number);
    
    const actualMinutes = aH * 60 + aM;
    const expectedMinutes = eH * 60 + eM;
    
    return Math.max(0, expectedMinutes - actualMinutes);
}

// Save Attendance
async function handleSaveAttendance(e) {
    e.preventDefault();
    
    const unit = unitSelect.value;
    const jabatan = jabatanSelect.value;
    const date = attendanceDate.value;
    const arrival = arrivalTime.value;
    const departure = departureTime.value;
    
    if (!unit || !jabatan || !date) {
        alert('Mohon lengkapi semua field');
        return;
    }
    
    const lateMinutes = calculateLateness(arrival, WORK_START);
    const earlyMinutes = calculateEarlyLeave(departure, WORK_END);
    
    let totalDeduction = 0;
    let status = 'Tepat Waktu';
    let statusDetails = [];
    
    // Calculate late deduction
    if (lateMinutes > 5) {
        try {
            const response = await fetch(`${API_BASE}/api/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unit, jabatan, type: 'terlambat', minutes: lateMinutes })
            });
            const data = await response.json();
            if (data.success) {
                totalDeduction += Math.abs(data.data.deduction);
                statusDetails.push(`Telat ${lateMinutes}m`);
            }
        } catch (error) {
            console.error('Error calculating late deduction:', error);
        }
    }
    
    // Calculate early leave deduction
    if (earlyMinutes > 0) {
        try {
            const response = await fetch(`${API_BASE}/api/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unit, jabatan, type: 'pulang_awal', minutes: earlyMinutes })
            });
            const data = await response.json();
            if (data.success) {
                totalDeduction += Math.abs(data.data.deduction);
                statusDetails.push(`Pulang Awal ${earlyMinutes}m`);
            }
        } catch (error) {
            console.error('Error calculating early deduction:', error);
        }
    }
    
    if (statusDetails.length > 0) {
        status = statusDetails.join(', ');
    }
    
    // Save to localStorage
    const record = {
        date,
        unit,
        jabatan,
        arrival,
        departure,
        lateMinutes: lateMinutes > 5 ? lateMinutes : 0,
        earlyMinutes,
        deduction: totalDeduction,
        status
    };
    
    saveRecord(record);
    
    // Display result
    document.getElementById('resultDate').textContent = formatDate(date);
    document.getElementById('resultStatus').textContent = status;
    document.getElementById('resultDuration').textContent = `Datang: ${arrival}, Pulang: ${departure}`;
    document.getElementById('resultDeduction').textContent = `Rp ${totalDeduction.toLocaleString('id-ID')}`;
    
    singleResult.classList.remove('hidden');
    
    // Show success message
    alert(`Absensi tersimpan!\n${status}\nPotongan: Rp ${totalDeduction.toLocaleString('id-ID')}`);
}

// Save record to localStorage
function saveRecord(record) {
    const records = getRecords();
    
    // Check if record exists for same date, unit, jabatan - update it
    const existingIndex = records.findIndex(r => 
        r.date === record.date && r.unit === record.unit && r.jabatan === record.jabatan
    );
    
    if (existingIndex >= 0) {
        records[existingIndex] = record;
    } else {
        records.push(record);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// Get all records from localStorage
function getRecords() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Get records for specific employee
function getEmployeeRecords(unit, jabatan) {
    const records = getRecords();
    return records.filter(r => r.unit === unit && r.jabatan === jabatan)
                  .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Load Employee Summary
function loadEmployeeSummary() {
    const unit = summaryUnit.value;
    const jabatan = summaryJabatan.value;
    
    if (!unit || !jabatan) {
        alert('Pilih Unit dan Jabatan terlebih dahulu');
        return;
    }
    
    const records = getEmployeeRecords(unit, jabatan);
    
    // Calculate summary
    let totalLateDays = 0;
    let totalEarlyDays = 0;
    let totalDeduction = 0;
    
    records.forEach(r => {
        if (r.lateMinutes > 0) totalLateDays++;
        if (r.earlyMinutes > 0) totalEarlyDays++;
        totalDeduction += r.deduction || 0;
    });
    
    // Display summary
    document.getElementById('summaryName').textContent = `${unit} - ${jabatan}`;
    
    if (records.length > 0) {
        const dates = records.map(r => new Date(r.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        document.getElementById('summaryPeriod').textContent = 
            `${formatDate(minDate.toISOString().split('T')[0])} - ${formatDate(maxDate.toISOString().split('T')[0])}`;
    } else {
        document.getElementById('summaryPeriod').textContent = 'Belum ada data';
    }
    
    document.getElementById('totalLateDays').textContent = totalLateDays;
    document.getElementById('totalEarlyDays').textContent = totalEarlyDays;
    document.getElementById('totalDeduction').textContent = `Rp ${totalDeduction.toLocaleString('id-ID')}`;
    
    employeeSummary.classList.remove('hidden');
    
    // Display history
    displayHistory(records);
}

// Display attendance history
function displayHistory(records) {
    if (records.length === 0) {
        attendanceHistory.innerHTML = '<p class="empty-message">Belum ada riwayat absensi</p>';
        return;
    }
    
    // Filter only records with lateness or early leave
    const issueRecords = records.filter(r => r.lateMinutes > 0 || r.earlyMinutes > 0);
    
    if (issueRecords.length === 0) {
        attendanceHistory.innerHTML = '<p class="empty-message">✅ Tidak ada keterlambatan atau pulang awal</p>';
        return;
    }
    
    let html = '';
    issueRecords.forEach(record => {
        const badges = [];
        const durations = [];
        
        if (record.lateMinutes > 0) {
            badges.push('<span class="badge late">Telat</span>');
            durations.push(`${record.lateMinutes}m telat`);
        }
        if (record.earlyMinutes > 0) {
            badges.push('<span class="badge early">Pulang Awal</span>');
            durations.push(`${record.earlyMinutes}m pulang awal`);
        }
        
        html += `
            <div class="history-item">
                <span class="date">${formatDate(record.date)}</span>
                ${badges.join('')}
                <span class="duration">${durations.join(', ')}</span>
                <span class="deduction">-Rp ${(record.deduction || 0).toLocaleString('id-ID')}</span>
            </div>
        `;
    });
    
    attendanceHistory.innerHTML = html;
}

// Format date
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}
