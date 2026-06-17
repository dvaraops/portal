function getCrewList(payload) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("DataCrew");
    if (!sheet) return { status: 'success', data: [] };
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', data: [] };
    const headers = data[0];
    const rows = data.slice(1);
    const resultData = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => { obj[header] = row[index]; });
      return obj;
    });
    return { status: 'success', data: resultData };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

function saveCrewData(payload) {
  try {
    const data = payload; // Ekstrak payload
    const ss = getDB();
    let blSheet = ss.getSheetByName("BlacklistCrew");
    if (blSheet) {
      const blData = blSheet.getDataRange().getValues();
      const blNoHpIndex = blData[0].indexOf('NoHP');
      for(let i = 1; i < blData.length; i++) {
        if(blData[i][blNoHpIndex] == data.noHp) {
          return { status: 'error', message: 'Akses Ditolak!\nNomor HP ini berada dalam daftar Blacklist Permanen.' };
        }
      }
    }
    
    const folder = DriveApp.getFolderById(CONFIG.FOLDER_CREW_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(data.fotoBase64), data.fotoMimeType, `${data.fullName}_PT_DVARA.jpeg`);
    const file = folder.createFile(blob);
    const fotoUrl = "https://drive.google.com/uc?id=" + file.getId() + "&sz=w1000";
    
    let sheet = ss.getSheetByName("DataCrew");
    if (!sheet) {
        sheet = ss.insertSheet("Crew");
        sheet.appendRow(['IDCrew', 'FullName', 'ShortName', 'MainRole', 'SubRole', 'NoHP', 'BankName', 'BankRek', 'RekName', 'TotalEvent', 'LastActive', 'URLFoto']);
    }
    
    let sheetData = sheet.getDataRange().getValues();
    let headers = sheetData[0];

    // MIGRATION: Auto-tambah kolom IDCrew kalau di sheet lama belum ada
    if (headers.indexOf('IDCrew') === -1) {
        sheet.insertColumnBefore(1);
        sheet.getRange(1, 1).setValue('IDCrew');
        sheetData = sheet.getDataRange().getValues();
        headers = sheetData[0];
        
        // Auto-generate ID buat crew yang udah ada sebelumnya di database lo
        for (let i = 1; i < sheetData.length; i++) {
            let idLama = "DVPT" + String(i).padStart(3, '0');
            sheet.getRange(i + 1, 1).setValue(idLama);
        }
        sheetData = sheet.getDataRange().getValues();
    }

    // LOGIC GENERATE ID BARU (Auto-Increment DVPTxxx)
    let maxId = 0;
    let idIndex = headers.indexOf('IDCrew');
    for (let i = 1; i < sheetData.length; i++) {
        let currentId = sheetData[i][idIndex];
        if (currentId && currentId.toString().startsWith('DVPT')) {
            let num = parseInt(currentId.toString().replace('DVPT', ''));
            if (num > maxId) maxId = num;
        }
    }
    let newId = "DVPT" + String(maxId + 1).padStart(3, '0');

    // Susun baris baru
    let newRow = new Array(headers.length).fill('');
    headers.forEach((h, index) => {
        if (h === 'IDCrew') newRow[index] = newId;
        else if (h === 'FullName') newRow[index] = data.fullName;
        else if (h === 'ShortName') newRow[index] = data.shortName;
        else if (h === 'MainRole') newRow[index] = 'Belum Ditentukan';
        else if (h === 'SubRole') newRow[index] = '-';
        else if (h === 'NoHP') newRow[index] = data.noHp;
        else if (h === 'BankName') newRow[index] = data.bankName;
        else if (h === 'BankRek') newRow[index] = data.bankRek;
        else if (h === 'RekName') newRow[index] = data.rekName;
        else if (h === 'TotalEvent') newRow[index] = 0;
        else if (h === 'LastActive') newRow[index] = 'Belum ada';
        else if (h === 'URLFoto') newRow[index] = fotoUrl;
    });
    
    sheet.appendRow(newRow);
    return { status: 'success', message: 'Crew Berhasil Disimpan!\nID: ' + newId };
  } catch (error) { return { status: 'error', message: error.toString() }; }
}

function deleteCrewData(payload) {
  try {
    const { noHp, isBlacklist } = payload; // Ekstrak dari POST payload
    const ss = getDB();
    const sheet = ss.getSheetByName("DataCrew");
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const noHpIndex = headers.indexOf('NoHP');
    const fotoIndex = headers.indexOf('URLFoto');
    for (let i = 1; i < data.length; i++) {
      if (data[i][noHpIndex] == noHp) {
        const fotoUrl = data[i][fotoIndex];
        if (fotoUrl && fotoUrl.includes('id=')) {
          try { DriveApp.getFileById(fotoUrl.split('id=')[1]).setTrashed(true);
          } catch(e) {}
        }
        if (isBlacklist) {
          let blSheet = ss.getSheetByName("BlacklistCrew") || ss.insertSheet("BlacklistCrew");
          if (blSheet.getLastRow() === 0) blSheet.appendRow(headers);
          blSheet.appendRow(data[i]);
        }
        sheet.deleteRow(i + 1);
        return { status: 'success', message: isBlacklist ? 'Crew berhasil di-blacklist permanen & semua data dihapus.' : 'Data Crew & Foto berhasil dihapus total.' };
      }
    }
    return { status: 'error', message: 'Data tidak ditemukan.' };
  } catch (err) { return { status: 'error', message: err.toString() }; }
}

function editCrewData(payload) {
  try {
    const data = payload; // Ekstrak payload
    const ss = getDB();
    const sheet = ss.getSheetByName("DataCrew");
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const noHpIndex = headers.indexOf('NoHP');
    const fullNameIdx = headers.indexOf('FullName');
    const shortNameIdx = headers.indexOf('ShortName');
    const mainRoleIdx = headers.indexOf('MainRole');
    const subRoleIdx = headers.indexOf('SubRole');
    const bankNameIdx = headers.indexOf('BankName');
    const bankRekIdx = headers.indexOf('BankRek');
    const rekNameIdx = headers.indexOf('RekName');
    const urlFotoIdx = headers.indexOf('URLFoto');

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][noHpIndex] == data.oldNoHp) { 
        let finalFotoUrl = rows[i][urlFotoIdx];
        if (data.fotoBase64) {
           if (finalFotoUrl && finalFotoUrl.includes('id=')) {
              try { DriveApp.getFileById(finalFotoUrl.split('id=')[1].split('&')[0]).setTrashed(true);
              } catch(e) {}
           }
           const folder = DriveApp.getFolderById(CONFIG.FOLDER_CREW_ID);
           const blob = Utilities.newBlob(Utilities.base64Decode(data.fotoBase64), data.fotoMimeType, `${data.fullName}_PT_DVARA.jpeg`);
           const file = folder.createFile(blob);
           finalFotoUrl = "https://drive.google.com/uc?id=" + file.getId() + "&sz=w1000";
        }

        const rowNum = i + 1;
        if(fullNameIdx !== -1) sheet.getRange(rowNum, fullNameIdx + 1).setValue(data.fullName);
        if(shortNameIdx !== -1) sheet.getRange(rowNum, shortNameIdx + 1).setValue(data.shortName);
        if(noHpIndex !== -1) sheet.getRange(rowNum, noHpIndex + 1).setValue(data.newNoHp);
        if(bankNameIdx !== -1) sheet.getRange(rowNum, bankNameIdx + 1).setValue(data.bankName);
        if(bankRekIdx !== -1) sheet.getRange(rowNum, bankRekIdx + 1).setValue(data.bankRek);
        if(rekNameIdx !== -1) sheet.getRange(rowNum, rekNameIdx + 1).setValue(data.rekName);
        if(mainRoleIdx !== -1) sheet.getRange(rowNum, mainRoleIdx + 1).setValue(data.mainRole);
        if(subRoleIdx !== -1) sheet.getRange(rowNum, subRoleIdx + 1).setValue(data.subRole);
        if(data.fotoBase64 && urlFotoIdx !== -1) sheet.getRange(rowNum, urlFotoIdx + 1).setValue(finalFotoUrl);

        return { status: 'success', message: 'Data Crew berhasil diperbarui!' };
      }
    }
    return { status: 'error', message: 'Data crew tidak ditemukan di database.' };
  } catch (error) { return { status: 'error', message: error.toString() }; }
}

// FUNGSI BARU: Buat narik list Role Paten untuk Dropdown
function getMasterRoles(payload) {
  try {
    const ss = getDB();
    let sheet = ss.getSheetByName("MasterDropdown");
    if (!sheet) {
      sheet = ss.insertSheet("MasterDropdown");
      sheet.appendRow(["RoleName"]);
      sheet.appendRow(["SPV Operations"]);
      sheet.appendRow(["Return Area"]);
      sheet.appendRow(["Tap In"]);
      sheet.appendRow(["Dessert Area"]);
      sheet.appendRow(["Drinks Area"]);
      sheet.appendRow(["Clear Area (Loading)"]);
      sheet.appendRow(["Trolley"]);
    }
    const data = sheet.getDataRange().getValues();
    if(data.length <= 1) return { status: 'success', data: [] };
    const roles = data.slice(1).map(row => row[0]).filter(r => r !== "");
    return { status: 'success', data: roles };
  } catch(e) {
    return { status: 'error', message: e.toString() };
  }
}

// FUNGSI BARU: Tarik Histori Event per Crew & Sortir Kronologis (Terbaru ke Terlama)
function getCrewHistory(payload) {
  try {
    const fullName = payload.fullName || payload; // support both object and string for legacy
    const ss = getDB();
    // Asumsi nama sheet di DB lo "HistoryEvent"
    const sheet = ss.getSheetByName("HistoryEvent"); 
    if (!sheet) return { status: 'success', data: [] };
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', data: [] };

    const headers = data[0];
    // Pastikan nama header ini sesuai sama DB WEB.xlsx - HistoryEvent.csv lo
    const dateIdx = headers.indexOf("EventDate"); 
    const nameIdx = headers.indexOf("EventName");
    const crewIdx = headers.indexOf("FullName");
    const roleIdx = headers.indexOf("Role");

    let history = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][crewIdx] === fullName) {
        let rawDate = new Date(data[i][dateIdx]);
        history.push({
          dateObj: rawDate,
          // Format tanggal jadi rapi (Ex: 28 May 2026)
          dateStr: Utilities.formatDate(rawDate, "GMT+7", "dd MMM yyyy"), 
          eventName: data[i][nameIdx],
          role: data[i][roleIdx]
        });
      }
    }

    // LOGIC KRONOLOGIS: Sort berdasarkan tanggal event (Descending: terbaru di atas)
    history.sort((a, b) => b.dateObj - a.dateObj);

    // Return dalam bentuk array string biar langsung di-map sama UI Crew.jsx lo
    const resultData = history.map(h => `${h.dateStr} - ${h.eventName} (Role: ${h.role})`);
    return { status: 'success', data: resultData };
    
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

// FUNGSI BARU: Buat Dropdown WA Blast (Group Event Unik)
function getGroupedHistoryLogs(payload) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("HistoryEvent");
    if (!sheet) return { status: 'success', data: [] };
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', data: [] };

    const headers = data[0];
    const dateIdx = headers.indexOf("EventDate");
    const nameIdx = headers.indexOf("EventName");

    let uniqueEvents = new Map();
    
    for (let i = 1; i < data.length; i++) {
      let eName = data[i][nameIdx];
      let rawDate = new Date(data[i][dateIdx]);
      let eDateStr = Utilities.formatDate(rawDate, "GMT+7", "dd MMM yyyy");
      
      let key = `${eName}_${eDateStr}`;
      if (!uniqueEvents.has(key)) {
        uniqueEvents.set(key, {
          eventName: eName,
          eventDate: eDateStr,
          timestamp: rawDate.getTime()
        });
      }
    }

    let result = Array.from(uniqueEvents.values());
    // Sort kronologis juga buat di dropdown WA Blast
    result.sort((a, b) => b.timestamp - a.timestamp);
    
    // Hapus timestamp, sisa eventName & eventDate buat dilempar ke UI
    const resultData = result.map(ev => ({ eventName: ev.eventName, eventDate: ev.eventDate }));
    return { status: 'success', data: resultData };
    
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}