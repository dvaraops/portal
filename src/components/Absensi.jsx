const { useState, useEffect } = React;

const Absensi = () => {
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [idCrew, setIdCrew] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const res = await dvaraFetch('getEventsForAttendance', {});
            if (res && res.status === 'success') {
                setEvents(res.data || []);
            } else {
                console.error("Gagal load event:", res);
                setEvents([]);
            }
        } catch (err) {
            console.error("Error:", err);
            setEvents([]);
        }
        setIsLoading(false);
    };

    const handleAbsen = async (tipe) => {
        const id = idCrew.trim().toUpperCase();
        
        if (!selectedEvent || !id) {
            Swal.fire('Oops!', 'Lengkapi data dulu ya!', 'warning');
            return;
        }

        setIsSubmitting(true);
        
        Swal.fire({
            title: 'Memproses Absensi...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const res = await dvaraFetch('submitAttendance', { event: selectedEvent, idCrew: id, type: tipe });
            
            if (res && res.status === 'success') {
                Swal.fire('Berhasil!', res.message, 'success');
                setIdCrew(''); // Reset ID
            } else {
                Swal.fire('Gagal', res?.message || 'Terjadi kesalahan', 'error');
            }
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
        
        setIsSubmitting(false);
    };

    return (
        <div style={{
            fontFamily: "'Montserrat', sans-serif",
            backgroundColor: '#f1f5f9',
            margin: 0,
            display: 'flex',
            justifyContent: 'center',
            minHeight: '100vh',
            alignItems: 'center'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '450px',
                background: 'white',
                padding: '32px 24px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: '16px',
                margin: '20px'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{ width: '80px', height: '80px', backgroundColor: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <i className="fas fa-fingerprint" style={{ fontSize: '40px', color: '#1e3a8a' }}></i>
                    </div>
                    <h2 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>Crew Attendance</h2>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>Silakan masukkan ID Crew Anda dan pilih event yang bertugas hari ini.</p>
                </div>

                <div style={{ width: '100%', marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Pilih Event</label>
                    <select 
                        value={selectedEvent} 
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        disabled={isLoading}
                        style={{
                            width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '12px',
                            fontFamily: "'Montserrat', sans-serif", fontSize: '14px', boxSizing: 'border-box',
                            outline: 'none', transition: 'border-color 0.3s', backgroundColor: isLoading ? '#f8fafc' : 'white', cursor: 'pointer'
                        }}
                    >
                        <option value="" disabled>-- Pilih Event --</option>
                        {isLoading ? (
                            <option value="" disabled>Memuat event...</option>
                        ) : events.length === 0 ? (
                            <option value="" disabled>Tidak ada event aktif</option>
                        ) : (
                            events.map((ev, idx) => (
                                <option key={idx} value={ev.displayName}>{ev.displayName}</option>
                            ))
                        )}
                    </select>
                </div>

                <div style={{ width: '100%', marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>ID Crew (Contoh: DVPT001)</label>
                    <input 
                        type="text" 
                        value={idCrew}
                        onChange={(e) => setIdCrew(e.target.value.toUpperCase())}
                        placeholder="Masukkan ID Crew Anda" 
                        maxLength="7"
                        style={{
                            width: '100%', padding: '14px', border: '2px solid #e2e8f0', borderRadius: '12px',
                            fontFamily: "'Montserrat', sans-serif", fontSize: '14px', boxSizing: 'border-box',
                            outline: 'none', transition: 'border-color 0.3s', textTransform: 'uppercase'
                        }}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
                    <button 
                        onClick={() => handleAbsen('Masuk')} 
                        disabled={isSubmitting}
                        style={{
                            padding: '16px', border: 'none', borderRadius: '12px', color: 'white',
                            fontWeight: '700', fontSize: '15px', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: '8px',
                            backgroundColor: '#10b981', transition: 'all 0.2s', opacity: isSubmitting ? 0.6 : 1, boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        <i className="fas fa-sign-in-alt"></i> Masuk
                    </button>
                    <button 
                        onClick={() => handleAbsen('Pulang')} 
                        disabled={isSubmitting}
                        style={{
                            padding: '16px', border: 'none', borderRadius: '12px', color: 'white',
                            fontWeight: '700', fontSize: '15px', cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', gap: '8px',
                            backgroundColor: '#1e293b', transition: 'all 0.2s', opacity: isSubmitting ? 0.6 : 1, boxShadow: '0 4px 6px rgba(30, 41, 59, 0.2)'
                        }}
                    >
                        <i className="fas fa-sign-out-alt"></i> Pulang
                    </button>
                </div>

                <div style={{ marginTop: '40px', fontSize: '12px', color: '#94a3b8' }}>
                    &copy; {new Date().getFullYear()} DVARA Operations
                </div>
            </div>
        </div>
    );
};
