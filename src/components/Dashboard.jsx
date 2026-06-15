const { useState, useEffect, useRef } = React;

const PrivateImage = ({ url, onClick, title, style }) => {
    const [imgData, setImgData] = useState(null);
    
    useEffect(() => {
        const fetchImage = async () => {
            if (!url) return;
            if (url.startsWith('data:')) { setImgData(url); return; }
            
            let fileId = '';
            if (url.includes('id=')) fileId = url.split('id=')[1].split('&')[0];
            else if (url.includes('/d/')) fileId = url.split('/d/')[1].split('/')[0];

            if (fileId) {
                const cachedImage = sessionStorage.getItem(`img_cache_${fileId}`);
                if (cachedImage) {
                    setImgData(cachedImage);
                    return; 
                }

                const res = await dvaraFetch('getPrivateImageBase64', { fileId });
                if (res && res.status !== 'error') {
                    setImgData(res.data);
                    try { sessionStorage.setItem(`img_cache_${fileId}`, res.data); } catch(e) {}
                } else {
                    setImgData('error');
                }
            } else { 
                setImgData(url); 
            }
        };
        fetchImage();
    }, [url]);

    if (!imgData) return <div style={{...style, display:'flex', justifyContent:'center', alignItems:'center', background:'#f8fafc'}}><i className="fas fa-spinner fa-spin" style={{color:'#cbd5e1'}}></i></div>;
    if (imgData === 'error') return <div style={{...style, display:'flex', justifyContent:'center', alignItems:'center', background:'#f8fafc'}}><i className="fas fa-user-slash" style={{color:'#cbd5e1'}}></i></div>;
    
    return <img src={imgData} onClick={onClick} title={title} style={style} />;
};

const Dashboard = ({ sessionData, updateSession, onLogout }) => {
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    
    // Topbar Search & FAB State
    const [topbarSearch, setTopbarSearch] = useState('');
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [fabAction, setFabAction] = useState(null);
    
    // State Dropdown Profil
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    // State Dropdown Notifikasi
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const notifRef = useRef(null);

    const [previewImage, setPreviewImage] = useState(null); 
    const [crewList, setCrewList] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // State Modal Edit Profil
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [profileForm, setProfileForm] = useState({ fullName: sessionData.fullName, role: sessionData.role });
    const [cropImage, setCropImage] = useState(null);
    const [cropperInstance, setCropperInstance] = useState(null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const imageRef = useRef(null);

    // === FITUR SWIPE GESTURE MOBILE ===
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);

    const handleTouchStart = (e) => {
        setTouchEndX(null);
        setTouchStartX(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEndX(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStartX || !touchEndX) return;
        const distance = touchStartX - touchEndX;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;
        
        // Geser ke kiri (tutup sidebar)
        if (isLeftSwipe && isSidebarOpen) {
            setIsSidebarOpen(false);
        }
        
        // Geser ke kanan (buka sidebar) - Syaratnya jari harus mulai dari ujung kiri layar (maksimal 40px)
        // Biar nggak bentrok sama geser tabel atau konten di dalam halaman
        if (isRightSwipe && !isSidebarOpen && touchStartX < 40) {
            setIsSidebarOpen(true);
        }
    };
    // ===================================

    // Tutup dropdown kalau klik area luar
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (cropImage && imageRef.current) {
            if (cropperInstance) cropperInstance.destroy();
            const cropper = new window.Cropper(imageRef.current, { aspectRatio: 1, viewMode: 1, autoCropArea: 1 });
            setCropperInstance(cropper);
        }
    }, [cropImage]);

    useEffect(() => {
        if (activeMenu === 'crew' || activeMenu === 'history_event') fetchCrewData();
        // Tutup sidebar otomatis tiap kali menu diklik (khusus mobile)
        setIsSidebarOpen(false); 
        setTopbarSearch('');
        setIsFabOpen(false);
    }, [activeMenu]);

    const fetchCrewData = async () => {
        setIsLoadingData(true);
        const res = await dvaraFetch('getCrewList', {});
        setIsLoadingData(false);
        if (res.status === 'success' && Array.isArray(res.data)) {
            setCrewList(res.data);
        } else {
            setCrewList([]);
        }
    };

    const handleAvatarSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setCropImage(event.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsUpdatingProfile(true);
        let base64data = null;
        if (cropperInstance) base64data = cropperInstance.getCroppedCanvas({ width: 400, height: 400 }).toDataURL('image/jpeg').split(',')[1];
        
        const payload = { username: sessionData.username, fullName: profileForm.fullName, role: profileForm.role, avatarBase64: base64data };
        
        const res = await dvaraFetch('updateProfileData', payload);
        setIsUpdatingProfile(false);
        
        if(res.status === 'success') {
            Swal.fire('Berhasil!', res.message, 'success');
            updateSession({ fullName: res.fullName, role: res.role, avatar: res.avatar || sessionData.avatar });
            setShowSettingsModal(false); setCropImage(null); if (cropperInstance) cropperInstance.destroy();
        } else {
            Swal.fire('Gagal', res.message, 'error');
        }
    };

    const toggleSidebar = () => { setIsSidebarCollapsed(!isSidebarCollapsed); };

    const getSearchPlaceholder = () => {
        if(activeMenu === 'dashboard') return "Search menu, event, crew...";
        if(activeMenu === 'crew') return "Cari nama crew, role, atau ID...";
        if(activeMenu === 'loading') return "Cari nama surat...";
        if(activeMenu === 'inventory') return "Cari nama barang atau ID inventory...";
        if(activeMenu === 'history_event') return "Cari nama event...";
        return "Search...";
    };

    const getFabConfig = () => {
        switch(activeMenu) {
            case 'history_event': return { actions: [{ label: 'Tambah Event Baru', icon: 'fa-plus', handler: () => setFabAction('add') }] };
            case 'inventory': return { actions: [{ label: 'Tambah Item', icon: 'fa-box-open', handler: () => setFabAction('add') }] };
            case 'loading': return { actions: [{ label: 'Buat Surat Baru', icon: 'fa-file-pdf', handler: () => setFabAction('add') }] };
            case 'crew': return { actions: [
                { label: 'Tambah Crew', icon: 'fa-user-plus', handler: () => setFabAction('add') },
                { label: 'Kirim ID Crew', icon: 'fa-whatsapp fab', handler: () => setFabAction('secondary') }
            ]};
            default: return null;
        }
    };
    const fabConfig = getFabConfig();
    const clearFabAction = () => setFabAction(null);

    return (
        // Event sentuhan di-binding ke layout utama
        <div className="dashboard-layout" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            
            <div className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
            
            {/* SIDEBAR */}
            <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'open' : ''}`}>
                
                {/* HEADER SIDEBAR: LOGO + JUDUL + TOMBOL HOVER */}
                <div className="sidebar-header" title={isSidebarCollapsed ? "Buka Sidebar" : "Tutup Sidebar"} onClick={toggleSidebar}>
                    <img src="./src/logo/dvara-logo.png" className="sidebar-logo" alt="DVARA Logo" />
                    <span className="sidebar-title">DVARA PORTAL</span>
                    
                    {/* Tombol Panah Hover (Animasi ngikut) */}
                    <div className="sidebar-toggle-btn">
                        <i className={`fas ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: '6px', overflowY: 'auto', scrollbarWidth: 'none' }}>
                    {['dashboard', 'crew', 'loading', 'inventory', 'history_event', 'approval'].map((menu) => (
                        <button key={menu} className={`nav-btn ${activeMenu === menu ? 'active' : ''}`} onClick={() => setActiveMenu(menu)}>
                            <i className={`fas ${menu === 'dashboard' ? 'fa-chart-pie' : menu === 'crew' ? 'fa-users' : menu === 'loading' ? 'fa-file-pdf' : menu === 'inventory' ? 'fa-boxes' : menu === 'history_event' ? 'fa-calendar-check' : 'fa-check-double'}`}></i> 
                            <span className="sidebar-text">
                                {menu === 'dashboard' ? 'Dashboard' : menu === 'crew' ? 'Data Crew Part-time' : menu === 'loading' ? 'Loading Form' : menu === 'inventory' ? 'Ops Inventory' : menu === 'history_event' ? 'History Event Log' : 'OT Approval'}
                            </span>
                        </button>
                    ))}
                </div>

            </div>

            {/* AREA KANAN */}
            <div className="main-content-wrapper">
                
                {/* TOP BAR - WHITE THEME */}
                <div className="top-bar">
                    <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        
                        {/* TOMBOL HAMBURGER MOBILE */}
                        <button className="md:hidden z-[1000] relative bg-transparent border-none text-base text-slate-800 cursor-pointer pr-1 flex items-center" onClick={() => setIsSidebarOpen(true)}>
                            <i className="fas fa-bars"></i>
                        </button>
                        
                        <div>
                            <h2 className="topbar-title">
                                {activeMenu === 'dashboard' ? 'Dashboard Overview' : 
                                 activeMenu === 'crew' ? 'Data Crew Part-time' : 
                                 activeMenu === 'loading' ? 'Loading Form' : 
                                 activeMenu === 'inventory' ? 'Operational Inventory' : 
                                 activeMenu === 'history_event' ? 'History Event Log' : 
                                 activeMenu === 'settings' ? 'Settings & Preferences' : 'Overtime Approval'}
                            </h2>
                            <p className="topbar-subtitle">
                                {activeMenu === 'dashboard' ? 'Ringkasan operasional DVARA hari ini.' : 
                                 activeMenu === 'crew' ? 'Klik tombol "Kirim ID" untuk sebar absen via WA.' : 
                                 activeMenu === 'loading' ? 'Daftar surat ijin keluar/masuk barang yang telah dibuat.' : 
                                 activeMenu === 'inventory' ? 'Manajemen stok inventaris DVARA.' : 
                                 activeMenu === 'history_event' ? 'Catat event, atur lokasi GPS, dan bagi crew.' : 
                                 activeMenu === 'settings' ? 'Konfigurasi akun dan sistem.' : 'Setujui atau tolak pengajuan lembur crew.'}
                            </p>
                        </div>
                    </div>

                    <div className="topbar-center hidden md:block">
                        <div className="topbar-search">
                            <i className="fas fa-search" />
                            <input 
                                placeholder={getSearchPlaceholder()}
                                value={topbarSearch}
                                onChange={e => setTopbarSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="top-bar-actions">
                        {/* Notifikasi */}
                        <div style={{ position: 'relative' }} ref={notifRef}>
                            <div className="top-bar-icon" title="Notifications" onClick={() => setShowNotifDropdown(!showNotifDropdown)}>
                                <i className="fas fa-bell"></i>
                                <span style={{ position: 'absolute', top: '8px', right: '10px', width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', border: '1.5px solid white' }}></span>
                            </div>

                            {/* DROPDOWN NOTIFIKASI */}
                            {showNotifDropdown && (
                                <div className="profile-dropdown-menu" style={{ width: '320px', padding: 0 }}>
                                    <div className="dropdown-header" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1e293b' }}>Notifikasi</h4>
                                        <span style={{ fontSize: '12px', color: '#3b82f6', cursor: 'pointer', fontWeight: '500' }}>Tandai sudah dibaca</span>
                                    </div>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer', backgroundColor: '#f8fafc' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                <i className="fas fa-pencil-alt"></i>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '4px', lineHeight: '1.4' }}><strong>Sistem</strong> memperbarui data profil Anda.</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Baru saja</div>
                                            </div>
                                        </div>
                                        <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dcfce7', color: '#16a34a', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                <i className="fas fa-file-pdf"></i>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '4px', lineHeight: '1.4' }}><strong>Admin</strong> membuat Surat Loading baru untuk vendor <strong>PT Contoh</strong>.</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>2 jam yang lalu</div>
                                            </div>
                                        </div>
                                        <div style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start', cursor: 'pointer' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                                <i className="fas fa-user-tag"></i>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '4px', lineHeight: '1.4' }}><strong>Bama</strong> menyebut Anda dalam sebuah komentar tiket.</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Kemarin</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #f1f5f9', backgroundColor: '#f8fafc', cursor: 'pointer', fontSize: '13px', color: '#3b82f6', fontWeight: '500' }}>
                                        Lihat Semua Notifikasi
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile Area */}
                        <div style={{ position: 'relative' }} ref={dropdownRef}>
                            <div className="top-bar-profile" onClick={() => setShowDropdown(!showDropdown)}>
                            {sessionData.avatar ? (
                                <PrivateImage url={sessionData.avatar} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,0,0,0.1)' }} />
                            ) : (
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.1)', color: '#1e293b', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                                    {sessionData.fullName ? sessionData.fullName.charAt(0).toUpperCase() : 'U'}
                                </div>
                            )}
                            <i className="fas fa-chevron-down" style={{ fontSize: '12px', opacity: 0.8, marginRight: '4px' }}></i>
                        </div>

                        {/* DROPDOWN KOTAK PROFIL */}
                        {showDropdown && (
                            <div className="profile-dropdown-menu">
                                <div className="dropdown-header">
                                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{sessionData.username}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{sessionData.email || 'No email registered'}</div>
                                </div>
                                <div style={{ padding: '8px 0' }}>
                                    <button className="dropdown-item-btn" onClick={() => { setShowDropdown(false); setShowSettingsModal(true); }}>
                                        <i className="fas fa-user-edit" style={{ width: '20px', textAlign: 'center', position: 'relative', left: '2px'}}></i> Edit profile
                                    </button>
                                    <button className="dropdown-item-btn" onClick={() => {setShowDropdown(false); setActiveMenu('settings'); }}>
                                        <i className="fas fa-cog" style={{ width: '20px', textAlign: 'center' }}></i> Settings
                                    </button>
                                    <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '8px 0' }}></div>
                                    <button className="dropdown-item-btn" onClick={onLogout} style={{ color: '#ef4444' }}>
                                        <i className="fas fa-sign-out-alt" style={{ width: '20px', textAlign: 'center' }}></i> Log out
                                    </button>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </div>
                
                {/* AREA KONTEN (Tampilan Overview) */}
                <div className="content-scroll-area">
                    {activeMenu === 'dashboard' && <DashboardUI />}
                    {activeMenu === 'crew' && <CrewForm crewList={crewList} isLoadingData={isLoadingData} fetchCrewData={fetchCrewData} setPreviewImage={setPreviewImage} searchQuery={topbarSearch} fabAction={fabAction} clearFabAction={clearFabAction} />}
                    {activeMenu === 'loading' && <LoadingForm sessionData={sessionData} searchQuery={topbarSearch} fabAction={fabAction} clearFabAction={clearFabAction} />}
                    {activeMenu === 'inventory' && <InventoryForm searchQuery={topbarSearch} fabAction={fabAction} clearFabAction={clearFabAction} />}
                    {activeMenu === 'history_event' && <HistoryEventForm crewList={crewList} fetchCrewData={fetchCrewData} searchQuery={topbarSearch} fabAction={fabAction} clearFabAction={clearFabAction} />}
                    {activeMenu === 'approval' && <ApprovalForm />}
                    {activeMenu === 'settings' && <Settings sessionData={sessionData} updateSession={updateSession} />}
                </div>

                {/* MODAL POPUP EDIT PROFILE */}
                {showSettingsModal && (
                    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans animate-[fadeIn_0.2s_ease-out]">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] max-h-[90vh] flex flex-col relative animate-[settingsSlideIn_0.3s_ease-out]">
                            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-2xl shrink-0">
                                <h3 className="m-0 text-maroon-primary font-bold font-heading text-lg">Edit Profile</h3>
                                <button type="button" onClick={() => { setShowSettingsModal(false); setCropImage(null); if(cropperInstance) cropperInstance.destroy(); }} className="text-slate-400 hover:text-red-500 transition-colors text-xl">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                <form onSubmit={handleSaveProfile}>
                                    <div className="flex flex-col items-center mb-6">
                                        <label className="cursor-pointer relative">
                                            {sessionData.avatar && !cropImage ? (
                                                <PrivateImage url={sessionData.avatar} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #cbd5e1' }} />
                                            ) : (
                                                <div className="w-[100px] h-[100px] rounded-full bg-slate-50 flex justify-center items-center border-3 border-dashed border-slate-300">
                                                    <i className="fas fa-camera text-2xl text-slate-500"></i>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                                        </label>
                                    </div>
                                    {cropImage && (
                                        <div className="mb-6 max-w-full max-h-[300px]">
                                            <img ref={imageRef} src={cropImage} className="max-w-full block" />
                                        </div>
                                    )}
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Full Name</label>
                                        <input type="text" required value={profileForm.fullName} onChange={(e) => setProfileForm({...profileForm, fullName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-gold-light focus:ring-1 focus:ring-gold-light transition-all" />
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Role</label>
                                        <input type="text" required value={profileForm.role} onChange={(e) => setProfileForm({...profileForm, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-gold-light focus:ring-1 focus:ring-gold-light transition-all" />
                                    </div>
                                    <button type="submit" disabled={isUpdatingProfile} className="w-full py-3 bg-maroon-primary hover:bg-maroon-dark text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center gap-2">
                                        {isUpdatingProfile ? <><div className="modern-spinner w-4 h-4 border-2 border-t-white"></div> Menyimpan...</> : 'Simpan Profil'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* FAB (Floating Action Button) */}
                {fabConfig && (
                    <div className="fab-container">
                        {isFabOpen && <div className="fab-overlay" onClick={() => setIsFabOpen(false)} />}
                        <div className={`fab-menu ${isFabOpen ? 'open' : ''}`}>
                            {fabConfig.actions.map((action, idx) => (
                                <button key={idx} className="fab-menu-item" onClick={() => { action.handler(); setIsFabOpen(false); }}>
                                    <span className="fab-menu-label">{action.label}</span>
                                    <span className="fab-menu-icon"><i className={action.icon} /></span>
                                </button>
                            ))}
                        </div>
                        <button className="fab-main" onClick={() => setIsFabOpen(!isFabOpen)}>
                            <i className={`fas ${isFabOpen ? 'fa-times' : 'fa-plus'}`} />
                        </button>
                    </div>
                )}


            </div>
        </div>
    );
};