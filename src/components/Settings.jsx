const { useState, useEffect } = React;

const Settings = ({ sessionData, updateSession, searchQuery = "" }) => {
    const [activeView, setActiveView] = useState("main"); // 'main', 'account', 'notifications', 'appearance', 'help', 'about'

    const menuItems = [
        { id: "account", title: "Account", icon: "fa-user", subtitle: "Username, email, role, date created" },
        { id: "notifications", title: "Notifications", icon: "fa-bell", subtitle: "Configure app alerts and updates" },
        { id: "appearance", title: "Appearance", icon: "fa-eye", subtitle: "Theme and visual preferences" },
        { id: "help", title: "Help and Support", icon: "fa-headphones", subtitle: "FAQ and contact support" },
        { id: "about", title: "About", icon: "fa-question-circle", subtitle: "App version and creator info" }
    ];

    const filteredMenu = menuItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCreatedDate = (isoDateString) => {
        if (!isoDateString) return "Unknown Date";
        const dateObj = new Date(isoDateString);
        
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        
        const offsetHours = -(dateObj.getTimezoneOffset() / 60);
        let tzLabel = "WIB";
        if (offsetHours === 8) tzLabel = "WITA";
        else if (offsetHours === 9) tzLabel = "WIT";
        else if (offsetHours !== 7) tzLabel = `GMT${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
        
        return `${day} ${month} ${year} ${hours}:${minutes} ${tzLabel}`;
    };

    return (
        <div className="animate-[fadeIn_0.3s_ease] flex flex-col h-full font-sans">
            


            <div className="flex flex-1 gap-6 relative">
                
                {/* Menu List Area (Shrinks to icon-only if activeView !== 'main') */}
                <div className={`flex flex-col transition-all duration-300 ease-in-out ${activeView === 'main' ? 'w-full' : 'w-[72px] shrink-0'}`}>
                    {filteredMenu.length > 0 ? filteredMenu.map((item, index) => (
                        <div key={item.id}>
                            <div 
                                onClick={() => setActiveView(item.id)}
                                className={`flex items-center px-3 py-4 cursor-pointer transition-colors rounded-xl border ${
                                    activeView === item.id 
                                        ? 'bg-slate-100 border-slate-200 justify-center' 
                                        : 'bg-transparent border-transparent hover:bg-slate-50'
                                }`}
                                title={item.title}
                            >
                                <div className={`w-10 h-10 rounded-full flex justify-center items-center shrink-0 transition-all ${
                                    activeView === item.id ? 'bg-maroon-primary text-white shadow-sm' : 'bg-slate-100 text-maroon-primary'
                                } ${activeView === 'main' ? 'mr-4' : ''}`}>
                                    <i className={`fas ${item.icon}`}></i>
                                </div>
                                
                                {activeView === 'main' && (
                                    <>
                                        <div className="flex-1 overflow-hidden pr-2">
                                            <div className="text-[15px] font-bold text-slate-800 truncate">{item.title}</div>
                                            <div className="text-[13px] text-slate-500 mt-0.5 truncate">{item.subtitle}</div>
                                        </div>
                                        <div className="text-slate-400 text-sm pl-2">
                                            <i className="fas fa-chevron-right"></i>
                                        </div>
                                    </>
                                )}
                            </div>
                            {index < filteredMenu.length - 1 && activeView === 'main' && (
                                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                            )}
                        </div>
                    )) : (
                        <div className="text-center py-10 px-5 text-slate-400">
                            <i className="fas fa-search text-3xl mb-3 opacity-50"></i>
                            <div className="text-sm">No settings found matching "{searchQuery}"</div>
                        </div>
                    )}
                </div>

                {/* Subsetting Area (Slides in from right) */}
                {activeView !== 'main' && (
                    <div className="animate-[settingsSlideIn_0.2s_ease-out] flex-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-y-auto">
                        
                        {activeView === "account" && (
                            <div>
                                <div className="flex items-center mb-6 gap-3">
                                    <button onClick={() => setActiveView('main')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-maroon-primary hover:text-white transition-colors flex items-center justify-center shadow-sm">
                                        <i className="fas fa-arrow-left text-sm"></i>
                                    </button>
                                    <h4 className="m-0 text-slate-800 font-bold text-lg">Account Settings</h4>
                                </div>
                                
                                <div className="flex flex-col gap-5">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-bold text-slate-600">Username</label>
                                        <input type="text" value={sessionData.username} disabled className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-medium w-full" />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-bold text-slate-600 flex items-center">
                                            Email <i className="fas fa-check-circle text-emerald-500 ml-1.5" title="Verified"></i>
                                        </label>
                                        <div className="flex gap-2">
                                            <input type="email" value={sessionData.email || ""} disabled className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-medium flex-1" />
                                            <button className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm whitespace-nowrap" onClick={() => Swal.fire('Info', 'Fitur ganti email dengan verifikasi OTP sedang dalam pengembangan.', 'info')}>
                                                Ganti Email
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-bold text-slate-600">Role / Tag</label>
                                        <input type="text" value={sessionData.role} disabled className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-medium w-full" />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-bold text-slate-600">Created Date</label>
                                        <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm font-medium flex items-center">
                                            <i className="fas fa-calendar-alt mr-2 text-slate-400"></i>
                                            {getCreatedDate(sessionData.creationDate)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeView === "notifications" && (
                            <div>
                                <div className="flex items-center mb-6 gap-3">
                                    <button onClick={() => setActiveView('main')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-maroon-primary hover:text-white transition-colors flex items-center justify-center shadow-sm">
                                        <i className="fas fa-arrow-left text-sm"></i>
                                    </button>
                                    <h4 className="m-0 text-slate-800 font-bold text-lg">Notifications</h4>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                                    <i className="fas fa-tools text-3xl text-slate-300 mb-3"></i>
                                    <p className="text-slate-500 text-sm m-0">Pengaturan notifikasi sedang dalam tahap pengembangan.</p>
                                </div>
                            </div>
                        )}

                        {activeView === "appearance" && (
                            <div>
                                <div className="flex items-center mb-6 gap-3">
                                    <button onClick={() => setActiveView('main')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-maroon-primary hover:text-white transition-colors flex items-center justify-center shadow-sm">
                                        <i className="fas fa-arrow-left text-sm"></i>
                                    </button>
                                    <h4 className="m-0 text-slate-800 font-bold text-lg">Appearance</h4>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                                    <i className="fas fa-paint-brush text-3xl text-slate-300 mb-3"></i>
                                    <p className="text-slate-500 text-sm m-0">Pilihan tema (Dark/Light mode) segera hadir.</p>
                                </div>
                            </div>
                        )}

                        {activeView === "help" && (
                            <div>
                                <div className="flex items-center mb-6 gap-3">
                                    <button onClick={() => setActiveView('main')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-maroon-primary hover:text-white transition-colors flex items-center justify-center shadow-sm">
                                        <i className="fas fa-arrow-left text-sm"></i>
                                    </button>
                                    <h4 className="m-0 text-slate-800 font-bold text-lg">Help and Support</h4>
                                </div>
                                
                                <div className="mb-6 flex flex-col gap-3">
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors shadow-sm">
                                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                                            <div className="font-bold text-sm text-slate-800">Bagaimana cara mereset kata sandi?</div>
                                        </div>
                                        <div className="p-4 bg-white text-sm text-slate-600">
                                            Gunakan fitur Lupa Kata Sandi di halaman login untuk menerima OTP ke email Anda.
                                        </div>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors shadow-sm">
                                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                                            <div className="font-bold text-sm text-slate-800">Kenapa status lembur saya ditolak?</div>
                                        </div>
                                        <div className="p-4 bg-white text-sm text-slate-600">
                                            Hubungi Admin atau Operational Executive terkait untuk detail.
                                        </div>
                                    </div>
                                </div>

                                <a 
                                    href="mailto:operationaldvara@gmail.com?cc=bama.dvara@gmail.com&subject=Help:%20&body=" 
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-maroon-primary hover:bg-maroon-dark text-white font-bold rounded-xl text-sm transition-all shadow-md active:scale-95"
                                >
                                    <i className="fas fa-envelope"></i> Get Support by Email
                                </a>
                            </div>
                        )}

                        {activeView === "about" && (
                            <div className="text-center flex flex-col items-center">
                                <div className="flex items-center mb-8 gap-3 self-start">
                                    <button onClick={() => setActiveView('main')} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-maroon-primary hover:text-white transition-colors flex items-center justify-center shadow-sm">
                                        <i className="fas fa-arrow-left text-sm"></i>
                                    </button>
                                    <h4 className="m-0 text-slate-800 font-bold text-lg">About</h4>
                                </div>

                                <div className="flex flex-col items-center gap-2 mb-8">
                                    <img src="./src/logo/bama.jpg" alt="Bama" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mb-2" />
                                    <h5 className="m-0 font-bold text-slate-800 tracking-wide text-lg">BAMA SEPTITUTA</h5>
                                    <div className="text-slate-500 font-medium text-sm bg-slate-100 px-3 py-1 rounded-full">Operational DVARA</div>
                                </div>

                                <div className="flex justify-center gap-4 mb-8">
                                    <a href="https://instagram.com/cadstev" target="_blank" className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-pink-500 hover:text-white flex items-center justify-center text-lg transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
                                        <i className="fab fa-instagram"></i>
                                    </a>
                                    <a href="https://id.linkedin.com/in/bama-septituta" target="_blank" className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white flex items-center justify-center text-lg transition-all shadow-sm hover:shadow-md hover:-translate-y-1">
                                        <i className="fab fa-linkedin-in"></i>
                                    </a>
                                </div>

                                <div className="text-slate-400 text-xs">
                                    <p className="mb-1 font-medium">Vibe Coding with Antigravity, Gemini</p>
                                    <p className="m-0">Created with love ❤️</p>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
};
