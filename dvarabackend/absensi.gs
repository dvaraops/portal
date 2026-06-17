/**
 * Mengambil daftar event terbaru untuk dropdown absensi
 * (Tidak butuh parameter, langsung dipanggil via router)
 */
function getEventsForAttendance() {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("HistoryEvent");
    if (!sheet) return [];
    
    // Ubah nama variabel menjadi sheetData agar aman
    const sheetData = sheet.getDataRange().getDisplayValues();
    if (sheetData.length <= 1) return [];
    
    // Ambil unique event berdasarkan kombinasi Nama Event + Tanggal
    let uniqueEvents = [];
    let seen = new Set();
    
    // Ambil dari bawah (event terbaru)
    for (let i = sheetData.length - 1; i >= 1; i--) {
      let key = sheetData[i][1] + " | " + sheetData[i][2]; // EventName | EventDate
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push({
          displayName: sheetData[i][1] + " (" + sheetData[i][2] + ")",
          eventName: sheetData[i][1],
          eventDate: sheetData[i][2]
        });
      }
      if (uniqueEvents.length >= 10) break; // Cukup tampilkan 10 event terakhir
    }
    return { status: 'success', data: uniqueEvents };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * Proses simpan absensi dari crew
 * Diubah agar menerima objek data (data.idCrew, data.event, data.type)
 */
function submitAttendance(data) {
  try {
    const ss = getDB();
    let sheet = ss.getSheetByName("AttendanceLogs");
    
    // Buat sheet log jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet("AttendanceLogs");
      sheet.appendRow(["Timestamp", "ID Crew", "Nama Crew", "Event", "Tipe", "Status"]);
    }
    
    // 1. Verifikasi ID Crew dulu
    const crewSheet = ss.getSheetByName("DataCrew");
    const crewData = crewSheet.getDataRange().getValues();
    const idIdx = crewData[0].indexOf("IDCrew");
    const nameIdx = crewData[0].indexOf("FullName");
    
    let crewName = "";
    for (let i = 1; i < crewData.length; i++) {
      if (crewData[i][idIdx] == data.idCrew) { // Akses data.idCrew
        crewName = crewData[i][nameIdx];
        break;
      }
    }
    
    if (!crewName) {
      return { status: 'error', message: 'ID Crew tidak terdaftar!' };
    }
    
    // 2. Simpan Data
    sheet.appendRow([
      new Date(),
      data.idCrew, // Akses data.idCrew
      crewName,
      data.event,  // Akses data.event
      data.type,   // Akses data.type ('Masuk' atau 'Pulang')
      "Hadir"
    ]);
    return { status: 'success', message: 'Terima kasih ' + crewName + ', absensi ' + data.type + ' berhasil!' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}