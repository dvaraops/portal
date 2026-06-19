const { useState, useEffect } = React;

const CrewForm = ({ crewList, isLoadingData, fetchCrewData, setPreviewImage, searchQuery, fabAction, clearFabAction }) => {
    const [crewHistoryInfo, setCrewHistoryInfo] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedCrew, setSelectedCrew] = useState(null);
    
    const [isSaving, setIsSaving] = useState(false);
    const [fileName, setFileName] = useState('');
    const [fileData, setFileData] = useState({ base64: '', mime: '' });
    
    useEffect(() => {
        if (fabAction === 'add') {
            setShowAddModal(true);
            if (clearFabAction) clearFabAction();
        } else if (fabAction === 'secondary') {
            openWABlastModal();
            if (clearFabAction) clearFabAction();
        }
    }, [fabAction]);
    
    const [showWABlastModal, setShowWABlastModal] = useState(false);
    const [selectedCrewsForWA, setSelectedCrewsForWA] = useState([]);
    const [eventListForWA, setEventListForWA] = useState([]);
    const [selectedEventForWA, setSelectedEventForWA] = useState('');

    const openWABlastModal = async () => {
        setShowWABlastModal(true);
        setSelectedEventForWA(''); 
        try {
            const res = await dvaraFetch('getGroupedHistoryLogs', {});
            if (res.status === 'success') {
                setEventListForWA(res.data);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleSelectCrew = (crew) => {
        const isSelected = selectedCrewsForWA.some(c => c.NoHP === crew.NoHP);
        if (isSelected) {
            setSelectedCrewsForWA(selectedCrewsForWA.filter(c => c.NoHP !== crew.NoHP));
        } else {
            setSelectedCrewsForWA([...selectedCrewsForWA, crew]);
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked && crewList.length > 0) {
            setSelectedCrewsForWA(crewList);
        } else {
            setSelectedCrewsForWA([]);
        }
    };

    const handleBlastWA = () => {
        if(selectedCrewsForWA.length === 0) return;
        if(!selectedEventForWA) {
            Swal.fire('Oops!', 'Pilih event terlebih dahulu dari dropdown!', 'warning');
            return;
        }

        let text = `ID Crew Event ${selectedEventForWA}\n\n`;
        selectedCrewsForWA.forEach((crew, index) => {
            text += `${index + 1}. ${crew.IDCrew || 'Belum ada ID'} - ${crew.FullName}\n`;
        });
        
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/62895630787342?text=${encodedText}`, '_blank');
        
        setSelectedCrewsForWA([]); 
        setSelectedEventForWA('');
        setShowWABlastModal(false); 
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64String = event.target.result.split(',')[1];
                setFileData({ base64: base64String, mime: file.type });
            };
            reader.readAsDataURL(file);
        } else {
            setFileName('');
            setFileData({ base64: '', mime: '' });
        }
    };

    const formatPhoneNumber = (rawHp) => {
        let cleaned = String(rawHp).replace(/\D/g, ''); 
        if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
        else if (!cleaned.startsWith('62')) cleaned = '62' + cleaned; 
        return cleaned;
    };

    const handleAddCrewSubmit = (e) => {
        e.preventDefault();
        if (!fileData.base64) { Swal.fire('Oops!', 'Pilih foto wajah dulu ya!', 'warning'); return; }
        setIsSaving(true);
        const formData = {
            fullName: e.target.fullName.value, shortName: e.target.shortName.value, noHp: formatPhoneNumber(e.target.noHp.value),
            bankName: e.target.bankName.value, bankRek: e.target.bankRek.value.replace(/\D/g, ''), rekName: e.target.rekName.value,
            fotoName: fileName, fotoBase64: fileData.base64, fotoMimeType: fileData.mime
        };
        dvaraFetch('saveCrewData', formData)
            .then(res => {
                setIsSaving(false);
                if(res.status === 'success') {
                    Swal.fire('Berhasil!', res.message, 'success'); setShowAddModal(false);
                    e.target.reset(); setFileName(''); setFileData({ base64: '', mime: '' }); fetchCrewData();
                } else Swal.fire('Gagal', res.message, 'error');
            })
            .catch(err => { setIsSaving(false); Swal.fire('Error', err.message || 'Gagal menyimpan data', 'error'); });
    };

    const handleEditCrewSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        const formData = {
            oldNoHp: selectedCrew.NoHP, fullName: e.target.fullName.value, shortName: e.target.shortName.value, newNoHp: formatPhoneNumber(e.target.noHp.value),
            bankName: e.target.bankName.value, bankRek: e.target.bankRek.value.replace(/\D/g, ''), rekName: e.target.rekName.value,
            mainRole: e.target.mainRole.value, subRole: e.target.subRole.value, fotoName: fileName, fotoBase64: fileData.base64, fotoMimeType: fileData.mime
        };
        dvaraFetch('editCrewData', formData)
            .then(res => {
                setIsSaving(false);
                if(res.status === 'success') {
                    Swal.fire('Tersimpan!', res.message, 'success'); setShowEditModal(false); setSelectedCrew(null);
                    setFileName(''); setFileData({ base64: '', mime: '' }); fetchCrewData();
                } else Swal.fire('Gagal', res.message, 'error');
            })
            .catch(err => { setIsSaving(false); Swal.fire('Error', err.message || 'Gagal mengubah data', 'error'); });
    };

    const handleDeleteAction = (noHp, isBlacklist) => {
        const title = isBlacklist ? "Blacklist Crew?" : "Hapus Data Crew?";
        const text = isBlacklist ? "Data akan dihapus total & HP ini diblokir permanen dari pendaftaran." : "Data & Foto crew ini akan dihapus dari database dan Drive.";
        const confirmBtn = isBlacklist ? '<i class="fas fa-ban"></i> Ya, Blacklist!' : '<i class="fas fa-trash-alt"></i> Ya, Hapus!';
        Swal.fire({
            title: title, text: text, icon: 'warning', showCancelButton: true, confirmButtonColor: isBlacklist ? '#0f172a' : '#ef4444', cancelButtonColor: '#cbd5e1', confirmButtonText: confirmBtn
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Memproses...', allowOutsideClick: false, showConfirmButton: false, willOpen: () => { Swal.showLoading(); }});
                dvaraFetch('deleteCrewData', { noHp, isBlacklist })
                    .then(res => {
                        if (res.status === 'success') { Swal.fire('Selesai!', res.message, 'success'); setShowViewModal(false); fetchCrewData(); } 
                        else Swal.fire('Gagal', res.message, 'error');
                    })
                    .catch(err => Swal.fire('Error', err.message || 'Gagal menghapus data', 'error'));
            }
        });
    };

    // Helper untuk Modal UI (Background Overlay)
    const modalStyle = { backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 };

    const displayedCrewList = crewList.filter(crew => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (crew.FullName && crew.FullName.toLowerCase().includes(q)) ||
            (crew.ShortName && crew.ShortName.toLowerCase().includes(q)) ||
            (crew.IDCrew && crew.IDCrew.toLowerCase().includes(q)) ||
            (crew.NoHP && String(crew.NoHP).toLowerCase().includes(q))
        );
    });

    return (
        <div className="w-full pb-10 font-sans">

            {/* Table Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider w-[12%]">ID CREW</th>
                                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider w-[25%]">PROFIL</th>
                                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider w-[15%]">PANGGILAN</th>
                                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider w-[18%]">MAIN ROLE</th>
                                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider w-[15%]">NO. HP</th>
                                <th className="p-4 text-xs font-bold text-slate-500 tracking-wider text-center w-[15%]">AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingData ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-10">
                                        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                                            <div className="modern-spinner w-8 h-8 border-2 border-slate-200 border-t-maroon-primary rounded-full animate-spin"></div>
                                            <div className="text-sm font-semibold">Memuat data crew...</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : displayedCrewList.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-16">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <i className="fas fa-users text-5xl mb-4 opacity-30"></i>
                                            <div className="text-sm font-semibold">Belum ada data crew.</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                displayedCrewList.map((crew, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md text-xs">{crew.IDCrew || '-'}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200 cursor-zoom-in bg-slate-50 flex items-center justify-center relative hover:opacity-90 transition-opacity">
                                                    <PrivateImage url={crew.URLFoto} onClick={() => setPreviewImage(crew.URLFoto)} title="Perbesar Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                                <span className="font-bold text-slate-700 text-sm">{crew.FullName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500 text-sm font-medium">{crew.ShortName}</td>
                                        <td className="p-4">
                                            {crew.MainRole ? (
                                                <span className="inline-block px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg">{crew.MainRole}</span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-500 text-sm font-medium">+{crew.NoHP}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => { setSelectedCrew(crew); setShowEditModal(true); setFileName(''); setFileData({ base64: '', mime: '' }); }} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center shadow-sm" title="Edit">
                                                    <i className="fas fa-edit text-xs"></i>
                                                </button>
                                                <button onClick={() => { 
                                                    setSelectedCrew(crew); setShowViewModal(true); setIsLoadingHistory(true);
                                                    dvaraFetch('getCrewHistory', { fullName: crew.FullName })
                                                        .then(res => {
                                                            if (res.status === 'success') setCrewHistoryInfo(res.data);
                                                            else setCrewHistoryInfo([]);
                                                            setIsLoadingHistory(false);
                                                        })
                                                        .catch(() => { setCrewHistoryInfo([]); setIsLoadingHistory(false); });
                                                }} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center shadow-sm" title="Detail">
                                                    <i className="fas fa-eye text-xs"></i>
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

            {/* MODAL WA BLAST */}
            {showWABlastModal && (
                <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative animate-[settingsSlideIn_0.3s_ease-out] flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-800 text-lg m-0 font-heading">Kirim ID ke WhatsApp</h3>
                            <button type="button" className="text-slate-400 hover:text-red-500 transition-colors text-xl" onClick={() => setShowWABlastModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex flex-col gap-5 bg-slate-50/50">
                            
                            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <label className="block text-xs font-bold text-slate-600 mb-2">1. Pilih Event</label>
                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary text-sm text-slate-700 appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjIwIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWxpbmUgcG9pbnRzPSI2IDkgMTIgMTUgMTggOSIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1em_1em]" value={selectedEventForWA} onChange={(e) => setSelectedEventForWA(e.target.value)}>
                                    <option value="" disabled>-- Pilih Event dari History --</option>
                                    {eventListForWA.map((ev, idx) => (
                                        <option key={idx} value={`${ev.eventName} ${ev.eventDate}`}>{ev.eventName} ({ev.eventDate})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                                    <label className="text-xs font-bold text-slate-600 m-0">2. Pilih Crew</label>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                                        <input type="checkbox" onChange={toggleSelectAll} checked={crewList.length > 0 && selectedCrewsForWA.length === crewList.length} className="w-4 h-4 text-maroon-primary bg-slate-100 border-slate-300 rounded focus:ring-maroon-primary" />
                                        Pilih Semua
                                    </label>
                                </div>
                                <div className="overflow-y-auto max-h-60 flex flex-col bg-white">
                                    {crewList.map((crew, idx) => {
                                        const isSelected = selectedCrewsForWA.some(c => c.NoHP === crew.NoHP);
                                        return (
                                            <label key={idx} className={`flex items-center gap-3 p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelectCrew(crew)} className="w-4 h-4 text-maroon-primary bg-slate-100 border-slate-300 rounded focus:ring-maroon-primary" />
                                                <div className="flex-1">
                                                    <div className={`font-bold text-sm ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>{crew.FullName}</div>
                                                    <div className="text-[11px] text-slate-400 font-medium">ID: {crew.IDCrew || 'Belum ada ID'}</div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {crewList.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">Belum ada data crew.</div>}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
                            <button type="button" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors text-sm" onClick={() => setShowWABlastModal(false)}>Batal</button>
                            <button type="button" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 text-sm flex items-center gap-2" onClick={handleBlastWA} disabled={selectedCrewsForWA.length === 0}>
                                <i className="fab fa-whatsapp"></i> Kirim ke WA ({selectedCrewsForWA.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH CREW */}
            {showAddModal && (
                <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative animate-[settingsSlideIn_0.3s_ease-out] flex flex-col max-h-[90vh]">
                        <form onSubmit={handleAddCrewSubmit} className="flex flex-col h-full min-h-0">
                            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                                <h3 className="font-bold text-maroon-primary text-lg m-0 font-heading tracking-wide">Tambah Crew Part-time</h3>
                                <button type="button" className="text-slate-400 hover:text-red-500 transition-colors text-xl" onClick={() => setShowAddModal(false)}>
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Lengkap</label>
                                        <input type="text" name="fullName" required placeholder="Sesuai KTP" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Panggilan</label>
                                        <input type="text" name="shortName" required placeholder="Bama" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nomor WhatsApp</label>
                                        <input type="text" name="noHp" required placeholder="Ex: +62 812-3456" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Bank / E-wallet</label>
                                        <input type="text" name="bankName" required placeholder="BCA / Mandiri" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nomor Rekening</label>
                                        <input type="text" name="bankRek" required placeholder="Ex: 12345678" onInput={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Atas Nama (A/N)</label>
                                        <input type="text" name="rekName" required placeholder="Pemilik rekening" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary text-sm text-slate-700 transition-all" />
                                    </div>
                                    
                                    <div className="md:col-span-2 mt-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Upload Foto Wajah</label>
                                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                                            <i className="fas fa-cloud-upload-alt text-3xl text-maroon-primary mb-3 group-hover:scale-110 transition-transform opacity-70"></i>
                                            <span className={`text-sm ${fileName ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>{fileName ? fileName : "Klik untuk memilih foto"}</span>
                                            <input type="file" name="foto" accept="image/*" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button type="button" className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-colors text-sm" onClick={() => setShowAddModal(false)} disabled={isSaving}>Batal</button>
                                <button type="submit" className="px-6 py-2.5 bg-maroon-primary hover:bg-maroon-dark text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 text-sm flex items-center justify-center gap-2" disabled={isSaving}>
                                    {isSaving ? <><div className="modern-spinner w-4 h-4 border-2 border-t-white"></div> Menyimpan...</> : 'Simpan Crew'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL EDIT CREW */}
            {showEditModal && selectedCrew && (
                <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative animate-[settingsSlideIn_0.3s_ease-out] flex flex-col max-h-[90vh]">
                        <form onSubmit={handleEditCrewSubmit} className="flex flex-col h-full min-h-0">
                            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                                <h3 className="font-bold text-slate-800 text-lg m-0 font-heading tracking-wide">Edit Data Crew</h3>
                                <button type="button" className="text-slate-400 hover:text-red-500 transition-colors text-xl" onClick={() => {setShowEditModal(false); setSelectedCrew(null);}}>
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Lengkap</label>
                                        <input type="text" name="fullName" required defaultValue={selectedCrew.FullName} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Panggilan</label>
                                        <input type="text" name="shortName" required defaultValue={selectedCrew.ShortName} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nomor WhatsApp</label>
                                        <input type="text" name="noHp" required defaultValue={'+' + selectedCrew.NoHP} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Bank / E-wallet</label>
                                        <input type="text" name="bankName" required defaultValue={selectedCrew.BankName} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Nomor Rekening</label>
                                        <input type="text" name="bankRek" required defaultValue={selectedCrew.BankRek} onInput={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Atas Nama (A/N)</label>
                                        <input type="text" name="rekName" required defaultValue={selectedCrew.RekName} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Main Role</label>
                                        <input type="text" name="mainRole" required defaultValue={selectedCrew.MainRole} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-700 transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Sub Role</label>
                                        <input type="text" name="subRole" defaultValue={selectedCrew.SubRole} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-sm text-slate-700 transition-all" />
                                    </div>
                                    
                                    <div className="md:col-span-2 mt-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Ganti Foto Wajah (Opsional)</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                                                <PrivateImage url={selectedCrew.URLFoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group flex-1">
                                                <i className="fas fa-cloud-upload-alt text-2xl text-blue-500 mb-1 opacity-70 group-hover:scale-110 transition-transform"></i>
                                                <span className={`text-[11px] ${fileName ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>{fileName ? fileName : "Upload foto baru buat nimpa yang lama"}</span>
                                                <input type="file" name="foto" accept="image/*" onChange={handleFileChange} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button type="button" className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-colors text-sm" onClick={() => {setShowEditModal(false); setSelectedCrew(null);}} disabled={isSaving}>Batal</button>
                                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 text-sm flex items-center justify-center gap-2" disabled={isSaving}>
                                    {isSaving ? <><div className="modern-spinner w-4 h-4 border-2 border-t-white"></div> Menyimpan...</> : 'Update Crew'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL VIEW PROFIL */}
            {showViewModal && selectedCrew && (
                <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative animate-[settingsSlideIn_0.2s_ease-out] flex flex-col">
                        
                        {/* Header Profil (Gelap) */}
                        <div className="bg-slate-900 p-6 pt-8 pb-8 text-center relative rounded-b-[2rem] shadow-sm z-10">
                            <button type="button" className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors flex items-center justify-center" onClick={() => setShowViewModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                            
                            <div className="w-24 h-24 rounded-full border-4 border-white mx-auto mb-4 overflow-hidden bg-slate-800 shadow-md cursor-zoom-in relative group" onClick={() => setPreviewImage(selectedCrew.URLFoto)}>
                                <PrivateImage url={selectedCrew.URLFoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i className="fas fa-search-plus text-white text-xl"></i>
                                </div>
                            </div>
                            
                            <h4 className="text-white mb-1 font-bold font-heading text-xl tracking-wide">{selectedCrew.FullName}</h4>
                            <p className="text-slate-400 mb-3 text-sm font-medium">Panggilan: {selectedCrew.ShortName}</p>
                            
                            <span className="inline-block bg-white/10 text-white rounded-full px-4 py-1.5 text-xs font-bold tracking-widest border border-white/10 shadow-sm backdrop-blur-sm">
                                {selectedCrew.IDCrew || 'ID BELUM TER-GENERATE'}
                            </span>
                        </div>
                        
                        <div className="p-6 bg-slate-50 flex-1 overflow-y-auto">
                            
                            {/* Tombol Kontak Cepat */}
                            <div className="flex gap-3 mb-6 -mt-10 relative z-20">
                                <a href={`tel:+${selectedCrew.NoHP}`} className="flex-1 py-3 bg-white hover:bg-blue-50 text-blue-600 font-bold rounded-xl shadow-sm border border-slate-100 transition-all text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5">
                                    <i className="fas fa-phone"></i> Telepon
                                </a>
                                <a href={`https://wa.me/${selectedCrew.NoHP}`} target="_blank" rel="noreferrer" className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5">
                                    <i className="fab fa-whatsapp text-lg"></i> WhatsApp
                                </a>
                            </div>

                            {/* Kartu Info */}
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-5">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <i className="fas fa-id-card"></i> Informasi Crew
                                </div>
                                <div className="font-bold text-slate-800 text-sm mb-1">{selectedCrew.BankName} - {selectedCrew.BankRek}</div>
                                <div className="text-xs text-slate-500 mb-4 pb-3 border-b border-dashed border-slate-200">A/N: {selectedCrew.RekName}</div>
                                
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                                    <div className="text-slate-500">Role:</div>
                                    <div className="font-bold text-slate-800 text-right">{selectedCrew.MainRole || '-'} / {selectedCrew.SubRole || '-'}</div>
                                    
                                    <div className="text-slate-500">Total Event:</div>
                                    <div className="font-bold text-slate-800 text-right">{selectedCrew.TotalEvent || '0'}</div>
                                    
                                    <div className="text-slate-500">Terakhir Ikut:</div>
                                    <div className="font-bold text-slate-800 text-right">{selectedCrew.LastActive || '-'}</div>
                                </div>
                            </div>

                            {/* Kartu Histori */}
                            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <i className="fas fa-history"></i> Event Yang Diikuti
                                </div>
                                
                                {isLoadingHistory ? (
                                    <div className="flex items-center text-xs text-slate-500 gap-2">
                                        <div className="modern-spinner w-3 h-3 border-2 border-t-slate-400"></div> Memuat riwayat...
                                    </div>
                                ) : crewHistoryInfo.length > 0 ? (
                                    <ul className="m-0 pl-4 text-xs font-medium text-slate-700 space-y-1.5 list-disc list-outside marker:text-slate-300">
                                        {crewHistoryInfo.map((event, idx) => (
                                            <li key={idx}>{event}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">Belum ada histori event.</div>
                                )}
                            </div>

                            {/* Action Danger */}
                            <div className="pt-4 border-t border-slate-200 flex flex-col gap-2">
                                <button onClick={() => handleDeleteAction(selectedCrew.NoHP, false)} className="w-full py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-500 font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm">
                                    <i className="fas fa-trash-alt"></i> Hapus Data Crew
                                </button>
                                <button onClick={() => handleDeleteAction(selectedCrew.NoHP, true)} className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-sm">
                                    <i className="fas fa-ban"></i> Hapus & Blacklist Permanen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

};