const { useState, useEffect, useRef } = React;

const LoadingForm = ({ sessionData }) => {
    const [forms, setForms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [ttdMode, setTtdMode] = useState('canvas'); 
    const [ttdImage, setTtdImage] = useState(null);
    const [ttdFileName, setTtdFileName] = useState('');
    
    const [jadwals, setJadwals] = useState([{ 
        id: Date.now(),
        type: 'Masuk', 
        waktu: '', pembawa: '', nopol: '', 
        waktuMasuk: '', waktuKeluar: '', pembawaMasuk: '', nopolMasuk: '', pembawaKeluar: '', nopolKeluar: '', isSama: true, 
        items: [{ barang: '', jml: '', ket: '' }], 
        isExpanded: true 
    }]);
    
    const formRef = useRef(null);
    const modalContentRef = useRef(null);
    const canvasRef = useRef(null);
    let isDrawing = false;

    const resetForm = () => {
        if (formRef.current) formRef.current.reset(); 
        setJadwals([{ 
            id: Date.now(), type: 'Masuk', waktu: '', pembawa: '', nopol: '', waktuMasuk: '', waktuKeluar: '', pembawaMasuk: '', nopolMasuk: '', pembawaKeluar: '', nopolKeluar: '', isSama: true, items: [{ barang: '', jml: '', ket: '' }], isExpanded: true 
        }]);
        setTtdMode('canvas');
        setTtdImage(null);
        setTtdFileName('');
        if (canvasRef.current) clearCanvas(); 
        if (modalContentRef.current) modalContentRef.current.scrollTop = 0;
    };

    useEffect(() => { fetchFormList(); }, []);

    const fetchFormList = async () => {
        setIsLoading(true);
        try {
            const res = await dvaraFetch('getLoadingFormList', {});
            if (res && res.status === 'success') {
                setForms(res.data || []);
            } else {
                setForms([]);
                console.error("Gagal load loading form list:", res);
            }
        } catch(e) {
            Swal.fire('Error', e.message, 'error');
        }
        setIsLoading(false);
    };

    // --- CANVAS LOGIC ---
    useEffect(() => {
        if (showModal && ttdMode === 'canvas' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
            const getPos = (e) => {
                const rect = canvas.getBoundingClientRect();
                return { x: (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left, y: (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top };
            };
            const start = (e) => { if (e.cancelable) e.preventDefault(); isDrawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
            const draw = (e) => { if (!isDrawing) return; if (e.cancelable) e.preventDefault(); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
            const end = (e) => { if (e.cancelable) e.preventDefault(); isDrawing = false; };
            
            // Add listeners with non-passive option where supported to prevent scrolling while drawing
            const options = { passive: false };
            canvas.addEventListener('touchstart', start, options); 
            canvas.addEventListener('touchmove', draw, options); 
            canvas.addEventListener('touchend', end, options);
            canvas.addEventListener('mousedown', start); 
            canvas.addEventListener('mousemove', draw); 
            canvas.addEventListener('mouseup', end);
            
            return () => {
                canvas.removeEventListener('touchstart', start); canvas.removeEventListener('touchmove', draw); canvas.removeEventListener('touchend', end);
                canvas.removeEventListener('mousedown', start); canvas.removeEventListener('mousemove', draw); canvas.removeEventListener('mouseup', end);
            };
        }
    }, [showModal, ttdMode]);

    const clearCanvas = () => { if(canvasRef.current) canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); };

    // --- HANDLER JADWAL & CARD ---
    const addJadwalCard = () => {
        const minimizedJadwals = jadwals.map(j => ({ ...j, isExpanded: false }));
        setJadwals([
            ...minimizedJadwals, 
            { id: Date.now(), type: 'Masuk', waktu: '', pembawa: '', nopol: '', waktuMasuk: '', waktuKeluar: '', pembawaMasuk: '', nopolMasuk: '', pembawaKeluar: '', nopolKeluar: '', isSama: true, items: [{ barang: '', jml: '', ket: '' }], isExpanded: true }
        ]);
    };

    const removeJadwalCard = (index) => {
        const newJadwals = jadwals.filter((_, i) => i !== index);
        const isAnyExpanded = newJadwals.some(j => j.isExpanded);
        if (!isAnyExpanded && newJadwals.length > 0) {
            newJadwals[newJadwals.length - 1].isExpanded = true;
        }
        setJadwals(newJadwals);
    };

    const toggleCard = (index) => {
        const newJadwals = [...jadwals];
        newJadwals[index].isExpanded = !newJadwals[index].isExpanded;
        setJadwals(newJadwals);
    };

    const handleJadwalChange = (index, field, value) => {
        const newJadwals = [...jadwals];
        newJadwals[index][field] = value;
        setJadwals(newJadwals);
    };

    // --- HANDLER BARANG ---
    const addItemRow = (jIndex) => {
        const newJadwals = [...jadwals];
        newJadwals[jIndex].items.push({ barang: '', jml: '', ket: '' });
        setJadwals(newJadwals);
    };

    const removeItemRow = (jIndex, iIndex) => {
        const newJadwals = [...jadwals];
        newJadwals[jIndex].items = newJadwals[jIndex].items.filter((_, i) => i !== iIndex);
        setJadwals(newJadwals);
    };

    const handleItemChange = (jIndex, iIndex, field, value) => {
        const newJadwals = [...jadwals];
        newJadwals[jIndex].items[iIndex][field] = value;
        setJadwals(newJadwals);
    };

    const handleCopyItems = (targetIndex) => {
        const options = {};
        jadwals.forEach((j, idx) => {
            if (idx !== targetIndex) options[idx] = `Jadwal ${idx + 1} (${j.type})`;
        });

        if (Object.keys(options).length === 0) return;

        Swal.fire({
            title: 'Salin Daftar Barang',
            text: 'Pilih jadwal yang barangnya ingin disalin:',
            input: 'select',
            inputOptions: options,
            inputPlaceholder: '-- Pilih Jadwal --',
            showCancelButton: true,
            confirmButtonText: 'Salin',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#3b82f6',
        }).then((result) => {
            if (result.isConfirmed && result.value !== "") {
                const sourceIndex = parseInt(result.value);
                const newJadwals = [...jadwals];
                newJadwals[targetIndex].items = JSON.parse(JSON.stringify(jadwals[sourceIndex].items));
                setJadwals(newJadwals);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Barang berhasil disalin!', showConfirmButton: false, timer: 2000 });
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let overLimit = false;
        jadwals.forEach(j => { if (j.items.length > 12) overLimit = true; });
        if (overLimit) Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Barang > 12, teks akan otomatis dikecilkan!', showConfirmButton: false, timer: 4000 });

        setIsGenerating(true);
        let ttdBase64 = null;
        if (ttdMode === 'canvas' && canvasRef.current) {
            ttdBase64 = canvasRef.current.toDataURL('image/png').split(',')[1];
        } else if (ttdImage) {
            ttdBase64 = ttdImage.split(',')[1];
        }

        const payload = {
            jadwals: jadwals,
            vendorName: e.target.vendorName.value,
            status: e.target.status.value,
            lantai: e.target.lantai.value,
            ttdBase64: ttdBase64,
            ttdName: sessionData ? sessionData.name : e.target.vendorName.value // Using sessionData.name for the signature name if available
        };
        
        try {
            // Note: in backend the action is generatePublicLoadingPDF (used by public and dashboard)
            const res = await dvaraFetch('generatePublicLoadingPDF', payload);
            setIsGenerating(false);
            if (res && res.status === 'success') {
                Swal.fire('Berhasil!', 'Surat Loading berhasil dibuat.', 'success');
                setShowModal(false); 
                fetchFormList();
            } else {
                Swal.fire('Gagal', res?.message || 'Error saat generate', 'error');
            }
        } catch (err) {
            setIsGenerating(false);
            Swal.fire('Error', err.message, 'error');
        }
    };

    const handleDelete = (url, fileName) => {
        Swal.fire({ 
            title: 'Hapus Surat?', 
            text: `Yakin ingin menghapus "${fileName}"? File akan dibuang ke Trash Drive.`, 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#ef4444', 
            cancelButtonColor: '#cbd5e1', 
            confirmButtonText: '<i class="fas fa-trash-alt"></i> Ya, Hapus!' 
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, showConfirmButton: false, willOpen: () => { Swal.showLoading(); }});
                try {
                    const res = await dvaraFetch('deleteLoadingForm', { url: url });
                    if (res && res.status === 'success') { 
                        Swal.fire('Terhapus!', res.message, 'success'); 
                        fetchFormList(); 
                    } else {
                        Swal.fire('Gagal', res?.message || 'Gagal menghapus', 'error');
                    }
                } catch(e) {
                    Swal.fire('Error', e.message, 'error');
                }
            }
        });
    };

    return (
        <div className="animate-[fadeIn_0.3s_ease] font-sans pb-10">
            <div className="flex justify-end items-center mb-6 flex-wrap gap-3">
                <button onClick={() => { resetForm(); setShowModal(true); }} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2">
                    <i className="fas fa-plus"></i> Add Loading Form
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-[13px] font-bold text-slate-500">NAMA FILE</th>
                                <th className="p-4 text-[13px] font-bold text-slate-500">TANGGAL DIBUAT</th>
                                <th className="p-4 text-[13px] font-bold text-slate-500 text-center">AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="3" className="p-10 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="modern-spinner w-8 h-8 border-2 border-t-maroon-primary"></div>
                                            <div className="text-sm font-semibold">Memuat data...</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : forms.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-10 py-16 text-center text-slate-400">
                                        <i className="fas fa-folder-open text-5xl mb-4 opacity-30 drop-shadow-sm"></i>
                                        <div className="text-sm font-semibold text-slate-500">Belum ada surat.</div>
                                    </td>
                                </tr>
                            ) : (
                                forms.map((f, i) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 font-bold text-slate-800 text-sm">{f.fileName}</td>
                                        <td className="p-4 text-slate-500 text-sm font-medium">{f.date}</td>
                                        <td className="p-4 text-center whitespace-nowrap">
                                            <div className="flex justify-center gap-2">
                                                <a href={f.url} target="_blank" rel="noreferrer" className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm">
                                                    <i className="fas fa-eye"></i> Lihat
                                                </a>
                                                <a href={f.url} target="_blank" rel="noreferrer" className="px-3 py-2 bg-blue-500 text-white hover:bg-blue-600 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20">
                                                    <i className="fas fa-download"></i> Download
                                                </a>
                                                <button onClick={() => handleDelete(f.url, f.fileName)} className="w-8 h-8 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors flex items-center justify-center shadow-sm" title="Hapus Surat">
                                                    <i className="fas fa-trash-alt"></i>
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

            {/* MODAL FORM */}
            {showModal && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-[settingsSlideIn_0.3s_ease-out]">
                        
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0 flex justify-between items-center rounded-t-2xl">
                            <h3 className="m-0 text-slate-800 font-bold font-heading text-lg">Buat Surat Loading Baru</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors text-xl">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div ref={modalContentRef} className="p-6 overflow-y-auto">
                            <form ref={formRef} onSubmit={handleSubmit}>
                                
                                {/* KOP FORM */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 bg-white border border-slate-200 rounded-2xl mb-6 shadow-sm">
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-800 mb-1.5">Nama Vendor</label>
                                        <input type="text" name="vendorName" required placeholder="Ex: Bens Pro" className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-800 mb-1.5">Unit / Lantai</label>
                                        <input type="text" name="lantai" required placeholder="Ex: Lt. 5" className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[13px] font-bold text-slate-800 mb-1.5">Status</label>
                                        <select name="status" defaultValue="Tenant" className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-sans cursor-pointer appearance-none pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjIwIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWxpbmUgcG9pbnRzPSI2IDkgMTIgMTUgMTggOSIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:1em_1em]">
                                            <option value="Kontraktor">Kontraktor</option>
                                            <option value="Tenant">Tenant</option>
                                        </select>
                                    </div>
                                </div>

                                {/* --- AREA EXPANDABLE CARDS --- */}
                                {jadwals.map((j, jIndex) => (
                                    <div key={j.id} className="bg-white rounded-2xl border border-slate-200 mb-4 overflow-hidden shadow-sm transition-all duration-300">
                                        
                                        {/* Card Header */}
                                        <div className={`px-5 py-3 flex justify-between items-center transition-colors ${j.isExpanded ? 'bg-slate-50 border-b border-slate-200' : 'bg-white'}`}>
                                            <div className="flex items-center gap-3 flex-1">
                                                <span className="font-bold text-slate-800 text-[15px]">Jadwal {jIndex + 1}</span>
                                                <select className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold bg-white outline-none cursor-pointer text-slate-700" value={j.type} onChange={(e) => handleJadwalChange(jIndex, 'type', e.target.value)}>
                                                    <option value="Masuk">Form Masuk</option>
                                                    <option value="Keluar">Form Keluar</option>
                                                    <option value="Keduanya">Form Keduanya (Masuk & Keluar)</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {jadwals.length > 1 && (
                                                    <button type="button" onClick={() => removeJadwalCard(jIndex)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors">
                                                        <i className="fas fa-trash-alt text-xs"></i>
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => toggleCard(jIndex)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors">
                                                    <i className={`fas fa-chevron-down transition-transform duration-300 ${j.isExpanded ? 'rotate-180' : ''}`}></i>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className={`transition-all duration-300 ease-in-out ${j.isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                            <div className="p-5">
                                                
                                                {/* INFO WAKTU & PEMBAWA */}
                                                {j.type !== 'Keduanya' ? (
                                                    <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-dashed border-slate-200">
                                                        <div className="flex-[2] min-w-[200px]"><label className="block text-xs font-bold mb-1.5 text-slate-700">Waktu Pelaksanaan</label><input type="datetime-local" required value={j.waktu} onChange={(e) => handleJadwalChange(jIndex, 'waktu', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 transition-all font-sans" /></div>
                                                        <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold mb-1.5 text-slate-700">Pembawa Barang</label><input type="text" required placeholder="Nama Supir" value={j.pembawa} onChange={(e) => handleJadwalChange(jIndex, 'pembawa', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 transition-all" /></div>
                                                        <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold mb-1.5 text-slate-700">No. Polisi</label><input type="text" required placeholder="Plat Nomor" value={j.nopol} onChange={(e) => handleJadwalChange(jIndex, 'nopol', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 transition-all" /></div>
                                                    </div>
                                                ) : (
                                                    <div className="mb-4 pb-4 border-b border-dashed border-slate-200">
                                                        <div className="flex flex-wrap gap-3 mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                            <div className="flex-[2] min-w-[200px]"><label className="block text-xs font-bold mb-1.5 text-emerald-600"><i className="fas fa-arrow-down mr-1"></i>Waktu (Masuk)</label><input type="datetime-local" required value={j.waktuMasuk} onChange={(e) => handleJadwalChange(jIndex, 'waktuMasuk', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-emerald-500 transition-all font-sans" /></div>
                                                            <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold mb-1.5 text-slate-700">{j.isSama ? 'Pembawa Barang' : 'Pembawa (Masuk)'}</label><input type="text" required placeholder="Nama Supir" value={j.pembawaMasuk} onChange={(e) => handleJadwalChange(jIndex, 'pembawaMasuk', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-emerald-500 transition-all" /></div>
                                                            <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold mb-1.5 text-slate-700">{j.isSama ? 'No. Polisi' : 'No. Pol (Masuk)'}</label><input type="text" required placeholder="Plat Nomor" value={j.nopolMasuk} onChange={(e) => handleJadwalChange(jIndex, 'nopolMasuk', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-emerald-500 transition-all" /></div>
                                                        </div>
                                                        
                                                        <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer mb-3 hover:bg-slate-200 transition-colors">
                                                            <input type="checkbox" checked={j.isSama} onChange={(e) => handleJadwalChange(jIndex, 'isSama', e.target.checked)} className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" />
                                                            Data Keluar sama dengan Masuk?
                                                        </label>

                                                        <div className="flex flex-wrap gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                                            <div className="flex-[2] min-w-[200px]"><label className="block text-xs font-bold mb-1.5 text-red-500"><i className="fas fa-arrow-up mr-1"></i>Waktu (Keluar)</label><input type="datetime-local" required value={j.waktuKeluar} onChange={(e) => handleJadwalChange(jIndex, 'waktuKeluar', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-red-200 outline-none focus:border-red-400 transition-all font-sans bg-white" /></div>
                                                            {!j.isSama && (
                                                                <>
                                                                    <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold mb-1.5 text-slate-700">Pembawa (Keluar)</label><input type="text" required placeholder="Nama Supir" value={j.pembawaKeluar} onChange={(e) => handleJadwalChange(jIndex, 'pembawaKeluar', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-red-200 outline-none focus:border-red-400 transition-all bg-white" /></div>
                                                                    <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold mb-1.5 text-slate-700">No. Pol (Keluar)</label><input type="text" required placeholder="Plat Nomor" value={j.nopolKeluar} onChange={(e) => handleJadwalChange(jIndex, 'nopolKeluar', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-red-200 outline-none focus:border-red-400 transition-all bg-white" /></div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* DAFTAR BARANG */}
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-800 mb-3"><i className="fas fa-box-open text-blue-500 mr-1.5"></i>Daftar Barang ({j.type})</label>
                                                    {j.items.map((item, iIndex) => (
                                                        <div key={iIndex} className="flex gap-2 mb-2 items-center">
                                                            <input type="text" required placeholder="Nama Barang" value={item.barang} onChange={(e) => handleItemChange(jIndex, iIndex, 'barang', e.target.value)} className="flex-[3] px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500 text-sm" />
                                                            <input type="text" required placeholder="JML" value={item.jml} onChange={(e) => handleItemChange(jIndex, iIndex, 'jml', e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500 text-sm" />
                                                            <input type="text" placeholder="Keterangan" value={item.ket} onChange={(e) => handleItemChange(jIndex, iIndex, 'ket', e.target.value)} className="flex-[2] px-3 py-2 rounded-lg border border-slate-300 outline-none focus:ring-1 focus:ring-blue-500 text-sm" />
                                                            {j.items.length > 1 && (
                                                                <button type="button" onClick={() => removeItemRow(jIndex, iIndex)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0 transition-colors">
                                                                    <i className="fas fa-times"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    
                                                    <div className="flex gap-2 mt-3 flex-wrap">
                                                        <button type="button" onClick={() => addItemRow(jIndex)} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-full text-xs transition-colors flex items-center gap-1.5">
                                                            <i className="fas fa-plus"></i> Tambah Barang
                                                        </button>
                                                        
                                                        {jadwals.length > 1 && (
                                                            <button type="button" onClick={() => handleCopyItems(jIndex)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-full text-xs transition-colors flex items-center gap-1.5 shadow-sm">
                                                                <i className="fas fa-copy"></i> Salin dari Jadwal Lain
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button type="button" onClick={addJadwalCard} className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl mb-6 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2">
                                    <i className="fas fa-plus"></i> Tambah Jadwal Lain
                                </button>

                                {/* --- TANDA TANGAN --- */}
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
                                    <label className="block text-sm font-bold text-slate-800 mb-3">Tanda Tangan Pemohon</label>
                                    <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
                                        <button type="button" onClick={() => setTtdMode('canvas')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${ttdMode === 'canvas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                            Tanda Tangan
                                        </button>
                                        <button type="button" onClick={() => setTtdMode('upload')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${ttdMode === 'upload' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                            Upload Gambar
                                        </button>
                                    </div>
                                    
                                    {ttdMode === 'canvas' ? (
                                        <div className="text-center bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                                            <canvas ref={canvasRef} width="400" height="200" className="bg-white border-2 border-dashed border-slate-200 rounded-lg cursor-crosshair max-w-full mx-auto touch-none shadow-sm"></canvas>
                                            <button type="button" onClick={clearCanvas} className="mt-3 px-4 py-2 bg-white border border-slate-200 text-red-500 font-bold rounded-lg text-xs hover:bg-red-50 transition-colors shadow-sm">
                                                Bersihkan Canvas
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all group">
                                            <i className="fas fa-cloud-upload-alt text-3xl text-blue-500 mb-2 opacity-70 group-hover:scale-110 transition-transform"></i>
                                            <span className={`text-sm ${ttdFileName ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>{ttdFileName ? ttdFileName : "Klik untuk memilih foto Tanda Tangan"}</span>
                                            <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files[0]; if(file) { setTtdFileName(file.name); const reader = new FileReader(); reader.onload = (ev) => setTtdImage(ev.target.result); reader.readAsDataURL(file); } }} className="hidden" />
                                        </label>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowModal(false)} disabled={isGenerating} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">Batal</button>
                                    <button type="submit" disabled={isGenerating} className="flex-[2] py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                                        {isGenerating ? <><div className="modern-spinner w-4 h-4 border-2 border-t-white inline-block align-middle mr-2"></div>Memproses PDF...</> : 'Generate PDF & Simpan'}
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
