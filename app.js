// Constants
const API_BASE = '';
const WORK_START = '09:00';
const WORK_END = '19:00';
const STORAGE_KEY = 'attendance_records';

// Use MongoDB if available, fallback to localStorage
let USE_MONGODB = true;

// DOM Elements
const unitSelect = document.getElementById('unitSelect');
const jabatanSelect = document.getElementById('jabatanSelect');
const attendanceDate = document.getElementById('attendanceDate');
const employeeName = document.getElementById('employeeName');
const lateMinutesInput = document.getElementById('lateMinutes');
const earlyMinutesInput = document.getElementById('earlyMinutes');
const timeStatus = document.getElementById('timeStatus');
const attendanceForm = document.getElementById('attendanceForm');
const singleResult = document.getElementById('singleResult');

const summaryUnit = document.getElementById('summaryUnit');
const summaryJabatan = document.getElementById('summaryJabatan');
const summaryNameInput = document.getElementById('summaryName');
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
    
    lateMinutesInput.addEventListener('input', updateTimeStatus);
    earlyMinutesInput.addEventListener('input', updateTimeStatus);
    
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
    const lateMinutes = parseInt(lateMinutesInput.value) || 0;
    const earlyMinutes = parseInt(earlyMinutesInput.value) || 0;
    
    let statusHtml = '';
    let statusClass = 'ok';
    
    if (lateMinutes > 5) { // More than 5 minutes late
        statusClass = 'late';
        statusHtml += `🔴 Terlambat <strong>${lateMinutes} menit</strong> (datang ${formatTimeWithOffset(WORK_START, lateMinutes)})<br>`;
    }
    
    if (earlyMinutes > 0) {
        statusClass = statusClass === 'late' ? 'late' : 'early';
        statusHtml += `🟡 Pulang Awal <strong>${earlyMinutes} menit</strong> (pulang ${formatTimeWithOffset(WORK_END, -earlyMinutes)})`;
    }
    
    if (lateMinutes <= 5 && earlyMinutes <= 0) {
        statusHtml = '✅ Tepat Waktu';
    }
    
    timeStatus.innerHTML = statusHtml;
    timeStatus.className = `time-status show ${statusClass}`;
}

// Format time with offset
function formatTimeWithOffset(baseTime, offsetMinutes) {
    const [h, m] = baseTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + offsetMinutes;
    const newH = Math.floor(totalMinutes / 60);
    const newM = totalMinutes % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Save Attendance
async function handleSaveAttendance(e) {
    e.preventDefault();
    
    const unit = unitSelect.value;
    const jabatan = jabatanSelect.value;
    const date = attendanceDate.value;
    const name = employeeName.value.trim();
    const lateMinutes = parseInt(lateMinutesInput.value) || 0;
    const earlyMinutes = parseInt(earlyMinutesInput.value) || 0;
    
    if (!unit || !jabatan || !date || !name) {
        alert('Mohon lengkapi semua field');
        return;
    }
    
    // Calculate actual arrival/departure times for display
    const arrival = formatTimeWithOffset(WORK_START, lateMinutes);
    const departure = formatTimeWithOffset(WORK_END, -earlyMinutes);
    
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
        name,
        unit,
        jabatan,
        arrival,
        departure,
        lateMinutes: lateMinutes > 5 ? lateMinutes : 0,
        earlyMinutes,
        deduction: totalDeduction,
        status
    };
    
    await saveRecord(record);
    
    // Display result
    document.getElementById('resultName').textContent = name;
    document.getElementById('resultDate').textContent = formatDate(date);
    document.getElementById('resultStatus').textContent = status;
    document.getElementById('resultDuration').textContent = `Datang: ${arrival}, Pulang: ${departure}`;
    document.getElementById('resultDeduction').textContent = `Rp ${totalDeduction.toLocaleString('id-ID')}`;
    
    singleResult.classList.remove('hidden');
    
    // Show success message
    alert(`Absensi ${name} tersimpan!\n${status}\nPotongan: Rp ${totalDeduction.toLocaleString('id-ID')}`);
}

// Save record - MongoDB first, fallback to localStorage
async function saveRecord(record) {
    if (USE_MONGODB) {
        try {
            const response = await fetch(`${API_BASE}/api/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record)
            });
            const data = await response.json();
            if (data.success) {
                return data;
            } else {
                console.warn('MongoDB save failed, using localStorage:', data.error);
                USE_MONGODB = false;
            }
        } catch (error) {
            console.warn('MongoDB unavailable, using localStorage:', error);
            USE_MONGODB = false;
        }
    }
    
    // Fallback to localStorage
    const records = getLocalRecords();
    const existingIndex = records.findIndex(r => 
        r.date === record.date && r.name === record.name && r.unit === record.unit && r.jabatan === record.jabatan
    );
    
    if (existingIndex >= 0) {
        records[existingIndex] = record;
    } else {
        records.push(record);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// Get records from localStorage (fallback)
function getLocalRecords() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Get records for specific employee - MongoDB first, fallback to localStorage
async function getEmployeeRecords(unit, jabatan, name = '') {
    if (USE_MONGODB) {
        try {
            let url = `${API_BASE}/api/attendance?unit=${encodeURIComponent(unit)}&jabatan=${encodeURIComponent(jabatan)}`;
            if (name) url += `&name=${encodeURIComponent(name)}`;
            
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                return data.data;
            } else {
                console.warn('MongoDB get failed, using localStorage:', data.error);
                USE_MONGODB = false;
            }
        } catch (error) {
            console.warn('MongoDB unavailable, using localStorage:', error);
            USE_MONGODB = false;
        }
    }
    
    // Fallback to localStorage
    const records = getLocalRecords();
    return records.filter(r => {
        const unitMatch = r.unit === unit;
        const jabatanMatch = r.jabatan === jabatan;
        const nameMatch = name ? (r.name || '').toLowerCase().includes(name.toLowerCase()) : true;
        return unitMatch && jabatanMatch && nameMatch;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Load Employee Summary
async function loadEmployeeSummary() {
    const unit = summaryUnit.value;
    const jabatan = summaryJabatan.value;
    const name = summaryNameInput.value.trim();
    
    if (!unit || !jabatan) {
        alert('Pilih Unit dan Jabatan terlebih dahulu');
        return;
    }
    
    const records = await getEmployeeRecords(unit, jabatan, name);
    
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
    const titleText = name ? `${name} (${jabatan})` : `${unit} - ${jabatan}`;
    document.getElementById('summaryTitle').textContent = titleText;
    
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
    // Store records for edit/delete functions
    currentRecords = records;
    
    if (records.length === 0) {
        attendanceHistory.innerHTML = '<p class="empty-message">Belum ada riwayat absensi</p>';
        return;
    }
    
    // Table header
    let html = `
        <div class="history-header">
            <span>Tanggal</span>
            <span>Nama</span>
            <span>Status</span>
            <span>Durasi</span>
            <span>Potongan</span>
            <span>Aksi</span>
        </div>
    `;
    
    // Show all records (not just issues) so user can edit/delete any
    records.forEach(record => {
        const badges = [];
        const durations = [];
        
        if (record.lateMinutes > 0) {
            badges.push('<span class="badge late">Telat</span>');
            durations.push(`${record.lateMinutes}m`);
        }
        if (record.earlyMinutes > 0) {
            badges.push('<span class="badge early">P. Awal</span>');
            durations.push(`${record.earlyMinutes}m`);
        }
        if (record.lateMinutes === 0 && record.earlyMinutes === 0) {
            badges.push('<span class="badge ok">OK</span>');
        }
        
        // Create unique identifier for record - use MongoDB _id if available
        const recordId = record._id || `${record.date}_${record.name}_${record.unit}_${record.jabatan}`;
        
        html += `
            <div class="history-item" data-record-id="${recordId}" data-mongo="${record._id ? 'true' : 'false'}">
                <span class="date">${formatDateShort(record.date)}</span>
                <span class="employee-name" title="${record.name || '-'}">${record.name || '-'}</span>
                <div class="badges">${badges.join('')}</div>
                <span class="duration">${durations.length > 0 ? durations.join(', ') : '-'}</span>
                <span class="deduction">Rp ${(record.deduction || 0).toLocaleString('id-ID')}</span>
                <div class="actions">
                    <button class="action-btn edit" onclick="openEditModal('${recordId}')" title="Edit">✏️</button>
                    <button class="action-btn delete" onclick="openDeleteModal('${recordId}')" title="Hapus">🗑️</button>
                </div>
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

// Format date short (for table)
function formatDateShort(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

// ===== EDIT FUNCTIONS =====
let currentEditRecord = null;
let currentRecords = []; // Store current displayed records

async function openEditModal(recordId) {
    // Find record from current displayed records
    let record = currentRecords.find(r => r._id === recordId);
    
    // Fallback to old localStorage method
    if (!record) {
        const records = getLocalRecords();
        record = records.find(r => `${r.date}_${r.name}_${r.unit}_${r.jabatan}` === recordId);
    }
    
    if (!record) {
        alert('Data tidak ditemukan');
        return;
    }
    
    currentEditRecord = record;
    
    // Populate edit form
    document.getElementById('editDate').value = record.date;
    document.getElementById('editName').value = record.name || '';
    document.getElementById('editLateMinutes').value = record.lateMinutes || 0;
    document.getElementById('editEarlyMinutes').value = record.earlyMinutes || 0;
    
    // Load units for edit form
    const editUnitSelect = document.getElementById('editUnit');
    const editJabatanSelect = document.getElementById('editJabatan');
    
    try {
        const response = await fetch(`${API_BASE}/api/units`);
        const data = await response.json();
        
        if (data.success) {
            editUnitSelect.innerHTML = '<option value="">-- Pilih Unit --</option>';
            data.data.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit;
                option.textContent = unit;
                if (unit === record.unit) option.selected = true;
                editUnitSelect.appendChild(option);
            });
            
            // Load positions for selected unit
            if (record.unit) {
                await loadEditPositions(record.unit, record.jabatan);
            }
        }
    } catch (error) {
        console.error('Error loading units:', error);
    }
    
    // Setup unit change handler for edit
    editUnitSelect.onchange = async () => {
        await loadEditPositions(editUnitSelect.value);
    };
    
    document.getElementById('editModal').classList.remove('hidden');
}

async function loadEditPositions(unit, selectedJabatan = '') {
    const editJabatanSelect = document.getElementById('editJabatan');
    editJabatanSelect.innerHTML = '<option value="">-- Pilih Jabatan --</option>';
    
    if (!unit) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/positions?unit=${encodeURIComponent(unit)}`);
        const data = await response.json();
        
        if (data.success) {
            data.data.forEach(position => {
                const option = document.createElement('option');
                option.value = position;
                option.textContent = position;
                if (position === selectedJabatan) option.selected = true;
                editJabatanSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading positions:', error);
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    currentEditRecord = null;
}

// Handle edit form submission
document.getElementById('editForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentEditRecord) return;
    
    const newDate = document.getElementById('editDate').value;
    const newName = document.getElementById('editName').value.trim();
    const newUnit = document.getElementById('editUnit').value;
    const newJabatan = document.getElementById('editJabatan').value;
    const newLateMinutes = parseInt(document.getElementById('editLateMinutes').value) || 0;
    const newEarlyMinutes = parseInt(document.getElementById('editEarlyMinutes').value) || 0;
    
    if (!newDate || !newName || !newUnit || !newJabatan) {
        alert('Mohon lengkapi semua field');
        return;
    }
    
    // Calculate new deduction
    let totalDeduction = 0;
    
    if (newLateMinutes > 5) {
        try {
            const response = await fetch(`${API_BASE}/api/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unit: newUnit, jabatan: newJabatan, type: 'terlambat', minutes: newLateMinutes })
            });
            const data = await response.json();
            if (data.success) totalDeduction += Math.abs(data.data.deduction);
        } catch (error) {
            console.error('Error calculating late deduction:', error);
        }
    }
    
    if (newEarlyMinutes > 0) {
        try {
            const response = await fetch(`${API_BASE}/api/calculate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unit: newUnit, jabatan: newJabatan, type: 'pulang_awal', minutes: newEarlyMinutes })
            });
            const data = await response.json();
            if (data.success) totalDeduction += Math.abs(data.data.deduction);
        } catch (error) {
            console.error('Error calculating early deduction:', error);
        }
    }
    
    const updatedRecord = {
        date: newDate,
        name: newName,
        unit: newUnit,
        jabatan: newJabatan,
        arrival: formatTimeWithOffset(WORK_START, newLateMinutes),
        departure: formatTimeWithOffset(WORK_END, -newEarlyMinutes),
        lateMinutes: newLateMinutes > 5 ? newLateMinutes : 0,
        earlyMinutes: newEarlyMinutes,
        deduction: totalDeduction,
        status: getStatusText(newLateMinutes, newEarlyMinutes)
    };
    
    // Update via MongoDB if available
    if (USE_MONGODB && currentEditRecord._id) {
        try {
            updatedRecord._id = currentEditRecord._id;
            const response = await fetch(`${API_BASE}/api/attendance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedRecord)
            });
            const data = await response.json();
            if (data.success) {
                alert('Data berhasil diperbarui!');
                closeEditModal();
                loadEmployeeSummary();
                return;
            } else {
                console.warn('MongoDB update failed:', data.error);
            }
        } catch (error) {
            console.warn('MongoDB unavailable:', error);
        }
    }
    
    // Fallback to localStorage
    const records = getLocalRecords();
    const index = records.findIndex(r => 
        r.date === currentEditRecord.date && 
        r.name === currentEditRecord.name && 
        r.unit === currentEditRecord.unit && 
        r.jabatan === currentEditRecord.jabatan
    );
    
    if (index >= 0) {
        records[index] = updatedRecord;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        alert('Data berhasil diperbarui!');
        closeEditModal();
        loadEmployeeSummary();
    }
});

function getStatusText(lateMinutes, earlyMinutes) {
    const details = [];
    if (lateMinutes > 5) details.push(`Telat ${lateMinutes}m`);
    if (earlyMinutes > 0) details.push(`Pulang Awal ${earlyMinutes}m`);
    return details.length > 0 ? details.join(', ') : 'Tepat Waktu';
}

// ===== DELETE FUNCTIONS =====
let deleteRecordId = null;
let deleteRecord = null;

function openDeleteModal(recordId) {
    // Find record from current displayed records
    let record = currentRecords.find(r => r._id === recordId);
    
    // Fallback to localStorage
    if (!record) {
        const records = getLocalRecords();
        record = records.find(r => `${r.date}_${r.name}_${r.unit}_${r.jabatan}` === recordId);
    }
    
    if (!record) {
        alert('Data tidak ditemukan');
        return;
    }
    
    deleteRecordId = recordId;
    deleteRecord = record;
    document.getElementById('deleteInfo').textContent = 
        `${record.name} - ${formatDate(record.date)} (${record.jabatan})`;
    
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    deleteRecordId = null;
    deleteRecord = null;
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
    if (!deleteRecordId) return;
    
    // Try MongoDB first if record has _id
    if (USE_MONGODB && deleteRecord && deleteRecord._id) {
        try {
            const response = await fetch(`${API_BASE}/api/attendance`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _id: deleteRecord._id })
            });
            const data = await response.json();
            if (data.success) {
                alert('Data berhasil dihapus!');
                closeDeleteModal();
                loadEmployeeSummary();
                return;
            } else {
                console.warn('MongoDB delete failed:', data.error);
            }
        } catch (error) {
            console.warn('MongoDB unavailable:', error);
        }
    }
    
    // Fallback to localStorage
    const records = getLocalRecords();
    const index = records.findIndex(r => `${r.date}_${r.name}_${r.unit}_${r.jabatan}` === deleteRecordId);
    
    if (index >= 0) {
        records.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        alert('Data berhasil dihapus!');
        closeDeleteModal();
        loadEmployeeSummary();
    }
});
