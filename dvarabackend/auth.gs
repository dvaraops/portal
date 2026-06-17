/**
 * Semua fungsi di sini menerima 'data' yang dikirim dari 
 * code.gs (Router) melalui JSON.parse(e.postData.contents).
 */

function login(data) {
  const ss = getDB(); 
  const sheet = ss.getSheetByName("Users");
  const rows = sheet.getDataRange().getValues();
  // Normalisasi header agar tidak sensitif terhadap spasi di spreadsheet
  const headers = rows[0].map(h => String(h).trim());
  
  const idx = {
    username: headers.indexOf('Username'),
    password: headers.indexOf('Password'),
    status:   headers.indexOf('Status'),
    fullName: headers.indexOf('FullName'),
    role:     headers.indexOf('Role'),
    email:    headers.indexOf('Email'),
    creation: headers.indexOf('CreationDate'),
    avatar:   headers.indexOf('Avatar')
  };
  
  // Validasi kolom krusial
  if (idx.username === -1 || idx.password === -1) {
    return { status: 'error', message: 'Database error: Kolom Username/Password tidak ditemukan.' };
  }

  for (let i = 1; i < rows.length; i++) {
    const dbUsername = String(rows[i][idx.username]).trim();
    const dbPassword = String(rows[i][idx.password]).trim();
    
    if (dbUsername === data.username.trim() && dbPassword === data.password.trim()) {
      if (String(rows[i][idx.status]).trim() === 'approved') {
        return { 
          status: 'success', 
          username: dbUsername,
          fullName: idx.fullName !== -1 ? rows[i][idx.fullName] : 'N/A',
          role: idx.role !== -1 ? rows[i][idx.role] : 'Operational Executive',
          email: idx.email !== -1 ? rows[i][idx.email] : '',
          creationDate: idx.creation !== -1 ? rows[i][idx.creation] : '',
          avatar: idx.avatar !== -1 ? rows[i][idx.avatar] : ''
        };
      } else {
        return { status: 'blocked', message: 'Akun berstatus: ' + rows[i][idx.status] };
      }
    }
  }
  return { status: 'error', message: 'Username atau password salah.' };
}

// --- HELPER FUNCTION YANG HILANG ---
function capitalizeWords(str) {
  if (!str) return "";
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// --- FUNGSI SIGNUP TERBARU ---
function signup(data) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Users");
  const tableData = sheet.getDataRange().getValues();
  const headers = tableData[0];
  
  const usernameIndex = headers.indexOf('Username');
  const emailIndex = headers.indexOf('Email');
  
  // Validasi unik
  for (let i = 1; i < tableData.length; i++) {
    if (tableData[i][usernameIndex] === data.username) return { status: 'error', message: 'Username sudah digunakan.' };
    if (emailIndex !== -1 && tableData[i][emailIndex] === data.email) return { status: 'error', message: 'Email sudah terdaftar.' };
  }
  
  // --- VALIDASI PASSWORD STRENGTH (BACKEND LAYER) ---
  const pw = data.password;
  if (pw.length < 6) return { status: 'error', message: 'Password minimal 6 karakter.' };
  if (!/[a-z]/.test(pw)) return { status: 'error', message: 'Password harus mengandung huruf kecil.' };
  if (!/[A-Z]/.test(pw)) return { status: 'error', message: 'Password harus mengandung huruf besar.' };
  if (!/[0-9]/.test(pw)) return { status: 'error', message: 'Password harus mengandung angka.' };
  
  // Insert data baru
  sheet.appendRow([
    data.username,
    capitalizeWords(data.fullName),
    capitalizeWords(data.role || "Operational Executive"),
    data.email,      
    data.password,   
    'disapproved',
    new Date(),
    '' 
  ]);
  
  return { status: 'success', message: 'Akun berhasil dibuat! Silakan tunggu persetujuan admin.' };
}

function forgotPassword(data) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Users"); // Pastikan nama sheet ini sesuai dengan file lo ("Users" atau "Sheet1")
  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData.shift();
  
  const emailIndex = headers.indexOf('Email');
  const otpIndex = headers.indexOf('OTP');
  const nameIndex = headers.indexOf('FullName'); // 1. Ambil index kolom FullName
  
  for (let i = 0; i < sheetData.length; i++) {
    if (sheetData[i][emailIndex] === data.email) {
      const fullName = sheetData[i][nameIndex] || "User"; // 2. Ambil namanya
      const otp = Math.floor(100000 + Math.random() * 900000);
      
      sheet.getRange(i + 2, otpIndex + 1).setValue(otp);
      const otpSpaced = otp.toString().split('').join(' ');
      
      const logoUrl = "https://dvaraops.github.io/portal/src/logo/dvara-white-logo.png";
      
      const htmlMessage = `<!DOCTYPE html>
      <html lang="id">
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
              body { margin: 0; padding: 20px; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif; }
              .bg-container { background-color: #ffffff; max-width: 560px; margin: 0 auto; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; }
              .text-main { font-size: 15px; line-height: 1.6; color: #334155; }
              .text-muted { font-size: 12px; line-height: 1.5; color: #64748b; }
          </style>
      </head>
      <body>
          <div class="bg-container">
              <div style="background-color: #330F19; padding: 32px 20px; text-align: center;">
                  <img src="${logoUrl}" alt="DVARA Logo" style="max-width: 140px; height: auto; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.2));">
              </div>
              
              <div style="padding: 32px 24px;">
                  <p class="text-main">Hai <strong>${fullName}</strong>,</p> <p class="text-main">Kami telah menerima permintaan kode OTP untuk melakukan reset kata sandi pada akun DVARA Operations Anda.</p>
                  <p class="text-main">Silakan gunakan 6 digit kode autentikasi di bawah ini untuk memverifikasi identitas Anda dan memperbarui kata sandi:</p>
                  
                  <div style="text-align: center; margin: 32px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                      <span style="font-size: 38px; font-weight: bold; letter-spacing: 8px; color: #330F19; font-family: monospace;">${otpSpaced}</span>
                  </div>
                  
                  <p class="text-muted">* Kode OTP ini bersifat rahasia dan berlaku dalam waktu terbatas.</p>
                  <p class="text-muted">* Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini dengan aman.</p>
                  
                  <div style="margin-top: 40px; border-top: 1px dashed #e2e8f0; paddingTop: 16px; text-align: center;">
                      <p style="font-size: 11px; color: #94a3b8; margin: 0;">Email ini dikirim secara otomatis oleh Sistem Manajemen Internal DVARA Ops.</p>
                  </div>
              </div>
          </div>
      </body>
      </html>`;
      
      try {
        MailApp.sendEmail({ to: data.email, subject: 'DVARA Operations - OTP Reset Password', htmlBody: htmlMessage });
        return { status: 'success', message: 'OTP telah dikirim ke email Anda.' };
      } catch (error) {
        return { status: 'error', message: 'Gagal mengirim email: ' + error.toString() };
      }
    }
  }
  return { status: 'error', message: 'Email tidak ditemukan.' };
}

function verifyOtp(data) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Users");
  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData.shift();
  const emailIndex = headers.indexOf('Email');
  const otpIndex = headers.indexOf('OTP');
  for (const row of sheetData) {
    if (row[emailIndex] === data.email && row[otpIndex] == data.otp) {
      return { status: 'success', message: 'OTP terverifikasi.' };
    }
  }
  return { status: 'error', message: 'OTP salah.' };
}

function resetPassword(data) {
  const ss = getDB();
  const sheet = ss.getSheetByName("Users");
  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData.shift();
  const emailIndex = headers.indexOf('Email');
  const passwordIndex = headers.indexOf('Password');
  const otpIndex = headers.indexOf('OTP');
  for (let i = 0; i < sheetData.length; i++) {
    if (sheetData[i][emailIndex] === data.email) {
      sheet.getRange(i + 2, passwordIndex + 1).setValue(data.newPassword);
      sheet.getRange(i + 2, otpIndex + 1).setValue(''); 
      return { status: 'success', message: 'Password berhasil diperbarui.' };
    }
  }
  return { status: 'error', message: 'Terjadi kesalahan.' };
}

function updateProfileData(data) {
  try {
    const ss = getDB();
    const sheet = ss.getSheetByName("Users");
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];

    const userIdx = headers.indexOf('Username');
    const nameIdx = headers.indexOf('FullName');
    const roleIdx = headers.indexOf('Role');
    let avatarIdx = headers.indexOf('Avatar');

    if (avatarIdx === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue('Avatar');
        avatarIdx = sheet.getLastColumn() - 1;
    }

    for (let i = 1; i < rows.length; i++) {
        if (rows[i][userIdx] === data.username) {
            sheet.getRange(i + 1, nameIdx + 1).setValue(data.fullName);
            sheet.getRange(i + 1, roleIdx + 1).setValue(data.role);

            let avatarUrl = rows[i][avatarIdx];
            if (data.avatarBase64) {
                if (avatarUrl && avatarUrl.includes('id=')) {
                  try {
                    const oldFileId = avatarUrl.split('id=')[1].split('&')[0];
                    DriveApp.getFileById(oldFileId).setTrashed(true);
                  } catch (e) {
                    Logger.log("Foto lama tidak ditemukan atau sudah dihapus.");
                  }
                }

                const profileFolderId = "1V13KpXbM6fp4AHOq9M0ypy6hKhW380uF";
                const folder = DriveApp.getFolderById(profileFolderId);
                const fileName = `${data.fullName}_Crew_DVARA.jpeg`;
                const blob = Utilities.newBlob(Utilities.base64Decode(data.avatarBase64), 'image/jpeg', fileName);
                const file = folder.createFile(blob);
                avatarUrl = "https://drive.google.com/uc?id=" + file.getId() + "&sz=w400";
                sheet.getRange(i + 1, avatarIdx + 1).setValue(avatarUrl);
            }

            return { status: 'success', message: 'Profile berhasil diupdate!', avatar: avatarUrl, fullName: data.fullName, role: data.role };
        }
    }
    return { status: 'error', message: 'User tidak ditemukan.' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}