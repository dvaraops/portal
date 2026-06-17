// Helper Image (Tidak dipanggil langsung oleh frontend)
function getBase64Image(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    return "data:" + file.getMimeType() + ";base64," + Utilities.base64Encode(file.getBlob().getBytes());
  } catch(e) {
    return "";
  }
}

// Diubah agar menerima objek data (data.jadwals, data.vendorName, dll)
function generatePublicLoadingPDF(data) {
  try {
    const templateId = CONFIG.TEMPLATE_LOADING_ID;
    const destFolderId = CONFIG.FOLDER_LOADING_DEST;
    const accessCode = Math.floor(100000 + Math.random() * 900000).toString();

    const formatTanggal = (isoDate) => {
      if (!isoDate) return " ";
      const dateObj = new Date(isoDate);
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `${days[dateObj.getDay()]}, ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()} ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    };

    let allDates = [];
    data.jadwals.forEach(j => {
        if (j.type === 'Keduanya') {
            if (j.waktuMasuk) allDates.push(new Date(j.waktuMasuk));
            if (j.waktuKeluar) allDates.push(new Date(j.waktuKeluar));
        } else {
            if (j.waktu) allDates.push(new Date(j.waktu));
        }
    });
    allDates = allDates.filter(d => !isNaN(d.getTime()));

    let tglFileName = "";
    const monthsName = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    if (allDates.length > 0) {
        let minDate = new Date(Math.min(...allDates));
        let maxDate = new Date(Math.max(...allDates));
        if (minDate.toDateString() === maxDate.toDateString()) {
            tglFileName = `${minDate.getDate()} ${monthsName[minDate.getMonth()]} ${minDate.getFullYear()}`;
        } else if (minDate.getMonth() === maxDate.getMonth() && minDate.getFullYear() === maxDate.getFullYear()) { 
            tglFileName = `${minDate.getDate()} - ${maxDate.getDate()} ${monthsName[minDate.getMonth()]} ${minDate.getFullYear()}`;
        } else { 
            tglFileName = `${minDate.getDate()} ${monthsName[minDate.getMonth()]} - ${maxDate.getDate()} ${monthsName[maxDate.getMonth()]} ${maxDate.getFullYear()}`;
        }
    } else {
        let today = new Date();
        tglFileName = `${today.getDate()} ${monthsName[today.getMonth()]} ${today.getFullYear()}`;
    }

    let hasMasuk = data.jadwals.some(j => j.type === 'Masuk' || j.type === 'Keduanya');
    let hasKeluar = data.jadwals.some(j => j.type === 'Keluar' || j.type === 'Keduanya');
    let typeLabel = (hasMasuk && hasKeluar) ? 'Keluar Masuk' : (hasMasuk ? 'Masuk' : 'Keluar');
    const finalFileName = `Surat Loading (${typeLabel}) Barang_${data.vendorName}_${tglFileName}`;

    const destFolder = DriveApp.getFolderById(destFolderId);
    const tempFile = DriveApp.getFileById(templateId).makeCopy(finalFileName + "_temp", destFolder);
    const tempId = tempFile.getId();
    const presentation = SlidesApp.openById(tempId);
    const baseSlide = presentation.getSlides()[0];
    
    data.jadwals.forEach((jadwal) => {
        let strBarang = "", strJml = "", strKet = "";
        if (jadwal.items && jadwal.items.length > 0) {
            jadwal.items.forEach(item => {
                strBarang += (item.barang || " ") + "\n";
                strJml += (item.jml || " ") + "\n";
                strKet += (item.ket || " ") + "\n";
            });
        }

        let typesToGenerate = jadwal.type === 'Keduanya' ? ['Masuk', 'Keluar'] : [jadwal.type];
        
        typesToGenerate.forEach(currentType => {
            let currentSlide = presentation.appendSlide(baseSlide);
            if (jadwal.items && jadwal.items.length > 12) {
                currentSlide.getShapes().forEach(shape => {
                    let text = shape.getText().asString();
                    if (text.includes("{{BARANG}}") || text.includes("{{JML}}") || text.includes("{{KET}}")) {
                        shape.getText().getTextStyle().setFontSize(8);
                    }
                });
            }

            let fixWaktu = "", fixPembawa = "", fixNopol = "";
            if (jadwal.type === 'Keduanya') {
                if (currentType === 'Masuk') {
                    fixWaktu = jadwal.waktuMasuk; fixPembawa = jadwal.pembawaMasuk; fixNopol = jadwal.nopolMasuk;
                } else {
                    fixWaktu = jadwal.waktuKeluar;
                    fixPembawa = jadwal.isSama ? jadwal.pembawaMasuk : jadwal.pembawaKeluar; 
                    fixNopol = jadwal.isSama ? jadwal.nopolMasuk : jadwal.nopolKeluar;
                }
            } else {
                fixWaktu = jadwal.waktu; fixPembawa = jadwal.pembawa; fixNopol = jadwal.nopol;
            }

            const elements = currentSlide.getPageElements();
            elements.forEach(el => {
              const altText = ((el.getTitle() || "") + " " + (el.getDescription() || "")).toLowerCase();
              if (currentType === 'Masuk' && altText.includes('coret_masuk')) el.remove();
              if (currentType === 'Keluar' && altText.includes('coret_keluar')) el.remove();
              if (data.status === 'Tenant' && altText.includes('x_kontraktor')) el.remove();
              if (data.status === 'Kontraktor' && altText.includes('x_tenant')) el.remove();
            });
            
            currentSlide.replaceAllText("{{NAMA_TENANT}}", data.vendorName || " ");
            currentSlide.replaceAllText("{{LANTAI}}", data.lantai || " ");
            currentSlide.replaceAllText("{{BARANG}}", strBarang);
            currentSlide.replaceAllText("{{JML}}", strJml);
            currentSlide.replaceAllText("{{KET}}", strKet);
            currentSlide.replaceAllText("{{PEMBAWA}}", fixPembawa || " ");
            currentSlide.replaceAllText("{{NOPOL}}", fixNopol || " ");
            currentSlide.replaceAllText("{{WAKTU}}", formatTanggal(fixWaktu) || " ");

            let finalTtdName = data.ttdName ? data.ttdName.toUpperCase() : data.vendorName.toUpperCase();
            currentSlide.replaceAllText("{{TTD_NAME}}", finalTtdName);

            if (data.ttdBase64) {
              const blob = Utilities.newBlob(Utilities.base64Decode(data.ttdBase64), 'image/png', 'ttd.png');
              const freshElements = currentSlide.getPageElements();
              freshElements.forEach(el => {
                try {
                  const altText = ((el.getTitle() || "") + " " + (el.getDescription() || "")).toLowerCase();
                  if (altText.includes('img_ttd')) el.asImage().replace(blob); 
                } catch(e) {}
              });
            }
        });
    });

    baseSlide.remove();
    presentation.saveAndClose();
    Utilities.sleep(4000);
    
    const refreshedTempFile = DriveApp.getFileById(tempId);
    const pdfBlob = refreshedTempFile.getAs(MimeType.PDF);
    pdfBlob.setName(finalFileName + ".pdf");
    const newPdfFile = destFolder.createFile(pdfBlob);
    newPdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    refreshedTempFile.setTrashed(true);
    const pdfUrl = `https://drive.google.com/file/d/${newPdfFile.getId()}/edit`;

    // Gunakan getDB()
    const ss = getDB();
    let sheet = ss.getSheetByName("LoadingForm");
    if (!sheet) {
      sheet = ss.insertSheet("LoadingForm");
      sheet.appendRow(["FileName", "DateCreated", "URL", "Vendor", "Type", "AccessCode", "CreatedFrom"]);
    } else {
      let headers = sheet.getDataRange().getValues()[0];
      if (headers.indexOf("AccessCode") === -1) sheet.getRange(1, sheet.getLastColumn() + 1).setValue("AccessCode");
      if (headers.indexOf("CreatedFrom") === -1) sheet.getRange(1, sheet.getLastColumn() + 1).setValue("CreatedFrom");
    }
    
    let headersFinal = sheet.getDataRange().getValues()[0];
    let newRow = new Array(headersFinal.length).fill('');
    
    const now = new Date();
    const daysName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const tableDate = `${daysName[now.getDay()]}, ${now.getDate()} ${monthsName[now.getMonth()]} ${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    headersFinal.forEach((h, i) => {
        if(h === 'FileName') newRow[i] = finalFileName + ".pdf";
        else if(h === 'DateCreated') newRow[i] = tableDate;
        else if(h === 'URL') newRow[i] = pdfUrl;
        else if(h === 'Vendor') newRow[i] = data.vendorName;
        else if(h === 'Type') newRow[i] = typeLabel;
        else if(h === 'AccessCode') newRow[i] = accessCode;
        else if(h === 'CreatedFrom') newRow[i] = 'Public';
    });
    
    sheet.appendRow(newRow);
    
    return { status: 'success', message: 'Surat Loading Terbuat!', url: pdfUrl, accessCode: accessCode, fileName: finalFileName + ".pdf" };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

// Diubah agar menerima objek data (data.email, data.url, data.accessCode, data.fileName)
function sendLoadingEmailCopy(data) {
  try {
    let fileIdMatch = data.url.match(/[-\w]{25,}/);
    if(!fileIdMatch) return {status: 'error', message: 'URL tidak valid'};
    let file = DriveApp.getFileById(fileIdMatch[0]);
    
    let emailName = data.email.split('@')[0].replace(/[-_.]/g, ' ');
    emailName = emailName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const htmlMessage = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background-color: #800000; padding: 20px; text-align: center;">
              <h2 style="color: white; margin: 0; letter-spacing: 1px;">DVARA</h2>
          </div>
          <div style="padding: 30px; background-color: #ffffff;">
              <p style="font-size: 16px; color: #334155;">Halo <strong>${emailName}</strong>,</p>
              <p style="font-size: 16px; color: #334155;">Terlampir adalah copy Surat Loading / Ijin Keluar Masuk Barang Anda.</p>
              <div style="background-color: #fdf2f8; border-left: 4px solid #9f1239; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 14px; color: #64748b;">Gunakan Access Code ini jika Anda ingin melihat kembali atau menghapus surat melalui portal publik:</p>
                  <h1 style="margin: 10px 0 0 0; color: #800000; letter-spacing: 5px;">${data.accessCode}</h1>
              </div>
              <p style="font-size: 14px; color: #94a3b8; text-align: center; margin-top: 30px;">Email ini dibuat secara otomatis oleh sistem DVARA.</p>
          </div>
      </div>
    `;

    MailApp.sendEmail({
      to: data.email,
      subject: `DVARA - Copy of ${data.fileName}`,
      htmlBody: htmlMessage,
      attachments: [file.getAs(MimeType.PDF)]
    });
    return { status: 'success', message: 'Email berhasil dikirim!' };
  } catch(e) {
    return { status: 'error', message: e.toString() };
  }
}

// Diubah agar menerima objek data (data.code)
function fetchLoadingByAccessCode(data) {
  try {
    const ss = getDB(); // Gunakan getDB()
    const sheet = ss.getSheetByName("LoadingForm");
    if (!sheet) return {status: 'error', message: 'Database belum siap'};
    
    const sheetData = sheet.getDataRange().getValues();
    if(sheetData.length <= 1) return {status: 'error', message: 'Data masih kosong.'};

    const headers = sheetData[0];
    const accessCodeIdx = headers.indexOf('AccessCode');
    if (accessCodeIdx === -1) return {status: 'error', message: 'Sistem sedang diupdate, coba lagi nanti.'};

    let results = [];
    for(let i=1; i<sheetData.length; i++) {
      if(sheetData[i][accessCodeIdx] && sheetData[i][accessCodeIdx].toString().trim() === data.code.toString().trim()) {
        results.push({
          fileName: sheetData[i][0],
          date: sheetData[i][1],
          url: sheetData[i][2],
          vendor: sheetData[i][3]
        });
      }
    }
    
    if(results.length > 0) return {status: 'success', data: results};
    else return {status: 'error', message: 'Surat dengan Access Code tersebut tidak ditemukan.'};
  } catch(e) {
    return {status: 'error', message: e.toString()};
  }
}

// Diubah agar menerima objek data (data.url, data.code)
function deleteLoadingByCode(data) {
  try {
    const ss = getDB(); // Gunakan getDB()
    const sheet = ss.getSheetByName("LoadingForm");
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    const urlIdx = headers.indexOf('URL');
    const codeIdx = headers.indexOf('AccessCode');
    
    for(let i=1; i<sheetData.length; i++) {
      if(sheetData[i][urlIdx] === data.url && sheetData[i][codeIdx].toString().trim() === data.code.toString().trim()) {
        let fileIdMatch = data.url.match(/[-\w]{25,}/);
        if(fileIdMatch) {
          try { DriveApp.getFileById(fileIdMatch[0]).setTrashed(true); } catch(e){}
        }
        sheet.deleteRow(i + 1);
        return {status: 'success', message: 'Surat berhasil dihapus permanen.'};
      }
    }
    return {status: 'error', message: 'Gagal menghapus. Access Code tidak cocok.'};
  } catch(e) {
    return {status: 'error', message: e.toString()};
  }
}

function getLoadingFormList(payload) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("LoadingForm");
    if (!sheet) return { status: 'success', data: [] };
    
    const sheetData = sheet.getDataRange().getValues();
    if (sheetData.length <= 1) return { status: 'success', data: [] };

    const headers = sheetData[0];
    const rows = sheetData.slice(1);
    const resultData = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => { obj[header] = row[index]; });
      return {
        fileName: obj['FileName'],
        date: obj['DateCreated'],
        url: obj['URL'],
        vendor: obj['Vendor'],
        type: obj['Type'],
        accessCode: obj['AccessCode'],
        createdFrom: obj['CreatedFrom']
      };
    });
    
    // Sort descending by id conceptually or just reverse it to get newest first
    resultData.reverse();

    return { status: 'success', data: resultData };
  } catch (error) {
    return { status: 'error', message: error.toString() };
  }
}

function deleteLoadingForm(data) {
  try {
    const url = data.url;
    const ss = getDB();
    const sheet = ss.getSheetByName("LoadingForm");
    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    const urlIdx = headers.indexOf('URL');
    
    for(let i=1; i<sheetData.length; i++) {
      if(sheetData[i][urlIdx] === url) {
        let fileIdMatch = url.match(/[-\w]{25,}/);
        if(fileIdMatch) {
          try { DriveApp.getFileById(fileIdMatch[0]).setTrashed(true); } catch(e){}
        }
        sheet.deleteRow(i + 1);
        return {status: 'success', message: 'Surat berhasil dihapus permanen.'};
      }
    }
    return {status: 'error', message: 'Surat tidak ditemukan.'};
  } catch(e) {
    return {status: 'error', message: e.toString()};
  }
}