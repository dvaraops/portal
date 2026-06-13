const { useState, useEffect } = React;

const formatTimeHTML = (timeStr) => {
    if (!timeStr) return '';
    let t = timeStr.toString().trim();
    if (t.toLowerCase().match(/[ap]m/)) {
        let [time, modifier] = t.split(' ');
        if(!modifier) modifier = t.toLowerCase().includes('pm') ? 'pm' : 'am';
        let [hours, minutes] = time.split(':');
        hours = hours || '00'; minutes = minutes || '00';
        if (hours === '12') hours = '00';
        if (modifier.toLowerCase().includes('p')) hours = (parseInt(hours, 10) + 12).toString();
        return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
    }
    const parts = t.split(':');
    if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    return t;
};

const formatDateHTML = (dateStr) => {
    if (!dateStr) return '';
    try { let d = new Date(dateStr); if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]; } catch(e) {}
    return dateStr;
};

const HistoryEventForm = ({ crewList, fetchCrewData }) => {
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState('');
    
    const [masterLocations, setMasterLocations] = useState([]);
    const [selectedLoc, setSelectedLoc] = useState('new');
    const [locationName, setLocationName] = useState('');
    const [mapsLink, setMapsLink] = useState('');
    const [lat, setLat] = useState('');
    const [long, setLong] = useState('');

    const [sessions, setSessions] = useState([
        { id: Date.now(), sesiName: '', shiftDate: '', callTime: '', targetEndTime: '', crews: [{ fullName: '', role: '' }] }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [logs, setLogs] = useState([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    
    const [showEditModal, setShowEditModal] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editTimestamp, setEditTimestamp] = useState('');
    const [editEventName, setEditEventName] = useState('');
    const [editEventDate, setEditEventDate] = useState('');
    const [editLat, setEditLat] = useState('');
    const [editLong, setEditLong] = useState('');
    const [editSessions, setEditSessions] = useState([]);

    const [roleOptions, setRoleOptions] = useState([]);

    useEffect(() => { fetchLogs(); fetchMasterRoles(); loadLocations(); }, []);

    const fetchMasterRoles = async () => {
        try {
            const res = await dvaraFetch('getMasterRoles', {});
            if (res && res.status === 'success' && res.data?.length > 0) {
                setRoleOptions(res.data);
            } else {
                setRoleOptions(["SPV Operations", "Return Area", "Tap In"]); 
            }
        } catch(e) {
            setRoleOptions(["SPV Operations", "Return Area", "Tap In"]);
        }
    };

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const res = await dvaraFetch('getGroupedHistoryLogs', {});
            if (res && res.status === 'success') {
                setLogs(res.data || []);
            } else {
                setLogs([]);
            }
        } catch(e) {
            setLogs([]);
        }
        setIsLoadingLogs(false);
    };

    const loadLocations = async () => { 
        try {
            const res = await dvaraFetch('getMasterLocations', {});
            if (res && res.status === 'success' && res.data?.length > 0) {
                const locs = res.data;
                setMasterLocations(locs);
                const latestLoc = locs[locs.length - 1];
                setSelectedLoc(latestLoc.name);
                setLocationName(latestLoc.name);
                setMapsLink(latestLoc.link);
                setLat(latestLoc.lat);
                setLong(latestLoc.long);
            } else {
                setMasterLocations([]);
                setSelectedLoc('new');
            }
        } catch(e) {
            setMasterLocations([]);
            setSelectedLoc('new');
        }
    };

    const handleProcessLink = async () => {
        if(!mapsLink) return;
        Swal.fire({ title: 'Extracting GPS...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res = await dvaraFetch('extractCoordsFromUrl', { url: mapsLink });
            Swal.close();
            if(res && res.status === 'success') {
                setLat(res.lat); setLong(res.long);
                Swal.fire({ toast: true, icon: 'success', title: 'Koordinat Terdeteksi!', position: 'top-end', showConfirmButton: false, timer: 2000 });
            } else {
                Swal.fire('Gagal', res?.message || 'Gagal ekstrak koordinat', 'error');
            }
        } catch(err) {
            Swal.close();
            Swal.fire('Gagal', err.message, 'error');
        }
    };

    const handleLocSelect = (val) => {
        setSelectedLoc(val);
        if(val === 'new') { setLocationName(''); setMapsLink(''); setLat(''); setLong(''); } 
        else {
            const loc = masterLocations.find(l => l.name === val);
            if(loc) { setLocationName(loc.name); setMapsLink(loc.link); setLat(loc.lat); setLong(loc.long); }
        }
    };

    const addSession = () => setSessions([...sessions, { id: Date.now(), sesiName: '', shiftDate: '', callTime: '', targetEndTime: '', crews: [{ fullName: '', role: '' }] }]);
    const removeSession = (id) => setSessions(sessions.filter(s => s.id !== id));
    const updateSession = (idx, field, val) => { const newS = [...sessions]; newS[idx][field] = val; setSessions(newS); };
    const addCrewToSession = (sIdx) => { const newS = [...sessions]; newS[sIdx].crews.push({ fullName: '', role: '' }); setSessions(newS); };
    const removeCrewFromSession = (sIdx, cIdx) => { const newS = [...sessions]; newS[sIdx].crews = newS[sIdx].crews.filter((_, i) => i !== cIdx); setSessions(newS); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if(!lat || !long) { Swal.fire('Oops!', 'Koordinat Latitude dan Longitude harus diisi!', 'warning'); return; }
        setIsSubmitting(true);
        const payload = {
            eventName, eventDate, locationName, mapsLink, lat, long,
            sessions: sessions.map(s => {
                let validCrews = s.crews.filter(c => c.fullName !== '' || c.role !== '');
                if (validCrews.length === 0) validCrews = [{ fullName: '', role: '' }];
                return { sesiName: s.sesiName, shiftDate: s.shiftDate, callTime: s.callTime, targetEndTime: s.targetEndTime, crews: validCrews };
            })
        };

        try {
            const res = await dvaraFetch('saveHistoryEvent', payload);
            setIsSubmitting(false);
            if (res && res.status === 'success') {
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: res.message, timer: 1500, showConfirmButton: false });
                
                setEventName(''); setEventDate(''); 
                setSessions([{ id: Date.now(), sesiName: '', shiftDate: '', callTime: '', targetEndTime: '', crews: [{ fullName: '', role: '' }] }]);
                
                if (fetchCrewData) fetchCrewData(); 
                fetchLogs(); 
                loadLocations(); 
            } else {
                Swal.fire('Gagal', res?.message || 'Error simpan event', 'error');
            }
        } catch(err) {
            setIsSubmitting(false);
            Swal.fire('Error', err.message, 'error');
        }
    };

    const handleDeleteEvent = (timestamp, eventNameStr) => {
        Swal.fire({
            title: 'Hapus Event?',
            text: `Seluruh data & shift pada event "${eventNameStr}" akan dihapus.`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#cbd5e1', confirmButtonText: 'Ya, Hapus!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
                try {
                    const res = await dvaraFetch('deleteEventBatch', { timestampStr: timestamp });
                    if (res && res.status === 'success') { 
                        Swal.fire('Terhapus!', res.message, 'success'); 
                        fetchLogs(); 
                        if (fetchCrewData) fetchCrewData(); 
                    } else {
                        Swal.fire('Gagal', res?.message || 'Error hapus event', 'error');
                    }
                } catch(err) {
                    Swal.fire('Error', err.message, 'error');
                }
            }
        });
    };

    const openEditModal = (logGroup) => {
        setEditTimestamp(logGroup.timestamp);
        setEditEventName(logGroup.eventName);
        setEditEventDate(formatDateHTML(logGroup.eventDate));
        setEditLat(logGroup.lat);
        setEditLong(logGroup.long);

        const loadedShifts = logGroup.shifts.map((s, idx) => ({
            id: Date.now() + idx,
            sesiName: s.sesiName,
            shiftDate: formatDateHTML(s.shiftDate), 
            callTime: formatTimeHTML(s.callTime),   
            targetEndTime: formatTimeHTML(s.targetEndTime), 
            crews: s.crews.length > 0 ? [...s.crews] : [{ fullName: '', role: '' }]
        }));
        setEditSessions(loadedShifts);
        setShowEditModal(true);
    };

    const addEditSession = () => setEditSessions([...editSessions, { id: Date.now(), sesiName: '', shiftDate: '', callTime: '', targetEndTime: '', crews: [{ fullName: '', role: '' }] }]);
    const removeEditSession = (id) => setEditSessions(editSessions.filter(s => s.id !== id));
    const updateEditSession = (idx, field, val) => { const newS = [...editSessions]; newS[idx][field] = val; setEditSessions(newS); };
    const addCrewToEditSession = (sIdx) => { const newS = [...editSessions]; newS[sIdx].crews.push({ fullName: '', role: '' }); setEditSessions(newS); };
    const removeCrewFromEditSession = (sIdx, cIdx) => { const newS = [...editSessions]; newS[sIdx].crews = newS[sIdx].crews.filter((_, i) => i !== cIdx); setEditSessions(newS); };
    const handleEditChange = (sIdx, cIdx, field, val) => { const newS = [...editSessions]; newS[sIdx].crews[cIdx][field] = val; setEditSessions(newS); };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        const payload = { 
            oldTimestamp: editTimestamp,
            newEventName: editEventName, 
            newEventDate: editEventDate, 
            lat: editLat, long: editLong,
            sessions: editSessions.map(s => {
                let validCrews = s.crews.filter(c => c.fullName !== '' || c.role !== '');
                if (validCrews.length === 0) validCrews = [{ fullName: '', role: '' }];
                return { sesiName: s.sesiName, shiftDate: s.shiftDate, callTime: s.callTime, targetEndTime: s.targetEndTime, crews: validCrews };
            })
        };

        try {
            const res = await dvaraFetch('updateEventBatch', payload);
            setIsUpdating(false);
            if (res && res.status === 'success') { 
                Swal.fire('Terupdate!', res.message, 'success'); 
                setShowEditModal(false); 
                fetchLogs(); 
                if (fetchCrewData) fetchCrewData(); 
            } else {
                Swal.fire('Gagal', res?.message || 'Error update event', 'error');
            }
        } catch(err) {
            setIsUpdating(false);
            Swal.fire('Error', err.message, 'error');
        }
    };

    return (
        <div className="animate-[fadeIn_0.3s_ease] font-sans pb-10">

            {/* --- 1. FORM CREATE --- */}
            <form onSubmit={handleSubmit} className="mb-10">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                        <div>
                            <label className="block text-[13px] font-bold text-slate-800 mb-2">Nama Event Utama</label>
                            <input type="text" required value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Ex: Wedding Bama & Liyana" className="w-full p-3 rounded-xl border border-slate-300 focus:ring-1 focus:ring-maroon-primary outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-[13px] font-bold text-slate-800 mb-2">Tanggal Event Utama</label>
                            <input type="date" required value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 font-sans focus:ring-1 focus:ring-maroon-primary outline-none transition-all" />
                        </div>
                    </div>
                    
                    <div className="border-t border-dashed border-slate-300 pt-5">
                        <label className="block mb-3 font-bold text-slate-800"><i className="fas fa-map-marked-alt text-blue-500 mr-2"></i> Pengaturan Lokasi Venue</label>
                        <select value={selectedLoc} onChange={e => handleLocSelect(e.target.value)} className="w-full p-3 mb-4 rounded-xl border border-slate-300 font-sans bg-slate-50 cursor-pointer outline-none focus:ring-1 focus:ring-maroon-primary appearance-none pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjIwIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWxpbmUgcG9pbnRzPSI2IDkgMTIgMTUgMTggOSIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1em_1em]">
                            <option value="new">+ Tambah Lokasi Baru / Paste Link Maps</option>
                            {masterLocations.map((l, i) => <option key={i} value={l.name}>{l.name}</option>)}
                        </select>
                        
                        {selectedLoc === 'new' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1.5">Nama Tempat</label>
                                    <input type="text" required value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Ex: Grand Ballroom Hotel Mulia" className="w-full p-3 rounded-xl border border-slate-300 focus:ring-1 focus:ring-maroon-primary outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1.5">Link Google Maps</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={mapsLink} onChange={e => setMapsLink(e.target.value)} placeholder="Paste link di sini..." className="flex-1 p-3 rounded-xl border border-slate-300 focus:ring-1 focus:ring-maroon-primary outline-none transition-all" />
                                        <button type="button" onClick={handleProcessLink} className="bg-blue-500 hover:bg-blue-600 px-4 rounded-xl text-white shadow-sm shadow-blue-500/30 transition-all active:scale-95" title="Extract Koordinat"><i className="fas fa-sync"></i></button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100 flex-wrap md:flex-nowrap">
                            <div className="flex-1 w-full">
                                <label className="text-xs text-orange-900 mb-1.5 block font-bold">Latitude</label>
                                <input type="text" required value={lat} onChange={e => setLat(e.target.value)} placeholder="-6.123456" className="w-full px-3 py-2.5 rounded-lg border border-orange-300 focus:border-orange-500 outline-none transition-all bg-white" />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-xs text-orange-900 mb-1.5 block font-bold">Longitude</label>
                                <input type="text" required value={long} onChange={e => setLong(e.target.value)} placeholder="106.123456" className="w-full px-3 py-2.5 rounded-lg border border-orange-300 focus:border-orange-500 outline-none transition-all bg-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {sessions.map((session, sIdx) => (
                    <div key={session.id} className="bg-white rounded-2xl border border-slate-200 mb-4 overflow-hidden shadow-sm">
                        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-800"><i className="fas fa-clock text-amber-500 mr-2"></i>Shift #{sIdx + 1}</span>
                            {sessions.length > 1 && (
                                <button type="button" onClick={() => removeSession(session.id)} className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm">
                                    <i className="fas fa-trash-alt"></i> Hapus Shift
                                </button>
                            )}
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                <div><label className="block text-[13px] font-bold mb-1.5">Kategori Shift</label><input type="text" required value={session.sesiName} onChange={e => updateSession(sIdx, 'sesiName', e.target.value)} placeholder="Ex: Loading In" className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-maroon-primary outline-none transition-all" /></div>
                                <div><label className="block text-[13px] font-bold mb-1.5">Tanggal Shift</label><input type="date" required value={session.shiftDate} onChange={e => updateSession(sIdx, 'shiftDate', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-sans focus:ring-1 focus:ring-maroon-primary outline-none transition-all" /></div>
                                <div><label className="block text-[13px] font-bold mb-1.5">Call Time</label><input type="time" required value={session.callTime} onChange={e => updateSession(sIdx, 'callTime', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-sans focus:ring-1 focus:ring-maroon-primary outline-none transition-all" /></div>
                                <div><label className="block text-[13px] font-bold mb-1.5">Target Selesai</label><input type="time" required value={session.targetEndTime} onChange={e => updateSession(sIdx, 'targetEndTime', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-sans focus:ring-1 focus:ring-maroon-primary outline-none transition-all" /></div>
                            </div>
                            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                                <label className="block text-[13px] font-bold text-slate-800 mb-3">Crew Yang Bertugas (Opsional)</label>
                                {session.crews.map((c, cIdx) => (
                                    <div key={cIdx} className="flex gap-2 mb-3 items-center flex-wrap sm:flex-nowrap">
                                        <select className="flex-[2] w-full px-3 py-2.5 rounded-xl border border-slate-300 font-sans bg-white cursor-pointer outline-none focus:ring-1 focus:ring-maroon-primary" value={c.fullName} onChange={e => { const newS = [...sessions]; newS[sIdx].crews[cIdx].fullName = e.target.value; setSessions(newS); }}>
                                            <option value="" disabled>Pilih Nama Crew</option>
                                            {crewList && crewList.map((cl, i) => <option key={i} value={cl.FullName}>{cl.FullName}</option>)}
                                        </select>
                                        <select className="flex-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 font-sans bg-white cursor-pointer outline-none focus:ring-1 focus:ring-maroon-primary" value={c.role} onChange={e => { const newS = [...sessions]; newS[sIdx].crews[cIdx].role = e.target.value; setSessions(newS); }}>
                                            <option value="" disabled>Pilih Role</option>
                                            {roleOptions.map((r, i) => <option key={i} value={r}>{r}</option>)}
                                        </select>
                                        {session.crews.length > 1 && (
                                            <button type="button" onClick={() => removeCrewFromSession(sIdx, cIdx)} className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-2.5 rounded-xl transition-colors shadow-sm shrink-0">
                                                <i className="fas fa-times"></i>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={() => addCrewToSession(sIdx)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs px-4 py-2 mt-2 font-bold rounded-lg transition-colors shadow-sm">
                                    + Tambah Crew
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                
                <div className="flex flex-col gap-4 mt-2">
                    <button type="button" onClick={addSession} className="bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                        <i className="fas fa-plus"></i> Tambah Shift Lain
                    </button>
                    <button type="submit" disabled={isSubmitting} className="bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-xl font-bold text-base transition-all shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50">
                        {isSubmitting ? 'MENYIMPAN EVENT...' : 'SIMPAN EVENT & SHIFT'}
                    </button>
                </div>
            </form>

            {/* --- 2. TABEL ARSIP --- */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="mb-4 text-sm font-bold text-slate-500">Arsip Event (50 Terbaru)</div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-200">
                                <th className="p-4 text-slate-600 text-[13px] font-bold">NAMA EVENT & JADWAL SHIFT</th>
                                <th className="p-4 text-slate-600 text-[13px] font-bold">TANGGAL UTAMA</th>
                                <th className="p-4 text-slate-600 text-[13px] font-bold text-center">TOTAL CREW</th>
                                <th className="p-4 text-slate-600 text-[13px] font-bold text-center">AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingLogs ? (
                                <tr>
                                    <td colSpan="4" className="p-10 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="modern-spinner w-8 h-8 border-2 border-t-maroon-primary"></div>
                                            <div className="text-sm font-semibold">Memuat arsip...</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-10 text-center text-slate-400">
                                        <i className="far fa-calendar-times text-5xl mb-4 opacity-30"></i>
                                        <div className="text-sm font-semibold">Belum ada event.</div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((group, idx) => (
                                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 text-sm text-slate-800 font-bold align-top">
                                            {group.eventName}
                                            <div className="mt-3 flex flex-col gap-2">
                                                {group.shifts.map((s, i) => (
                                                    <div key={i} className="inline-flex items-center gap-2 flex-wrap text-xs text-slate-500 font-medium">
                                                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-bold">Shift: {s.sesiName}</span>
                                                        <span className="flex items-center gap-1.5"><i className="far fa-calendar-alt"></i> {s.shiftDate}</span>
                                                        <span className="flex items-center gap-1.5"><i className="far fa-clock"></i> {s.callTime} - {s.targetEndTime}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 align-top">{group.eventDate}</td>
                                        <td className="p-4 text-center align-top">
                                            <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-[13px] font-bold shadow-sm">{group.totalCrews}</span>
                                        </td>
                                        <td className="p-4 text-center whitespace-nowrap align-top">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => openEditModal(group)} className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5">
                                                    <i className="fas fa-edit"></i> Edit
                                                </button>
                                                <button onClick={() => handleDeleteEvent(group.timestamp, group.eventName)} className="px-3 py-2 bg-red-50 text-red-500 hover:bg-red-100 font-bold rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5">
                                                    <i className="fas fa-trash-alt"></i> Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- 3. MODAL EDIT (MULTI-SHIFT) --- */}
            {showEditModal && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-[settingsSlideIn_0.3s_ease-out]">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0 flex justify-between items-center rounded-t-2xl">
                            <h3 className="m-0 text-slate-800 font-bold font-heading text-lg">Edit Keseluruhan Event</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-red-500 transition-colors text-xl">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form onSubmit={handleEditSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-800 mb-2">Nama Event Utama</label>
                                        <input type="text" required value={editEventName} onChange={(e) => setEditEventName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-800 mb-2">Tanggal Event Utama</label>
                                        <input type="date" required value={editEventDate} onChange={(e) => setEditEventDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-sans focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                                    </div>
                                </div>

                                {editSessions.map((session, sIdx) => (
                                    <div key={session.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-5 shadow-sm">
                                        <div className="flex justify-between items-center mb-5">
                                            <span className="font-bold text-slate-800 text-[15px]">Shift #{sIdx + 1}</span>
                                            {editSessions.length > 1 && (
                                                <button type="button" onClick={() => removeEditSession(session.id)} className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5">
                                                    <i className="fas fa-trash-alt"></i> Hapus Shift
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                                            <div><label className="block text-xs font-bold mb-1.5">Kategori Shift</label><input type="text" required value={session.sesiName} onChange={e => updateEditSession(sIdx, 'sesiName', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                            <div><label className="block text-xs font-bold mb-1.5">Tanggal</label><input type="date" required value={session.shiftDate} onChange={e => updateEditSession(sIdx, 'shiftDate', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                            <div><label className="block text-xs font-bold mb-1.5">Call Time</label><input type="time" required value={session.callTime} onChange={e => updateEditSession(sIdx, 'callTime', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                            <div><label className="block text-xs font-bold mb-1.5">Target Selesai</label><input type="time" required value={session.targetEndTime} onChange={e => updateEditSession(sIdx, 'targetEndTime', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500" /></div>
                                        </div>
                                        <div className="p-4 border border-slate-300 rounded-xl bg-white shadow-sm">
                                            <label className="block text-xs font-bold text-slate-800 mb-3">Crew (Opsional)</label>
                                            {session.crews.map((crew, idx) => (
                                                <div key={idx} className="flex gap-2 mb-3 items-center flex-wrap sm:flex-nowrap">
                                                    <select className="flex-[2] w-full px-3 py-2 rounded-lg border border-slate-300 font-sans outline-none focus:ring-1 focus:ring-blue-500" value={crew.fullName} onChange={(e) => handleEditChange(sIdx, idx, 'fullName', e.target.value)}>
                                                        <option value="" disabled>Pilih Nama Crew</option>
                                                        {crewList && crewList.map((c, i) => <option key={i} value={c.FullName}>{c.FullName}</option>)}
                                                    </select>
                                                    <select className="flex-1 w-full px-3 py-2 rounded-lg border border-slate-300 font-sans outline-none focus:ring-1 focus:ring-blue-500" value={crew.role} onChange={(e) => handleEditChange(sIdx, idx, 'role', e.target.value)}>
                                                        <option value="" disabled>Pilih Role</option>
                                                        {roleOptions.map((r, i) => <option key={i} value={r}>{r}</option>)}
                                                    </select>
                                                    {session.crews.length > 1 && (
                                                        <button type="button" onClick={() => removeCrewFromEditSession(sIdx, idx)} className="bg-red-50 hover:bg-red-100 text-red-500 px-3 py-2 rounded-lg transition-colors shrink-0">
                                                            <i className="fas fa-times"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => addCrewToEditSession(sIdx)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-2 mt-1 font-bold rounded-lg transition-colors shadow-sm">
                                                + Tambah Crew
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button type="button" onClick={addEditSession} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mb-6">
                                    <i className="fas fa-plus"></i> Tambah Shift Lain
                                </button>

                                <div className="flex gap-3 justify-end pt-6 border-t border-slate-200 mt-2">
                                    <button type="button" onClick={() => setShowEditModal(false)} disabled={isUpdating} className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-colors text-sm">
                                        Batal
                                    </button>
                                    <button type="submit" disabled={isUpdating} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 text-sm">
                                        {isUpdating ? 'Updating...' : 'Update Full Event'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

};
