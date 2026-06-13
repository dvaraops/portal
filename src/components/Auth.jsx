// FUNGSI LOGIC PASSWORD (Bisa dipanggil buat Register & Reset)
const checkPasswordStrength = (pw) => {
    if (!pw) return { len: false, up: false, low: false, num: false, spec: false, isMedium: false, isStrong: false };
    
    const len = pw.length >= 6;
    const up = /[A-Z]/.test(pw);
    const low = /[a-z]/.test(pw);
    const num = /[0-9]/.test(pw);
    const spec = /[^A-Za-z0-9]/.test(pw);

    const isMedium = len && up && low && num;
    const isStrong = isMedium && spec;

    return { len, up, low, num, spec, isMedium, isStrong };
};

const Auth = ({ onLoginSuccess }) => {
    const { useState, useEffect } = React;
    
    const [activeTab, setActiveTab] = useState('login');
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState('email');
    const [pendingEmail, setPendingEmail] = useState('');
    
    const [loginLoading, setLoginLoading] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [capsLockActive, setCapsLockActive] = useState(false);

    // STATE REGISTER & RESET (Cukup nyimpen value aja)
    const [regPassword, setRegPassword] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);

    // Panggil 1 Fungsi Logic buat 2 State
    const regStrength = checkPasswordStrength(regPassword);
    const resetStrength = checkPasswordStrength(resetPassword);

    useEffect(() => {
        const checkCapsLock = (e) => {
            if (e.getModifierState) setCapsLockActive(e.getModifierState('CapsLock'));
        };
        window.addEventListener('keydown', checkCapsLock);
        window.addEventListener('keyup', checkCapsLock);
        return () => {
            window.removeEventListener('keydown', checkCapsLock);
            window.removeEventListener('keyup', checkCapsLock);
        };
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        const username = e.target.username.value.trim();
        const password = e.target.password.value;

        if (!username || !password) return;
        setLoginLoading(true);

        const response = await dvaraFetch('login', { username, password });
        setLoginLoading(false);
        
        if (response.status === 'success') {
            Swal.fire({
                icon: 'success', title: 'Login Berhasil!', text: 'Membuka Dashboard...', timer: 1500, showConfirmButton: false
            }).then(() => {
                onLoginSuccess({
                    username: response.username,
                    fullName: response.fullName || username,
                    role: response.role,
                    email: response.email,
                    creationDate: response.creationDate,
                    avatar: response.avatar
                });
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Login Gagal', text: response.message || 'Kredensial salah.' });
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const username = e.target.username.value.trim();
        const fullName = e.target.fullName.value.trim(); 
        const email = e.target.email.value.trim();
        const password = regPassword;
        const confirmPassword = e.target.confirmPassword.value;

        if (!regStrength.isMedium) {
            return Swal.fire({ icon: 'error', title: 'Password Lemah', text: 'Password harus memenuhi kriteria Sedang (Medium) untuk keamanan.' });
        }

        if (password !== confirmPassword) {
            return Swal.fire({ icon: 'error', title: 'Gagal', text: 'Konfirmasi password tidak cocok!' });
        }

        setRegisterLoading(true);
        const response = await dvaraFetch('signup', { username, fullName, email, password });
        setRegisterLoading(false);

        if (response.status === 'success') {
            Swal.fire({ icon: 'success', title: 'Registrasi Berhasil', text: response.message });
            e.target.reset();
            setRegPassword('');
            setActiveTab('login');
        } else {
            Swal.fire({ icon: 'error', title: 'Registrasi Gagal', text: response.message });
        }
    };

    const handleForgotSend = async (e) => {
        e.preventDefault();
        const email = e.target.email.value.trim();
        if (!email) return;

        setForgotLoading(true);
        const response = await dvaraFetch('forgotPassword', { email });
        setForgotLoading(false);

        if (response.status === 'success') {
            setPendingEmail(email);
            Swal.fire({ icon: 'success', title: 'OTP Dikirim!', text: response.message });
            setForgotStep('otp');
        } else {
            Swal.fire({ icon: 'error', title: 'Gagal', text: response.message });
        }
    };

    const handleForgotReset = async (e) => {
        e.preventDefault();
        const code = e.target.code.value.trim();
        const newPassword = resetPassword;
        const confirmPassword = e.target.confirmPassword.value;

        if (!resetStrength.isMedium) {
            return Swal.fire({ icon: 'error', title: 'Password Lemah', text: 'Password harus memenuhi kriteria Sedang (Medium) untuk keamanan.' });
        }

        if (newPassword !== confirmPassword) {
            return Swal.fire({ icon: 'error', title: 'Gagal', text: 'Konfirmasi password baru tidak cocok!' });
        }

        setResetLoading(true);
        const otpResponse = await dvaraFetch('verifyOtp', { email: pendingEmail, otp: code });
        
        if (otpResponse.status === 'success') {
            const resetResponse = await dvaraFetch('resetPassword', { email: pendingEmail, newPassword, confirmPassword });
            setResetLoading(false);
            
            if (resetResponse.status === 'success') {
                Swal.fire({ icon: 'success', title: 'Berhasil!', text: resetResponse.message || 'Sandi telah diubah.' });
                setShowForgotModal(false);
                setForgotStep('email');
                setResetPassword('');
            } else {
                Swal.fire({ icon: 'error', title: 'Gagal', text: resetResponse.message });
            }
        } else {
            setResetLoading(false);
            Swal.fire({ icon: 'error', title: 'OTP Salah', text: otpResponse.message });
        }
    };

    return (
        <div className="w-full h-screen overflow-hidden relative" style={{ background: "linear-gradient(rgba(51, 15, 25, 0.75), rgba(51, 15, 25, 0.85)), url('./src/logo/bg.jpeg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            <div className="flex w-full h-full relative z-10">
                
                {/* --- PANEL KIRI (DESKTOP) --- */}
                <div className="hidden lg:flex flex-col w-5/12 relative p-12 text-center text-white h-full justify-center items-center">
                    <div className="flex flex-col items-center w-full ml-12">
                        <img src="./src/logo/dvara-white-logo.png" alt="DVARA Logo" className="mb-8 w-[420px] max-w-full drop-shadow-md" />
                        <h2 className="font-bold m-0 text-3xl font-heading tracking-wide drop-shadow-md">DVARA Operations</h2>
                        <p className="text-white/70 mt-2 drop-shadow-sm font-sans">Internal Management Platform</p>
                    </div>
                </div>

                {/* --- PANEL KANAN (FORM CARD) --- */}
                <div className="flex flex-col w-full lg:w-7/12 justify-center items-center h-full p-4 lg:p-12 relative bg-transparent">
                    
                    {/* Header Logo Khusus Mobile */}
                    <div className="text-center mb-8 lg:hidden w-full z-10">
                        <img src="./src/logo/dvara-white-logo.png" alt="DVARA Logo" className="w-40 drop-shadow-md mb-2 mx-auto" />
                        <h3 className="font-bold text-white m-0 text-2xl tracking-wide drop-shadow-md font-heading">DVARA Operations</h3>
                        <p className="text-white/70 mt-1 m-0 text-sm drop-shadow-sm font-sans">Internal Management Platform</p>
                    </div>

                    <div className="bg-white shadow-2xl rounded-2xl z-10 w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh]">
                        
                        <div className="bg-white px-6 md:px-10 pt-4 border-b border-slate-200">
                            <ul className="flex w-full text-center">
                                <li className="flex-1">
                                    <button className={`w-full pb-4 font-semibold text-sm transition-all border-b-2 ${activeTab === 'login' ? 'text-maroon-primary border-maroon-primary' : 'text-slate-400 border-transparent hover:text-slate-600'}`} onClick={() => { setActiveTab('login'); setRegPassword(''); }}>Login</button>
                                </li>
                                <li className="flex-1">
                                    <button className={`w-full pb-4 font-semibold text-sm transition-all border-b-2 ${activeTab === 'register' ? 'text-maroon-primary border-maroon-primary' : 'text-slate-400 border-transparent hover:text-slate-600'}`} onClick={() => { setActiveTab('register'); }}>Register</button>
                                </li>
                            </ul>
                        </div>

                        {/* AREA FORM YANG BISA DI SCROLL */}
                        <div className="p-6 md:p-10 pt-6 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

                            {/* --- FORM LOGIN --- */}
                            {activeTab === 'login' && (
                                <form onSubmit={handleLogin}>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Username</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-user fa-fw"></i></span>
                                            <input type="text" name="username" className="w-full bg-transparent border-none outline-none py-3 pr-4 text-slate-700 text-sm font-sans" placeholder="Masukkan username" required />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Password</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0">
                                                <i className="fas fa-lock fa-fw"></i>
                                            </span>
                                            <input type={showPassword ? "text" : "password"} name="password" className="w-full bg-transparent border-none outline-none py-3 text-slate-700 text-sm font-sans" placeholder="Masukkan password" required />
                                            <button type="button" className="px-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                        {capsLockActive && <div className="text-amber-500 text-xs mt-2 font-sans"><i className="fas fa-exclamation-triangle"></i> Caps Lock Aktif</div>}
                                    </div>

                                    <div className="flex justify-end mb-6">
                                        <span className="text-xs underline text-gold-light cursor-pointer hover:text-amber-700 font-sans" onClick={() => { setShowForgotModal(true); setForgotStep('email'); }}>Lupa Password?</span>
                                    </div>

                                    <button type="submit" className="w-full py-3 bg-maroon-primary hover:bg-maroon-dark text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-maroon-primary/20 flex justify-center items-center gap-2 font-sans" disabled={loginLoading}>
                                        {loginLoading ? <><div className="modern-spinner w-4 h-4 border-2 border-t-white"></div> Memuat...</> : 'Masuk ke Portal'}
                                    </button>
                                </form>
                            )}

                            {/* --- FORM REGISTER --- */}
                            {activeTab === 'register' && (
                                <form onSubmit={handleRegister}>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Username</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-user fa-fw"></i></span>
                                            <input type="text" name="username" className="w-full bg-transparent border-none outline-none py-3 pr-4 text-slate-700 text-sm font-sans" placeholder="Username akun baru" required />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Nama Lengkap</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-id-card fa-fw"></i></span>
                                            <input type="text" name="fullName" className="w-full bg-transparent border-none outline-none py-3 pr-4 text-slate-700 text-sm font-sans" placeholder="Nama sesuai KTP" required />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Email</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-envelope fa-fw"></i></span>
                                            <input type="email" name="email" className="w-full bg-transparent border-none outline-none py-3 pr-4 text-slate-700 text-sm font-sans" placeholder="contoh@domain.com" required />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Password Baru</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-lock fa-fw"></i></span>
                                            <input 
                                                type={showPassword ? "text" : "password"} 
                                                name="password" 
                                                className="w-full bg-transparent border-none outline-none py-3 text-slate-700 text-sm font-sans" 
                                                placeholder="Minimal 6 karakter" 
                                                value={regPassword}
                                                onChange={(e) => setRegPassword(e.target.value)}
                                                required 
                                            />
                                            <button type="button" className="px-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                        
                                        {/* INDIKATOR KEKUATAN PASSWORD REGISTER */}
                                        {regPassword.length > 0 && (
                                            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                                                    <div className={`h-full transition-all duration-300 ${regStrength.isStrong ? 'w-full bg-emerald-500' : (regStrength.isMedium ? 'w-2/3 bg-amber-500' : 'w-1/3 bg-red-500')}`}></div>
                                                </div>
                                                <div className={`font-bold mb-3 text-xs font-sans ${regStrength.isStrong ? 'text-emerald-500' : (regStrength.isMedium ? 'text-amber-500' : 'text-red-500')}`}>
                                                    Status Password: {regStrength.isStrong ? 'Kuat (Strong)' : (regStrength.isMedium ? 'Sedang (Medium)' : 'Lemah (Weak)')}
                                                </div>
                                                
                                                <div className="text-[11px] text-slate-500 space-y-1.5 font-sans">
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${regStrength.len ? 'fa-check text-emerald-500' : 'fa-times text-red-500'} w-3`}></i> Minimal 6 karakter
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${regStrength.up ? 'fa-check text-emerald-500' : 'fa-times text-red-500'} w-3`}></i> Minimal 1 huruf besar
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${regStrength.low ? 'fa-check text-emerald-500' : 'fa-times text-red-500'} w-3`}></i> Minimal 1 huruf kecil
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${regStrength.num ? 'fa-check text-emerald-500' : 'fa-times text-red-500'} w-3`}></i> Minimal 1 angka
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${regStrength.spec ? 'fa-check text-emerald-500' : 'fa-times text-slate-400'} w-3`}></i> Karakter Spesial (Opsional)
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-slate-500 mb-2 font-sans">Konfirmasi Password</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-key fa-fw"></i></span>
                                            <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" className="w-full bg-transparent border-none outline-none py-3 text-slate-700 text-sm font-sans" placeholder="Ulangi password" required />
                                            <button type="button" className="px-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <button type="submit" className="w-full py-3 bg-maroon-primary hover:bg-maroon-dark text-white font-bold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-maroon-primary/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed font-sans" disabled={registerLoading || (regPassword.length > 0 && !regStrength.isMedium)}>
                                        {registerLoading ? <><div className="modern-spinner w-4 h-4 border-2 border-t-white"></div> Mendaftarkan...</> : 'Daftar Akun'}
                                    </button>
                                    <p className="text-center text-slate-400 text-xs mt-4 pb-2 font-sans">Setiap pembuatan akun baru membutuhkan verifikasi manual Administrator.</p>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* COPYRIGHT GLOBAL DI TENGAH BAWAH */}
            <div className="absolute bottom-4 left-0 w-full text-center text-white/50 text-xs z-10 pointer-events-none font-sans">
                Made with ❤️ by DVARA Ops
            </div>

            {/* MODAL LUPA PASSWORD */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative" style={{ animation: 'settingsSlideIn 0.3s ease-out' }}>
                        <div className="p-6 pb-2 relative flex justify-center items-center">
                            <h3 className="font-bold text-maroon-primary text-xl lg:text-2xl font-heading">Pemulihan Akun</h3>
                            <button type="button" className="absolute right-6 text-slate-400 hover:text-red-500 transition-colors text-xl" onClick={() => setShowForgotModal(false)}><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-6 pt-4">
                            {forgotStep === 'email' ? (
                                <form onSubmit={handleForgotSend}>
                                    <p className="text-slate-500 text-xs mb-4">Masukkan alamat email terdaftar untuk menerima token verifikasi sistem.</p>
                                    <div className="mb-6">
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-envelope fa-fw"></i></span>
                                            <input type="email" name="email" className="w-full bg-transparent border-none outline-none py-3 pr-4 text-slate-700 text-sm" placeholder="Alamat email kamu" required />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-sm transition-colors" onClick={() => setShowForgotModal(false)}>Batal</button>
                                        <button type="submit" className="px-5 py-2 bg-maroon-primary hover:bg-maroon-dark text-white font-semibold rounded-lg text-sm transition-all hover:shadow-md flex items-center gap-2" disabled={forgotLoading}>
                                            {forgotLoading ? <><div className="modern-spinner w-4 h-4 border-2 border-t-white"></div> Memproses...</> : 'Kirim Kode Verifikasi'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleForgotReset}>
                                    <p className="text-slate-500 text-xs mb-4 leading-relaxed">
                                        Gunakan kode yang dikirim ke email kamu beserta entri kata sandi baru.<br/>
                                        <span className="text-red-500 font-bold">Jika tidak ada, mohon untuk cek folder spam di email.</span>
                                    </p>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Kode OTP</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-hashtag fa-fw"></i></span>
                                            <input type="text" name="code" className="w-full bg-transparent border-none outline-none py-3 pr-4 text-slate-700 text-sm tracking-widest font-mono" placeholder="6 Digit OTP" maxLength="6" required />
                                        </div>
                                    </div>
                                    
                                    {/* PASSWORD BARU */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Password Baru</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-lock fa-fw"></i></span>
                                            <input 
                                                type={showResetPassword ? "text" : "password"} 
                                                name="newPassword" 
                                                className="w-full bg-transparent border-none outline-none py-3 text-slate-700 text-sm" 
                                                placeholder="Kata sandi baru"
                                                value={resetPassword}
                                                onChange={(e) => setResetPassword(e.target.value)}
                                                required 
                                            />
                                            <button type="button" className="px-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setShowResetPassword(!showResetPassword)}>
                                                <i className={`fas ${showResetPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>

                                        {/* STRENGTH METER */}
                                        {resetPassword.length > 0 && (
                                            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
                                                    <div className={`h-full transition-all duration-300 ${resetStrength.isStrong ? 'w-full bg-emerald-500' : (resetStrength.isMedium ? 'w-2/3 bg-amber-500' : 'w-1/3 bg-red-500')}`}></div>
                                                </div>
                                                <div className={`font-bold mb-3 text-xs font-sans ${resetStrength.isStrong ? 'text-emerald-500' : (resetStrength.isMedium ? 'text-amber-500' : 'text-red-500')}`}>
                                                    Status Password: {resetStrength.isStrong ? 'Kuat (Strong)' : (resetStrength.isMedium ? 'Sedang (Medium)' : 'Lemah (Weak)')}
                                                </div>
                                                
                                                <div className="text-[11px] text-slate-500 space-y-1.5 font-sans">
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${resetStrength.len ? 'fa-check text-emerald-500' : 'fa-times text-red-500'} w-3`}></i> Minimal 6 karakter
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${resetStrength.up ? 'fa-check text-emerald-500' : 'fa-times text-red-500'} w-3`}></i> Minimal 1 huruf besar
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${resetStrength.low ? 'fa-check text-emerald-500' : 'fa-times text-red-500'} w-3`}></i> Minimal 1 huruf kecil
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${resetStrength.num ? 'fa-check text-emerald-500' : 'fa-times text-red-500'} w-3`}></i> Minimal 1 angka
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <i className={`fas ${resetStrength.spec ? 'fa-check text-emerald-500' : 'fa-times text-slate-400'} w-3`}></i> Karakter Spesial (Opsional)
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Konfirmasi Password Baru</label>
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-gold-light focus-within:ring-1 focus-within:ring-gold-light transition-all overflow-hidden">
                                            <span className="px-4 text-slate-400 flex-shrink-0"><i className="fas fa-key fa-fw"></i></span>
                                            <input 
                                                type={showConfirmResetPassword ? "text" : "password"} 
                                                name="confirmPassword" 
                                                className="w-full bg-transparent border-none outline-none py-3 text-slate-700 text-sm" 
                                                placeholder="Ulangi kata sandi baru" 
                                                required 
                                            />
                                            <button type="button" className="px-4 text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}>
                                                <i className={`fas ${showConfirmResetPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-2">
                                        <button type="button" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-sm transition-colors" onClick={() => setForgotStep('email')}>Kembali</button>
                                        <button type="submit" className="px-5 py-2 bg-maroon-primary hover:bg-maroon-dark text-white font-semibold rounded-lg text-sm transition-all hover:shadow-md flex items-center gap-2" disabled={resetLoading}>
                                            {resetLoading ? <><div className="modern-spinner w-4 h-4 border-2 border-t-white"></div> Memperbarui...</> : 'Reset Password'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};