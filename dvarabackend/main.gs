// ===================================================
// GLOBAL CONFIGURATION
// ===================================================
const CONFIG = {
  SPREADSHEET_ID: "1QbiyL7DtNIAF7qHkRCfIkSvcqNzrsG0HycQxUtj5N4Y",
  FOLDER_PROFILE_ID: "1UJJ7_vfRog9f5XecetQieXasrKgH68az",
  FOLDER_CREW_ID: "10_ZX2QnpcGHVPTr3YsiFOFFsfW6L8UjL",
  FOLDER_INVENTORY_ID: "1buKRMn2zPfRgqcCe9MYlOTsToR3VNQX",
  FOLDER_LOADING_DEST: "1JFLarhzY_2Egu5PLe7Ff954E_gQmPGHi",
  TEMPLATE_LOADING_ID: "10uhYX18MAmkMv7li1mh8m0hb-ZWyy6A8"
};

function getDB() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

// ==========================================
// API ROUTER (Pintu Masuk Utama)
// ==========================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  try {
    let requestData = {};
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }
    const action = requestData.action;
    let result = { status: 'error', message: 'Action tidak dikenali' };

    switch (action) {
      case 'getPrivateImageBase64': result = { status: 'success', data: getPrivateImageBase64(requestData.fileId) }; break;
      
      // --- Auth ---
      case 'login': result = login(requestData); break;
      case 'signup': result = signup(requestData); break;
      case 'forgotPassword': result = forgotPassword(requestData); break;
      case 'verifyOtp': result = verifyOtp(requestData); break;
      case 'resetPassword': result = resetPassword(requestData); break;
      case 'updateProfileData': result = updateProfileData(requestData); break;

      // --- Dashboard ---
      case 'getDashboardData': result = getDashboardData(); break;
      case 'saveOpsNote': result = saveOpsNote(requestData); break;

      // --- Crew ---
      case 'getCrewList': result = getCrewList(requestData); break;
      case 'saveCrewData': result = saveCrewData(requestData); break;
      case 'deleteCrewData': result = deleteCrewData(requestData); break;
      case 'editCrewData': result = editCrewData(requestData); break;
      case 'getMasterRoles': result = getMasterRoles(requestData); break;

      // --- Inventory ---
      case 'getInventoryList': result = getInventoryList(requestData); break;
      case 'saveInventoryItem': result = saveInventoryItem(requestData); break;
      case 'updateInventoryStock': result = updateInventoryStock(requestData); break;
      case 'deleteInventoryItem': result = deleteInventoryItem(requestData); break;

      // --- Loading ---
      case 'getLoadingFormList': result = getLoadingFormList(requestData); break;
      case 'generatePublicLoadingPDF': result = generatePublicLoadingPDF(requestData); break;
      case 'deleteLoadingForm': result = deleteLoadingForm(requestData); break;
      case 'sendLoadingEmailCopy': result = sendLoadingEmailCopy(requestData); break;
      case 'fetchLoadingByAccessCode': result = fetchLoadingByAccessCode(requestData); break;
      case 'deleteLoadingByCode': result = deleteLoadingByCode(requestData); break;

      // --- Absensi ---
      case 'getEventsForAttendance': result = getEventsForAttendance(requestData); break;
      case 'submitAttendance': result = submitAttendance(requestData); break;

      // --- History Event ---
      case 'getMasterLocations': result = getMasterLocations(requestData); break;
      case 'extractCoordsFromUrl': result = extractCoordsFromUrl(requestData); break;
      case 'saveHistoryEvent': result = saveHistoryEvent(requestData); break;
      case 'getCrewHistory': result = getCrewHistory(requestData); break;
      case 'getGroupedHistoryLogs': result = getGroupedHistoryLogs(requestData); break;
      case 'deleteEventBatch': result = deleteEventBatch(requestData); break;
      case 'updateEventBatch': result = updateEventBatch(requestData); break;
      case 'getPendingOvertime': result = getPendingOvertime(requestData); break;
      case 'updateOvertimeStatus': result = updateOvertimeStatus(requestData); break;

      default: result = { status: 'error', message: 'Action tidak dikenali: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', message: 'Backend Error: ' + error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

function handleRequest(e) {
  const action = e.parameter.action;
  let result = { status: 'error', message: 'Action tidak ditemukan' };

  try {
    // Parse postData sekali saja di awal khusus untuk request yang bawa body
    let requestData = {};
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }

    // TERMINAL ROUTING
    switch (action) {
      // Tambahkan di dalam try catch main.gs:
      case 'getPrivateImageBase64': result = { status: 'success', data: getPrivateImageBase64(requestData.fileId) }; break;
      
      // --- Auth ---
      case 'login': result = login(requestData); break;
      case 'signup': result = signup(requestData); break;
      case 'forgotPassword': result = forgotPassword(requestData); break;
      case 'verifyOtp': result = verifyOtp(requestData); break;
      case 'resetPassword': result = resetPassword(requestData); break;
      case 'updateProfileData': result = updateProfileData(requestData); break;

      // --- Dashboard ---
      case 'getDashboardData': result = getDashboardData(); break;
      case 'saveOpsNote': result = saveOpsNote(requestData); break;

      // --- Crew ---
      case 'getCrewList': result = getCrewList(); break;
      case 'saveCrewData': result = saveCrewData(requestData); break;
      case 'deleteCrewData': result = deleteCrewData(requestData); break;
      case 'editCrewData': result = editCrewData(requestData); break;
      case 'getMasterRoles': result = getMasterRoles(); break;

      // --- Inventory ---
      case 'getInventoryList': result = getInventoryList(); break;
      case 'saveInventoryItem': result = saveInventoryItem(requestData); break;
      case 'updateInventoryStock': result = updateInventoryStock(requestData); break;
      case 'deleteInventoryItem': result = deleteInventoryItem(requestData); break;

      // --- Loading ---
      case 'getLoadingFormList': result = getLoadingFormList(); break;
      case 'generatePublicLoadingPDF': result = generatePublicLoadingPDF(requestData); break;
      case 'deleteLoadingForm': result = deleteLoadingForm(requestData); break;
      case 'sendLoadingEmailCopy': result = sendLoadingEmailCopy(requestData); break;
      case 'fetchLoadingByAccessCode': result = fetchLoadingByAccessCode(requestData); break;
      case 'deleteLoadingByCode': result = deleteLoadingByCode(requestData); break;

      // --- Absensi ---
      case 'getEventsForAttendance': result = getEventsForAttendance(); break;
      case 'submitAttendance': result = submitAttendance(requestData); break;

      // --- History Event ---
      case 'getMasterLocations': result = getMasterLocations(); break;
      case 'extractCoordsFromUrl': result = extractCoordsFromUrl(requestData); break;
      case 'saveHistoryEvent': result = saveHistoryEvent(requestData); break;
      case 'getCrewHistory': result = getCrewHistory(requestData); break;
      case 'getGroupedHistoryLogs': result = getGroupedHistoryLogs(); break;
      case 'deleteEventBatch': result = deleteEventBatch(requestData); break;
      case 'updateEventBatch': result = updateEventBatch(requestData); break;
      case 'getPendingOvertime': result = getPendingOvertime(); break;
      case 'updateOvertimeStatus': result = updateOvertimeStatus(requestData); break;

      default: result = { status: 'error', message: 'Invalid Action' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}