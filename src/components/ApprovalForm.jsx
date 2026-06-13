const { useState, useEffect } = React;

const ApprovalForm = () => {
    const [pendingList, setPendingList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => { fetchPending(); }, []);

    const fetchPending = async () => {
        setIsLoading(true);
        try {
            const res = await dvaraFetch('getPendingOvertime', {});
            if (res && res.status === 'success') {
                setPendingList(res.data || []);
            } else {
                setPendingList([]);
            }
        } catch (err) {
            setPendingList([]);
        }
        setIsLoading(false);
    };

    const handleAction = (row, status, nama) => {
        const actionText = status === 'APPROVED' ? 'Setujui' : 'Tolak';
        const color = status === 'APPROVED' ? '#10b981' : '#ef4444';
        
        Swal.fire({
            title: `${actionText} Lembur?`,
            text: `Anda akan me-${actionText.toLowerCase()} lemburan untuk ${nama}.`,
            icon: 'question',
            showCancelButton: true, confirmButtonColor: color, cancelButtonColor: '#cbd5e1', confirmButtonText: `Ya, ${actionText}`
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                try {
                    const res = await dvaraFetch('updateOvertimeStatus', { row, status });
                    if (res && res.status === 'success') {
                        Swal.fire('Berhasil!', res.message, 'success');
                        fetchPending(); // Refresh list
                    } else {
                        Swal.fire('Gagal', res?.message || 'Error update overtime', 'error');
                    }
                } catch(err) {
                    Swal.fire('Error', err.message, 'error');
                }
            }
        });
    };

    return (
        <div className="animate-[fadeIn_0.3s_ease] font-sans pb-10">

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-[13px] font-bold text-slate-500">INFO EVENT</th>
                                <th className="p-4 text-[13px] font-bold text-slate-500">NAMA CREW</th>
                                <th className="p-4 text-[13px] font-bold text-slate-500 text-center">JAM TAP OUT</th>
                                <th className="p-4 text-[13px] font-bold text-slate-500 text-center">JUMLAH LEMBUR</th>
                                <th className="p-4 text-[13px] font-bold text-slate-500 text-center">AKSI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="p-10 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="modern-spinner w-8 h-8 border-2 border-t-maroon-primary"></div>
                                            <div className="text-sm font-semibold">Memuat data...</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : pendingList.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-10 py-16 text-center text-slate-400">
                                        <i className="fas fa-check-circle text-5xl text-emerald-500 mb-4 opacity-80 shadow-emerald-500/20 drop-shadow-md"></i>
                                        <div className="text-sm font-semibold text-slate-500">Tidak ada lemburan yang pending.</div>
                                    </td>
                                </tr>
                            ) : (
                                pendingList.map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800 text-sm">{item.eventName}</div>
                                            <div className="text-xs text-slate-500 mt-1 font-medium">{item.sesiName} | {item.eventDate}</div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-800 text-sm">{item.fullName}</td>
                                        <td className="p-4 text-center text-slate-600 text-sm font-medium">{item.tapOut}</td>
                                        <td className="p-4 text-center">
                                            <span className="inline-block bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full font-bold text-xs shadow-sm border border-amber-100">{item.otHours} Jam</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => handleAction(item.row, 'APPROVED', item.fullName)} className="w-10 h-10 bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-colors shadow-sm flex items-center justify-center" title="Approve">
                                                    <i className="fas fa-check"></i>
                                                </button>
                                                <button onClick={() => handleAction(item.row, 'REJECTED', item.fullName)} className="w-10 h-10 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors shadow-sm flex items-center justify-center" title="Reject">
                                                    <i className="fas fa-times"></i>
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
        </div>
    );

};
