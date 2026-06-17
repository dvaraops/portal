// Ambil daftar lokasi yang sudah tersimpan (Tidak butuh parameter)
function getMasterLocations() {
  const ss = getDB();
  let sheet = ss.getSheetByName("MasterLocation");
  if (!sheet) {
    sheet = ss.insertSheet("MasterLocation");
    sheet.appendRow(["Nama Lokasi", "Link Maps", "Lat", "Long"]);
    return { status: 'success', data: [] };
  }
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { status: 'success', data: [] };
  return { status: 'success', data: data.slice(1).map(row => ({ name: row[0], link: row[1], lat: row[2], long: row[3] })) };
}

// Ekstrak Lat & Long (Disesuaikan agar menerima objek 'data')
function extractCoordsFromUrl(data) {
  try {
    let url = data.url; // Ekstrak url dari data
    
    // 1. Fetch URL dan biarkan GAS otomatis mengikuti semua HTTP Redirect
    let response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    let html = response.getContentText();

    // 2. Cek apakah Google menggunakan trik <meta http-equiv="refresh">
    let metaMatch = html.match(/URL=['"]?([^'"]+)['"]?/i);
    if (metaMatch && metaMatch[1]) {
       let nextUrl = metaMatch[1].replace(/&amp;/g, '&');
       response = UrlFetchApp.fetch(nextUrl, { muteHttpExceptions: true, followRedirects: true });
       html = response.getContentText();
    }

    let lat = null;
    let long = null;

    // 3. THE WHATSAPP HACK
    let centerMatch = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || html.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (centerMatch) { lat = centerMatch[1]; long = centerMatch[2]; }

    if (!lat) {
        let markerMatch = html.match(/markers=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || html.match(/markers=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (markerMatch) { lat = markerMatch[1]; long = markerMatch[2]; }
    }

    if (!lat) {
        let atMatch = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) { lat = atMatch[1]; long = atMatch[2]; }
    }

    if (!lat) {
        let llMatch = html.match(/ll=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || html.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (llMatch) { lat = llMatch[1]; long = llMatch[2]; }
    }

    if (lat && long) {
      return { status: 'success', lat: lat, long: long };
    }

    return { status: 'error', message: 'Koordinat gagal diekstrak. Pastikan link mengarah ke "Pin Lokasi" spesifik.' };
  } catch (e) {
    return { status: 'error', message: 'Gagal memproses URL. Link mungkin invalid atau di-protect.' };
  }
}

// Simpan event (Disesuaikan parameternya menjadi 'data' bukan 'payload')
function saveHistoryEvent(data) {
  try {
    const ss = getDB();
    let sheet = ss.getSheetByName("HistoryEvent");
    if (!sheet) {
      sheet = ss.insertSheet("HistoryEvent");
      sheet.appendRow(["Timestamp", "EventName", "EventDate", "ShiftDate", "Sesi", "CallTime", "TargetEndTime", "Lat", "Long", "FullName", "Role", "TapIn", "TapOut", "StatusTelat", "OvertimeHours", "OvertimeStatus"]);
    }

    // --- LOGIKA SIMPAN LOKASI BARU KE MASTERLOCATION ---
    let locSheet = ss.getSheetByName("MasterLocation");
    if (!locSheet) {
      locSheet = ss.insertSheet("MasterLocation");
      locSheet.appendRow(["Nama Lokasi", "Link Maps", "Lat", "Long"]);
    }
    
    if (data.locationName && data.locationName.trim() !== "") {
      const locData = locSheet.getDataRange().getValues();
      let isExist = false;
      for (let i = 1; i < locData.length; i++) {
        if (locData[i][0] === data.locationName) { isExist = true; break; }
      }
      if (!isExist) {
        locSheet.appendRow([data.locationName, data.mapsLink, data.lat, data.long]);
      }
    }
    // ----------------------------------------------------

    let headers = sheet.getDataRange().getValues()[0];
    const timestamp = new Date();

    data.sessions.forEach(session => {
      let validCrews = session.crews.length > 0 ? session.crews : [{fullName: "", role: ""}];
      validCrews.forEach(crew => {
        let newRow = new Array(headers.length).fill('');
        headers.forEach((h, i) => {
            if(h === 'Timestamp') newRow[i] = timestamp;
            else if(h === 'EventName') newRow[i] = data.eventName;
            else if(h === 'EventDate') newRow[i] = data.eventDate;
            else if(h === 'ShiftDate') newRow[i] = session.shiftDate;
            else if(h === 'Sesi') newRow[i] = session.sesiName;
            else if(h === 'CallTime') newRow[i] = session.callTime;
            else if(h === 'TargetEndTime') newRow[i] = session.targetEndTime;
            else if(h === 'Lat') newRow[i] = data.lat;
            else if(h === 'Long') newRow[i] = data.long;
            else if(h === 'FullName') newRow[i] = crew.fullName || "";
            else if(h === 'Role') newRow[i] = crew.role || "";
            else if(h === 'OvertimeStatus') newRow[i] = "NONE";
        });
        sheet.appendRow(newRow);
      });
    });
    
    // Update profil crew
    data.sessions.forEach(session => {
       session.crews.forEach(crew => {
          if (crew.fullName) syncCrewStats(crew.fullName);
       });
    });
    return { status: 'success', message: 'Event & Sesi berhasil disimpan!' };
  } catch (error) { return { status: 'error', message: error.toString() }; }
}

// HANYA HELPER BACKEND - Tidak dipanggil langsung oleh Frontend via Router
function syncCrewStats(fullName) {
  const ss = getDB();
  const historySheet = ss.getSheetByName("HistoryEvent");
  const crewSheet = ss.getSheetByName("DataCrew");
  if(!historySheet || !crewSheet) return;
  // ... [LOGIKA TETAP SAMA SEBELUMNYA] ...
}

// Menarik histori satu crew (Disesuaikan agar menerima objek 'data')
function getCrewHistory(data) {
  const ss = getDB();
  const historySheet = ss.getSheetByName("HistoryEvent");
  if(!historySheet) return { status: 'success', data: [] };
  
  const hData = historySheet.getDataRange().getValues().slice(1);
  let events = [];
  hData.forEach(row => {
    if (row[9] === data.fullName) { events.push({ eventName: row[1], eventDate: row[2], role: row[10] }); } // Asumsi index col FullName 9, Role 10 based on headers
  });
  
  events.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const formattedEvents = events.map(e => {
    let d = new Date(e.eventDate);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} - ${e.role} (${e.eventName})`;
  });
  return { status: 'success', data: formattedEvents };
}

function getGroupedHistoryLogs() {
  const ss = getDB();
  const sheet = ss.getSheetByName("HistoryEvent");
  if (!sheet) return { status: 'success', data: [] };
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return { status: 'success', data: [] };

  let grouped = {};
  const headers = data[0];
  const tsIdx = headers.indexOf("Timestamp"); 
  const evtIdx = headers.indexOf("EventName"); 
  const dateIdx = headers.indexOf("EventDate"); 
  const shiftDateIdx = headers.indexOf("ShiftDate"); // Kolom baru
  const sesiIdx = headers.indexOf("Sesi"); 
  const callIdx = headers.indexOf("CallTime"); 
  const targetIdx = headers.indexOf("TargetEndTime"); 
  const nameIdx = headers.indexOf("FullName"); 
  const roleIdx = headers.indexOf("Role"); 
  const latIdx = headers.indexOf("Lat");
  const longIdx = headers.indexOf("Long");

  for (let i = 1; i < data.length; i++) {
    let ts = data[i][tsIdx];
    
    if (!grouped[ts]) {
      grouped[ts] = {
        timestamp: ts,
        eventName: data[i][evtIdx],
        eventDate: data[i][dateIdx], // Tanggal Event Utama
        lat: data[i][latIdx],
        long: data[i][longIdx],
        shifts: {} 
      };
    }
    
    let shiftKey = (data[i][sesiIdx] || "Shift") + "|" + (data[i][callIdx] || "");
    if (!grouped[ts].shifts[shiftKey]) {
        grouped[ts].shifts[shiftKey] = {
            sesiName: data[i][sesiIdx],
            shiftDate: shiftDateIdx !== -1 ? data[i][shiftDateIdx] : "", // Tanggal Spesifik Shift
            callTime: data[i][callIdx],
            targetEndTime: data[i][targetIdx],
            crews: []
        };
    }

    if (data[i][nameIdx] || data[i][roleIdx]) {
       grouped[ts].shifts[shiftKey].crews.push({ fullName: data[i][nameIdx], role: data[i][roleIdx] });
    }
  }
  
  const resultData = Object.values(grouped).map(g => {
      g.shifts = Object.values(g.shifts);
      g.totalCrews = g.shifts.reduce((sum, shift) => sum + shift.crews.length, 0);
      return g;
  }).reverse().slice(0, 50);
  
  return { status: 'success', data: resultData };
}

// Menghapus keseluruhan Event (Disesuaikan agar menerima objek 'data')
function deleteEventBatch(data) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("HistoryEvent");
    const sheetData = sheet.getDataRange().getDisplayValues();
    let crewsToUpdate = new Set();
    
    for (let i = sheetData.length - 1; i >= 1; i--) {
      // Ambil timestampStr dari payload JSON
      if (sheetData[i][0] === data.timestampStr) { 
        if(sheetData[i][9]) crewsToUpdate.add(sheetData[i][9]); // idx 9 is FullName
        sheet.deleteRow(i + 1);
      }
    }
    crewsToUpdate.forEach(name => syncCrewStats(name));
    return { status: 'success', message: 'Event beserta seluruh Shift berhasil dihapus!' };
  } catch(e) { return { status: 'error', message: e.toString() }; }
}

// Update keseluruhan Event (Disesuaikan agar menerima objek 'data')
function updateEventBatch(data) {
  // Ubah semua `payload` menjadi `data` di dalam sini.
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("HistoryEvent");
    const sheetData = sheet.getDataRange().getDisplayValues();
    let headers = sheetData[0];
    let crewsToUpdate = new Set();
    
    for (let i = sheetData.length - 1; i >= 1; i--) {
      if (sheetData[i][0] === data.oldTimestamp) {
        if(sheetData[i][9]) crewsToUpdate.add(sheetData[i][9]); // idx 9 is FullName
        sheet.deleteRow(i + 1);
      }
    }

    data.sessions.forEach(session => {
      let crewsToSave = session.crews.length > 0 ? session.crews : [{fullName: "", role: ""}];
      crewsToSave.forEach(crew => {
        let newRow = new Array(headers.length).fill('');
        headers.forEach((h, i) => {
            if(h === 'Timestamp') newRow[i] = data.oldTimestamp; 
            else if(h === 'EventName') newRow[i] = data.newEventName;
            else if(h === 'EventDate') newRow[i] = data.newEventDate;
            else if(h === 'ShiftDate') newRow[i] = session.shiftDate;
            else if(h === 'Sesi') newRow[i] = session.sesiName;
            else if(h === 'CallTime') newRow[i] = session.callTime;
            else if(h === 'TargetEndTime') newRow[i] = session.targetEndTime;
            else if(h === 'Lat') newRow[i] = data.lat;
            else if(h === 'Long') newRow[i] = data.long;
            else if(h === 'FullName') newRow[i] = crew.fullName || "";
            else if(h === 'Role') newRow[i] = crew.role || "";
            else if(h === 'OvertimeStatus') newRow[i] = "NONE";
        });
        sheet.appendRow(newRow);
        if(crew.fullName) crewsToUpdate.add(crew.fullName);
      });
    });

    crewsToUpdate.forEach(name => syncCrewStats(name));
    return { status: 'success', message: 'Event & seluruh Shift berhasil di-update!' };
  } catch(e) { return { status: 'error', message: e.toString() }; }
}

function getPendingOvertime() {
  const ss = getDB();
  const sheet = ss.getSheetByName("HistoryEvent");
  if (!sheet) return { status: 'success', data: [] };
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return { status: 'success', data: [] };
  
  let pendingList = [];
  const headers = data[0];
  const otHoursIdx = headers.indexOf("OvertimeHours");
  const otStatusIdx = headers.indexOf("OvertimeStatus");
  
  for (let i = data.length - 1; i >= 1; i--) { // Ambil dari yang terbaru
    // Cek jika statusnya PENDING dan ada jam lemburnya
    if (data[i][otStatusIdx] === "PENDING" && parseFloat(data[i][otHoursIdx]) > 0) {
      pendingList.push({
        row: i + 1, // Simpan nomor baris untuk diupdate nanti
        eventName: data[i][1],
        eventDate: data[i][2],
        sesiName: data[i][4], // Sesi is idx 4
        fullName: data[i][9], // FullName is idx 9
        tapOut: data[i][12], // TapOut is idx 12
        otHours: data[i][otHoursIdx]
      });
    }
  }
  return { status: 'success', data: pendingList };
}

// Update status lembur (Disesuaikan agar menerima objek 'data')
function updateOvertimeStatus(data) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("HistoryEvent");
    const headers = sheet.getDataRange().getValues()[0];
    const otStatusIdx = headers.indexOf("OvertimeStatus");
    
    // Gunakan data.row dan data.status
    sheet.getRange(data.row, otStatusIdx + 1).setValue(data.status);
    return { status: 'success', message: 'Status lembur berhasil di-' + data.status.toLowerCase() };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}