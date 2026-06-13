const { useState, useEffect } = React;

const DashboardUI = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoadingDash, setIsLoadingDash] = useState(false);
    const [opsNote, setOpsNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        setIsLoadingDash(true);
        try {
            const res = await dvaraFetch('getDashboardData', {});
            
            // Format dasar agar tidak pernah undefined
            let finalData = {
                totalCrew: 0, roleStats: {}, totalEvents: 0, actionRequiredCount: 0, 
                alerts: { lowStock: [], maintenance: [] }
            };

            if (res && res.status === 'success' && res.data) {
                finalData = res.data;
                setOpsNote(res.data.opsNote || '');
            } else if (res && res.totalCrew !== undefined) {
                finalData = res;
                setOpsNote(res.opsNote || '');
            }
            
            // GARANSI: Paksa buat array jika backend tidak mereturn object alerts
            if (!finalData.alerts) {
                finalData.alerts = { lowStock: [], maintenance: [] };
            } else {
                if (!finalData.alerts.lowStock) finalData.alerts.lowStock = [];
                if (!finalData.alerts.maintenance) finalData.alerts.maintenance = [];
            }

            setDashboardData(finalData);

        } catch (error) {
            console.error("Gagal menarik data dashboard:", error);
            setDashboardData({
                totalCrew: 0, roleStats: {}, totalEvents: 0, actionRequiredCount: 0, 
                alerts: { lowStock: [], maintenance: [] }
            });
        }
        setIsLoadingDash(false);
    };

    const handleSaveNote = async () => {
        setIsSavingNote(true);
        const res = await dvaraFetch('saveOpsNote', { noteText: opsNote });
        setIsSavingNote(false);
        if (res && res.status === 'success') {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Note tersimpan!', showConfirmButton: false, timer: 1500 });
        } else {
            Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Gagal menyimpan note', text: res?.message || 'Pastikan backend sudah di-deploy ulang', showConfirmButton: false, timer: 3000 });
        }
    };

    // Render loading state (Mencegah render body sebelum data siap)
    if (isLoadingDash || !dashboardData) {
        return (
            <div className="animate-[fadeIn_0.3s_ease]">
                <div className="flex flex-col items-center justify-center p-20 text-slate-500">
                    <div className="modern-spinner w-8 h-8 border-2 border-t-maroon-primary mb-4"></div>
                    <div className="text-sm font-semibold">Memuat data operasional...</div>
                </div>
            </div>
        );
    }

    // Ekstrak data yang dijamin 100% aman
    const totalCrew = dashboardData.totalCrew || 0;
    const totalEvents = dashboardData.totalEvents || 0;
    const actionRequiredCount = dashboardData.actionRequiredCount || 0;
    const roleStats = dashboardData.roleStats || {};
    const lowStockList = dashboardData.alerts.lowStock;
    const maintenanceList = dashboardData.alerts.maintenance;

    return (
        <div className="animate-[fadeIn_0.3s_ease] font-sans pb-10">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                
                {/* CARD TOTAL CREW */}
                <div className="bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-xl shrink-0">
                        <i className="fas fa-users"></i>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 mb-1 tracking-wide">Total Crew Aktif</div>
                        <div className="text-2xl font-bold text-slate-800">{totalCrew}</div>
                    </div>
                </div>

                {/* CARD TOTAL EVENT */}
                <div className="bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl shrink-0">
                        <i className="fas fa-calendar-check"></i>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 mb-1 tracking-wide">Event Terlaksana</div>
                        <div className="text-2xl font-bold text-slate-800">{totalEvents}</div>
                    </div>
                </div>

                {/* CARD ACTION REQUIRED */}
                <div className="bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors duration-300 ${actionRequiredCount > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                        <i className="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-slate-500 mb-1 tracking-wide">Action Required</div>
                        <div className={`text-2xl font-bold ${actionRequiredCount > 0 ? 'text-red-500' : 'text-slate-800'}`}>{actionRequiredCount}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* KOLOM KIRI (7/12) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    
                    {/* OPS SHIFT NOTES */}
                    <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 relative group transition-all hover:shadow-sm">
                        <div className="flex items-center gap-2 mb-3 text-amber-700 font-bold text-sm tracking-wide">
                            <i className="fas fa-sticky-note"></i> Ops Shift Notes
                        </div>
                        <textarea 
                            value={opsNote} 
                            onChange={(e) => setOpsNote(e.target.value)}
                            placeholder="Tulis reminder, catatan loading, atau brief untuk tim..." 
                            className="w-full h-32 bg-transparent border-none outline-none resize-none text-sm text-amber-900 placeholder:text-amber-700/50"
                        ></textarea>
                        <div className="text-right mt-3">
                            <button onClick={handleSaveNote} disabled={isSavingNote} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ml-auto shadow-sm shadow-amber-500/20">
                                {isSavingNote ? <><div className="modern-spinner w-3 h-3 border-2 border-t-white"></div> Menyimpan...</> : 'Simpan Note'}
                            </button>
                        </div>
                    </div>

                    {/* SEBARAN ROLE CREW */}
                    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-6">
                        <h6 className="font-bold mb-5 flex items-center gap-2 text-slate-800">
                            <i className="fas fa-chart-bar text-maroon-primary"></i> Sebaran Role Crew
                        </h6>
                        {Object.keys(roleStats).length === 0 ? (
                            <div className="text-sm text-slate-400 p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">Belum ada data crew.</div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {Object.entries(roleStats).sort((a,b) => b[1]-a[1]).map(([role, count], idx) => {
                                    const percentage = (count / (totalCrew || 1)) * 100;
                                    return (
                                        <div key={idx}>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="font-semibold text-slate-500">{role}</span>
                                                <span className="font-bold text-slate-800">{count} org</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-maroon-primary transition-all duration-500 ease-out" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* KOLOM KANAN (5/12) */}
                <div className="lg:col-span-5">
                    <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-6 h-full flex flex-col">
                        <h6 className="font-bold mb-5 flex items-center gap-2 text-slate-800">
                            <i className="fas fa-bell text-amber-500"></i> Operational Alerts
                        </h6>
                        
                        {(lowStockList.length === 0 && maintenanceList.length === 0) ? (
                            <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
                                <i className="fas fa-check-circle text-4xl text-emerald-500 mb-3 drop-shadow-sm"></i>
                                <div className="font-bold text-slate-700">Semua Aman!</div>
                                <div className="text-xs text-slate-500 mt-1">Tidak ada peringatan stok atau kerusakan.</div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 overflow-y-auto pr-2" style={{ scrollbarWidth: 'none' }}>
                                {lowStockList.length > 0 && (
                                    <div>
                                        <div className="inline-block px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase tracking-wider mb-3">Stok Menipis</div>
                                        <div className="flex flex-col gap-2">
                                            {lowStockList.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-200 transition-colors">
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-700 leading-tight">{item.name}</div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">{item.id}</div>
                                                    </div>
                                                    <div className={`font-bold text-lg px-3 py-1 rounded-lg ${item.qty === 0 ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>{item.qty}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {maintenanceList.length > 0 && (
                                    <div className={lowStockList.length > 0 ? "mt-2" : ""}>
                                        <div className="inline-block px-2.5 py-1 bg-red-100 text-red-600 text-[10px] font-bold rounded-md uppercase tracking-wider mb-3">Perbaikan / Rusak</div>
                                        <div className="flex flex-col gap-2">
                                            {maintenanceList.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-red-200 transition-colors">
                                                    <div className="text-sm font-bold text-slate-700 pr-2">{item.name}</div>
                                                    <span className="px-2.5 py-1 text-[11px] font-bold bg-red-50 text-red-600 border border-red-100 rounded-md whitespace-nowrap">{item.cond}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};