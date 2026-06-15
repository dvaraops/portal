const { useState, useEffect, useRef } = React;

const InventoryForm = ({ searchQuery, fabAction, clearFabAction }) => {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    
    const [activeTab, setActiveTab] = useState('Semua');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterKondisi, setFilterKondisi] = useState('Semua');
    const [filterStok, setFilterStok] = useState('Semua');

    const [uploading, setUploading] = useState(false);
    const [isNewCategory, setIsNewCategory] = useState(false); 
    const [uploadFileName, setUploadFileName] = useState('');
    const fileInputRef = useRef(null);
    const formRef = useRef(null);

    useEffect(() => { fetchInventory(); }, []);

    useEffect(() => {
        if (fabAction === 'add') {
            handleAddNew();
            if (clearFabAction) clearFabAction();
        }
    }, [fabAction]);
    
    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const res = await dvaraFetch('getInventoryList', {});
            if (res && res.status === 'success') {
                setItems(res.data || []);
            } else {
                setItems([]);
                console.error("Gagal load inventory:", res);
            }
        } catch (err) {
            Swal.fire('Error', err.message || 'Gagal mengambil data', 'error');
        }
        setIsLoading(false);
    };

    const categories = ['Semua', ...new Set(items.map(item => (item.Kategori || "").trim()).filter(Boolean))];
    const formCategories = categories.filter(c => c !== 'Semua');

    let displayedItems = items.filter(item => {
        const cat = (item.Kategori || "").trim();
        const matchTab = activeTab === 'Semua' || cat === activeTab;
        const matchSearch = (item.NamaBarang || "").toLowerCase().includes(searchQuery.toLowerCase()) || (item.ID || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchKondisi = filterKondisi === 'Semua' || item.Kondisi === filterKondisi;
        
        let matchStok = true;
        let minT = parseFloat(item.MinStok) || 0;
        if (filterStok === 'Habis') matchStok = parseFloat(item.Jumlah) === 0;
        if (filterStok === 'Low') matchStok = parseFloat(item.Jumlah) > 0 && parseFloat(item.Jumlah) <= minT;
        
        return matchTab && matchSearch && matchKondisi && matchStok;
    });

    const updateQty = async (id, newVal) => {
        const val = parseFloat(newVal);
        if (isNaN(val) || val < 0) return;
        
        const now = new Date();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        // Optimistic UI Update
        setItems(prev => prev.map(it => it.ID === id ? { ...it, Jumlah: val, LastUpdate: dateStr } : it));
        
        const res = await dvaraFetch('updateInventoryStock', { id, newJumlah: val, tipe: 'Update Cepat' });
        if (res && res.status === 'success') {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Stok Terupdate', showConfirmButton: false, timer: 1000 });
        } else {
            Swal.fire('Error', res?.message || 'Gagal update stok', 'error');
            fetchInventory(); // revert if failed
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setIsNewCategory(false);
        setUploadFileName('');
        if(formRef.current) formRef.current.reset();
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setIsNewCategory(false);
        setUploadFileName('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        const processSave = async (base64 = "") => {
            const payload = {
                ...data,
                id: editingItem ? editingItem.ID : null,
                fotoBase64: base64 ? base64.split(',')[1] : "", // get base64 actual content
                fotoMimeType: base64 ? base64.split(';')[0].split(':')[1] : ""
            };

            const res = await dvaraFetch('saveInventoryItem', payload);
            setUploading(false);
            if(res && res.status === 'success') {
                Swal.fire('Berhasil!', res.message, 'success');
                setShowModal(false);
                setUploadFileName('');
                fetchInventory();
            } else {
                Swal.fire('Gagal', res?.message || 'Error simpan barang', 'error');
            }
        };

        const file = fileInputRef.current?.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => processSave(ev.target.result);
            reader.readAsDataURL(file);
        } else {
            processSave();
        }
    };

    const deleteItem = (id) => {
        Swal.fire({ title: 'Hapus Barang?', text: "Data tidak bisa dikembalikan!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444' })
        .then(async (res) => {
            if(res.isConfirmed) {
                Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, showConfirmButton: false, willOpen: () => { Swal.showLoading(); }});
                const response = await dvaraFetch('deleteInventoryItem', { id });
                if (response && response.status === 'success') {
                    Swal.fire('Terhapus!', 'Barang dihapus.', 'success');
                    fetchInventory(); 
                } else {
                    Swal.fire('Gagal', response?.message || 'Gagal menghapus', 'error');
                }
            }
        });
    };

    return (
        <div className="w-full pb-10 font-sans">
            <style>{`
                .hide-spinners::-webkit-inner-spin-button,
                .hide-spinners::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                .hide-spinners { -moz-appearance: textfield; }
            `}</style>

            <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="flex-1 min-w-[220px] relative">
                    <i className="fas fa-search absolute top-3.5 left-4 text-slate-400"></i>
                    <input type="text" placeholder="Cari barang..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary transition-all text-sm text-slate-700 shadow-sm" />
                </div>
                
                <div className="flex flex-wrap gap-2">
                    <select value={filterKondisi} onChange={(e) => setFilterKondisi(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary text-slate-600 text-sm font-semibold cursor-pointer shadow-sm transition-all appearance-none pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjIwIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWxpbmUgcG9pbnRzPSI2IDkgMTIgMTUgMTggOSIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:1.25em_1.25em]">
                        <option value="Semua">Semua Kondisi</option>
                        <option value="Baik">Kondisi Baik</option>
                        <option value="Rusak">Rusak</option>
                        <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                    </select>
                    <select value={filterStok} onChange={(e) => setFilterStok(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-maroon-primary text-slate-600 text-sm font-semibold cursor-pointer shadow-sm transition-all appearance-none pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjIwIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWxpbmUgcG9pbnRzPSI2IDkgMTIgMTUgMTggOSIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:1.25em_1.25em]">
                        <option value="Semua">Semua Stok</option>
                        <option value="Low">Warning (Minimum Stok)</option>
                        <option value="Habis">Stok Habis (0)</option>
                    </select>
                </div>

                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'grid' ? 'bg-slate-100 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`} title="Card View"><i className="fas fa-th-large"></i></button>
                    <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-blue-500' : 'text-slate-400 hover:text-slate-600'}`} title="List View"><i className="fas fa-list"></i></button>
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                {categories.map((cat, idx) => (
                    <button key={idx} onClick={() => setActiveTab(cat)} className={`px-4 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all duration-300 ${activeTab === cat ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                        {cat}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                    <div className="modern-spinner w-8 h-8 border-2 border-slate-200 border-t-maroon-primary rounded-full animate-spin"></div>
                    <div className="text-sm font-semibold">Memuat Inventaris...</div>
                </div>
            ) : displayedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
                    <i className="fas fa-box-open text-5xl mb-4 opacity-30"></i>
                    <div className="text-sm font-semibold text-slate-500">Barang tidak ditemukan.</div>
                </div>
            ) : viewMode === 'grid' ? (
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayedItems.map((item, idx) => {
                        const isRusak = item.Kondisi !== 'Baik';
                        const isHabis = parseFloat(item.Jumlah) === 0;
                        const minStokLimit = parseFloat(item.MinStok) || 0;
                        const isLow = parseFloat(item.Jumlah) <= minStokLimit && !isHabis;
                        
                        let qtyColor = 'text-slate-800';
                        if (isHabis) qtyColor = 'text-red-500';
                        else if (isLow) qtyColor = 'text-amber-500';

                        return (
                            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative flex flex-col group">
                                
                                <button onClick={() => openEditModal(item)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm" title="Edit Barang">
                                    <i className="fas fa-pen text-xs"></i>
                                </button>

                                <div className="flex gap-4 mb-5">
                                    <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0 flex items-center justify-center relative cursor-zoom-in hover:opacity-90 transition-opacity">
                                        {item.URLFoto ? (
                                            <PrivateImage url={item.URLFoto} onClick={() => setPreviewImage(item.URLFoto)} title="Perbesar Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <i className="fas fa-box text-3xl text-slate-300"></i>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-hidden pr-4">
                                        <div className="text-[10px] text-slate-400 font-bold mb-1 tracking-wider">{item.ID}</div>
                                        <h4 className="m-0 text-sm font-bold text-slate-800 leading-tight mb-2 truncate">{item.NamaBarang}</h4>
                                        
                                        <div className="flex gap-1.5 items-center flex-wrap">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap ${isRusak ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {item.Kondisi}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-500 whitespace-nowrap truncate max-w-[90px]">
                                                <i className="fas fa-clock mr-1"></i>{item.LastUpdate}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100 flex flex-col items-center">
                                    <div className="text-[10px] text-slate-400 mb-2 font-bold tracking-wider">STOK ({item.Satuan})</div>
                                    <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => updateQty(item.ID, parseFloat(item.Jumlah) - 1)} className="w-7 h-7 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex items-center justify-center"><i className="fas fa-minus text-[10px]"></i></button>
                                        
                                        <input type="number" className={`hide-spinners w-16 text-center text-lg font-bold border border-slate-200 rounded-md bg-white py-1 outline-none focus:border-maroon-primary transition-colors ${qtyColor}`} value={item.Jumlah} onChange={(e) => updateQty(item.ID, e.target.value)} />
                                        
                                        <button onClick={() => updateQty(item.ID, parseFloat(item.Jumlah) + 1)} className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-500 hover:bg-emerald-100 transition-colors flex items-center justify-center"><i className="fas fa-plus text-[10px]"></i></button>
                                    </div>
                                </div>

                                <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border-l-4 border-amber-500 font-medium">
                                    <i className="fas fa-info-circle mr-1.5 opacity-80"></i>{item.Keterangan || 'Tidak ada catatan'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[700px] border-collapse">
                            <thead className="bg-slate-50 border-b-2 border-slate-200">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 tracking-wider w-[40%]">BARANG</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 tracking-wider text-center w-[20%]">JUMLAH</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 tracking-wider w-[30%]">KONDISI & CATATAN</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 tracking-wider text-center w-[10%]">AKSI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedItems.map((item, idx) => {
                                    const isRusak = item.Kondisi !== 'Baik';
                                    const isHabis = parseFloat(item.Jumlah) === 0;
                                    const minStokLimit = parseFloat(item.MinStok) || 0;
                                    const isLow = parseFloat(item.Jumlah) <= minStokLimit && !isHabis;
                                    
                                    let qtyColor = 'text-slate-800';
                                    if (isHabis) qtyColor = 'text-red-500';
                                    else if (isLow) qtyColor = 'text-amber-500';

                                    return (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center cursor-zoom-in">
                                                        {item.URLFoto ? (
                                                            <PrivateImage url={item.URLFoto} onClick={() => setPreviewImage(item.URLFoto)} title="Perbesar Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <i className="fas fa-box text-slate-300"></i>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-sm text-slate-800 truncate mb-0.5">{item.NamaBarang}</div>
                                                        <div className="text-[11px] text-slate-500 font-semibold">{item.ID} • {item.Kategori}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center align-middle">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => updateQty(item.ID, parseFloat(item.Jumlah)-1)} className="w-6 h-6 bg-red-50 text-red-500 hover:bg-red-100 rounded flex items-center justify-center transition-colors"><i className="fas fa-minus text-[9px]"></i></button>
                                                    <input type="number" className={`hide-spinners w-12 text-center text-sm font-bold border border-slate-200 rounded bg-white py-0.5 outline-none focus:border-maroon-primary transition-colors ${qtyColor}`} value={item.Jumlah} onChange={(e) => updateQty(item.ID, e.target.value)} />
                                                    <button onClick={() => updateQty(item.ID, parseFloat(item.Jumlah)+1)} className="w-6 h-6 bg-emerald-50 text-emerald-500 hover:bg-emerald-100 rounded flex items-center justify-center transition-colors"><i className="fas fa-plus text-[9px]"></i></button>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-1.5 items-center flex-wrap mb-1.5">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap ${isRusak ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {item.Kondisi}
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-500 whitespace-nowrap truncate max-w-[120px]">
                                                        <i className="fas fa-clock mr-1"></i>{item.LastUpdate}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-500 max-w-[220px] truncate">{item.Keterangan || '-'}</div>
                                            </td>
                                            <td className="p-4 text-center align-middle whitespace-nowrap">
                                                <button onClick={() => openEditModal(item)} className="w-8 h-8 rounded-lg bg-slate-100 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition-colors mx-1"><i className="fas fa-pen text-xs"></i></button>
                                                <button onClick={() => deleteItem(item.ID)} className="w-8 h-8 rounded-lg bg-slate-100 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors mx-1"><i className="fas fa-trash text-xs"></i></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH/EDIT */}
            {showModal && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative animate-[settingsSlideIn_0.3s_ease-out] flex flex-col max-h-[90vh]">
                        
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-maroon-primary text-lg m-0 font-heading tracking-wide">{editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors text-xl">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Nama Barang</label>
                                    <input type="text" name="namaBarang" required defaultValue={editingItem?.NamaBarang} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-gold-light text-sm text-slate-700 transition-all" />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Kategori</label>
                                    <div className="flex gap-2">
                                        {!isNewCategory ? (
                                            <select name="kategori" defaultValue={editingItem?.Kategori || (formCategories.length > 0 ? formCategories[0] : '')} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-gold-light text-sm text-slate-700 transition-all appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjIwIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWxpbmUgcG9pbnRzPSI2IDkgMTIgMTUgMTggOSIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1em_1em]">
                                                {formCategories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                            </select>
                                        ) : (
                                            <input type="text" name="kategori" placeholder="Ketik kategori baru..." required className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-gold-light text-sm text-slate-700 transition-all" />
                                        )}
                                        <button type="button" onClick={() => setIsNewCategory(!isNewCategory)} className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${isNewCategory ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                            <i className={isNewCategory ? "fas fa-times" : "fas fa-plus"}></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Kondisi</label>
                                        <select name="kondisi" defaultValue={editingItem?.Kondisi || 'Baik'} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-gold-light text-sm text-slate-700 transition-all appearance-none cursor-pointer pr-8 bg-[url('data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBoZWlnaHQ9IjIwIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cG9seWxpbmUgcG9pbnRzPSI2IDkgMTIgMTUgMTggOSIvPjwvc3ZnPg==')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1em_1em]">
                                            <option value="Baik">Baik</option>
                                            <option value="Rusak">Rusak</option>
                                            <option value="Perlu Perbaikan">Perlu Perbaikan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Satuan</label>
                                        <input type="text" name="satuan" required defaultValue={editingItem?.Satuan || 'Pcs'} placeholder="Ex: Pcs/Unit" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-gold-light text-sm text-slate-700 transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Jumlah Stok</label>
                                        <input type="number" className="hide-spinners w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-gold-light text-sm text-slate-700 transition-all" name="jumlah" required defaultValue={editingItem?.Jumlah || 0} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Batas Warning</label>
                                        <input type="number" className="hide-spinners w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-gold-light text-sm text-slate-700 transition-all" name="minStok" required defaultValue={editingItem?.MinStok || 0} placeholder="Batas minimum" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Foto Barang Baru (Opsional)</label>
                                    <div className="text-[11px] text-slate-400 mb-2">Jika kosong, foto lama tetap digunakan.</div>
                                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                                        <i className="fas fa-cloud-upload-alt text-2xl text-blue-500 mb-2 group-hover:scale-110 transition-transform"></i>
                                        <span className={`text-xs text-center ${uploadFileName ? 'text-slate-800 font-bold' : 'text-slate-500'}`}>
                                            {uploadFileName ? uploadFileName : "Klik untuk memilih foto dari perangkat"}
                                        </span>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            accept="image/*" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setUploadFileName(file.name);
                                                else setUploadFileName('');
                                            }} 
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Keterangan / Catatan</label>
                                    <textarea name="keterangan" defaultValue={editingItem?.Keterangan} className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-gold-light text-sm text-slate-700 transition-all resize-none"></textarea>
                                </div>
                                
                                <div className="flex gap-3 mt-2">
                                    <button type="button" onClick={() => setShowModal(false)} disabled={uploading} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors">Batal</button>
                                    <button type="submit" disabled={uploading} className="flex-[2] py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                                        {uploading ? <><div className="modern-spinner w-4 h-4 border-2 border-t-white"></div> Menyimpan...</> : 'Simpan Barang'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            
            {/* --- MODAL FULL SCREEN IMAGE PREVIEW --- */}
            {previewImage && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 cursor-zoom-out p-4" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-5xl max-h-[90vh]">
                        <button className="absolute -top-12 right-0 text-white hover:text-red-500 text-2xl transition-colors"><i className="fas fa-times"></i></button>
                        <PrivateImage url={previewImage} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} />
                    </div>
                </div>
            )}
        </div>
    );
};
