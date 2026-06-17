function getDashboardData() {
  const ss = getDB();
  
  // 1. Total Crew & Role Distribution
  let crewSheet = ss.getSheetByName("DataCrew");
  let totalCrew = 0;
  let roleStats = {};
  if (crewSheet) {
    const cData = crewSheet.getDataRange().getValues();
    if (cData.length > 1) {
      totalCrew = cData.length - 1;
      const headers = cData[0];
      const mainRoleIdx = headers.indexOf('MainRole');
      for (let i = 1; i < cData.length; i++) {
        let role = cData[i][mainRoleIdx];
        if (!role || role === '-' || role === 'Belum Ditentukan') role = 'Unassigned';
        roleStats[role] = (roleStats[role] || 0) + 1;
      }
    }
  }

  // 2. Event Terlaksana (Unique Events)
  let historySheet = ss.getSheetByName("HistoryEvent");
  let totalEvents = 0;
  if (historySheet) {
    const hData = historySheet.getDataRange().getValues();
    if (hData.length > 1) {
      let uniqueEvents = new Set();
      for (let i = 1; i < hData.length; i++) {
         uniqueEvents.add(hData[i][0].toString());
      }
      totalEvents = uniqueEvents.size;
    }
  }

  // 3. Operational Alerts (Inventory)
  let invSheet = ss.getSheetByName("InventoryData");
  let alerts = { lowStock: [], maintenance: [] };
  let actionRequiredCount = 0;
  if (invSheet) {
    const iData = invSheet.getDataRange().getValues();
    if (iData.length > 1) {
      const headers = iData[0];
      const idIdx = headers.indexOf('ID');
      const nameIdx = headers.indexOf('NamaBarang');
      const qtyIdx = headers.indexOf('Jumlah');
      let minIdx = headers.indexOf('MinStok');
      const condIdx = headers.indexOf('Kondisi');
      
      for (let i = 1; i < iData.length; i++) {
         let qty = parseInt(iData[i][qtyIdx]) || 0;
         let min = minIdx !== -1 ? (parseInt(iData[i][minIdx]) || 0) : 0;
         let cond = iData[i][condIdx];
         let item = { id: iData[i][idIdx], name: iData[i][nameIdx], qty: qty, min: min, cond: cond };
         let isAlert = false;
         if (qty <= min) { alerts.lowStock.push(item); isAlert = true; }
         if (cond && cond !== 'Baik') { alerts.maintenance.push(item); isAlert = true; }
         if (isAlert) actionRequiredCount++;
      }
    }
  }

  // 4. Ops Notes
  let opsNote = PropertiesService.getScriptProperties().getProperty('OPS_NOTE') || '';

  return {
    status: 'success', // Kita tambahkan status untuk konsistensi API
    data: {
      totalCrew: totalCrew,
      roleStats: roleStats,
      totalEvents: totalEvents,
      actionRequiredCount: actionRequiredCount,
      alerts: alerts,
      opsNote: opsNote
    }
  };
}

// Disesuaikan agar menerima 'data' object
function saveOpsNote(data) {
   PropertiesService.getScriptProperties().setProperty('OPS_NOTE', data.noteText);
   return { status: 'success', message: 'Note tersimpan!' };
}