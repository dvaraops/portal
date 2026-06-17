function autoSetupInventory() {
  const ss = getDB();
  let sheet = ss.getSheetByName("InventoryData");
  if (!sheet) {
    sheet = ss.insertSheet("InventoryData");
    sheet.appendRow(["ID", "Kategori", "NamaBarang", "Jumlah", "MinStok", "Satuan", "Kondisi", "Keterangan", "URLFoto", "LastUpdate"]);
  }
  return { status: 'ready', message: 'Database sudah siap.' };
}

function getInventoryList(payload) {
  try {
    const ss = getDB();
    let sheet = ss.getSheetByName("InventoryData");
    if (!sheet) { autoSetupInventory(); sheet = ss.getSheetByName("InventoryData"); }
    const sheetData = sheet.getDataRange().getValues();
    if (sheetData.length <= 1) return { status: 'success', data: [] };
    const headers = sheetData[0];
    const rows = sheetData.slice(1);
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

function saveInventoryItem(data) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("InventoryData");
    let sheetData = sheet.getDataRange().getValues();
    let headers = sheetData[0];

    if (headers.indexOf("MinStok") === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue("MinStok");
        sheetData = sheet.getDataRange().getValues();
        headers = sheetData[0];
    }

    const idIdx = headers.indexOf('ID');
    const catIdx = headers.indexOf('Kategori');
    const urlIdx = headers.indexOf('URLFoto');
    const minStokIdx = headers.indexOf('MinStok');

    let fotoUrl = "";
    if (data.fotoBase64) {
      const folder = DriveApp.getFolderById(CONFIG.FOLDER_INVENTORY_ID);
      const blob = Utilities.newBlob(Utilities.base64Decode(data.fotoBase64), data.fotoMimeType, `INV_${data.namaBarang}.jpeg`);
      const file = folder.createFile(blob);
      fotoUrl = "https://drive.google.com/uc?id=" + file.getId();
    }

    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // --- MODE EDIT ---
    if (data.id) {
       for(let i=1; i<sheetData.length; i++) {
           if(sheetData[i][idIdx] === data.id) {
               const rowNum = i + 1;
               if(fotoUrl === "") { fotoUrl = sheetData[i][urlIdx]; }
               else if(sheetData[i][urlIdx] && sheetData[i][urlIdx].includes('id=')) {
                   try { DriveApp.getFileById(sheetData[i][urlIdx].split('id=')[1]).setTrashed(true); } catch(e){}
               }

               sheet.getRange(rowNum, catIdx + 1).setValue(data.kategori);
               sheet.getRange(rowNum, headers.indexOf('NamaBarang') + 1).setValue(data.namaBarang);
               sheet.getRange(rowNum, headers.indexOf('Jumlah') + 1).setValue(data.jumlah);
               sheet.getRange(rowNum, minStokIdx + 1).setValue(data.minStok || 0);
               sheet.getRange(rowNum, headers.indexOf('Satuan') + 1).setValue(data.satuan);
               sheet.getRange(rowNum, headers.indexOf('Kondisi') + 1).setValue(data.kondisi);
               sheet.getRange(rowNum, headers.indexOf('Keterangan') + 1).setValue(data.keterangan);
               sheet.getRange(rowNum, urlIdx + 1).setValue(fotoUrl);
               sheet.getRange(rowNum, headers.indexOf('LastUpdate') + 1).setValue(dateStr);
               
               return { status: 'success', message: 'Barang berhasil diupdate!' };
           }
       }
    }

    // --- MODE ADD ---
    let catToPrefix = {};
    let nextPrefix = 1;
    for(let i=1; i<sheetData.length; i++) {
        let cat = (sheetData[i][catIdx] || "").toString().trim();
        if(cat && !catToPrefix[cat]) { catToPrefix[cat] = nextPrefix++; }
    }
    
    let myPrefix = catToPrefix[data.kategori.trim()];
    if(!myPrefix) myPrefix = nextPrefix;
    
    let maxSuffix = 0;
    for(let i=1; i<sheetData.length; i++) {
        let idStr = (sheetData[i][idIdx] || "").toString().trim();
        let expectedStart = "INV-" + myPrefix;
        if(idStr.startsWith(expectedStart)) {
            let suffixStr = idStr.replace(expectedStart, "");
            let suffix = parseInt(suffixStr);
            if(!isNaN(suffix) && suffix > maxSuffix) maxSuffix = suffix;
        }
    }
    
    let newSuffix = String(maxSuffix + 1).padStart(2, '0');
    const uniqueID = "INV-" + myPrefix + newSuffix;

    let newRow = [];
    headers.forEach(h => {
        if(h==='ID') newRow.push(uniqueID);
        else if(h==='Kategori') newRow.push(data.kategori);
        else if(h==='NamaBarang') newRow.push(data.namaBarang);
        else if(h==='Jumlah') newRow.push(data.jumlah);
        else if(h==='MinStok') newRow.push(data.minStok || 0);
        else if(h==='Satuan') newRow.push(data.satuan);
        else if(h==='Kondisi') newRow.push(data.kondisi);
        else if(h==='Keterangan') newRow.push(data.keterangan);
        else if(h==='URLFoto') newRow.push(fotoUrl);
        else if(h==='LastUpdate') newRow.push(dateStr);
        else newRow.push('');
    });
    
    sheet.appendRow(newRow);
    return { status: 'success', message: 'Barang baru berhasil ditambahkan!' };
  } catch (err) { return { status: 'error', message: err.toString() }; }
}

// Diubah agar menerima objek data (data.id, data.newJumlah, data.tipe, dll)
function updateInventoryStock(data) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("InventoryData");
    const sheetData = sheet.getDataRange().getValues(); // Ubah nama variabel 
    const headers = sheetData[0];
    const idIndex = headers.indexOf('ID');
    const jumlahIndex = headers.indexOf('Jumlah');
    const updateIndex = headers.indexOf('LastUpdate');
    
    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][idIndex] === data.id) {
        const rowNum = i + 1;
        sheet.getRange(rowNum, jumlahIndex + 1).setValue(data.newJumlah);
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        sheet.getRange(rowNum, updateIndex + 1).setValue(dateStr);
        return { status: 'success', message: `Stok berhasil di-${data.tipe}!` };
      }
    }
    return { status: 'error', message: 'ID Barang tidak ditemukan.' };
  } catch (err) { return { status: 'error', message: err.toString() }; }
}

// Diubah agar menerima objek data (data.id)
function deleteInventoryItem(data) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("InventoryData");
    const sheetData = sheet.getDataRange().getValues(); // Ubah nama variabel
    const idIndex = sheetData[0].indexOf('ID');

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][idIndex] === data.id) {
        const fotoUrl = sheetData[i][sheetData[0].indexOf('URLFoto')];
        if (fotoUrl && fotoUrl.includes('id=')) {
          try { DriveApp.getFileById(fotoUrl.split('id=')[1]).setTrashed(true); } catch(e) {}
        }
        sheet.deleteRow(i + 1);
        return { status: 'success', message: 'Barang berhasil dihapus.' };
      }
    }
    return { status: 'error', message: 'ID Barang tidak ditemukan.' };
  } catch (e) { return { status: 'error', message: e.toString() }; }
}