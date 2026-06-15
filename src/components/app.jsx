// File: dvaraops/src/components/app.jsx
const App = () => {
    const [user, setUser] = React.useState(null);

    // Cek Session (Keep Login) di localStorage
    React.useEffect(() => {
        const checkSession = () => {
            const session = localStorage.getItem('dvara_session');
            if (session) {
                const parsedSession = JSON.parse(session);
                // 1 Hour = 3600000 ms
                if (parsedSession.loginTime && (Date.now() - parsedSession.loginTime > 3600000)) {
                    localStorage.removeItem('dvara_session');
                    setUser(null);
                    return false;
                } else {
                    setUser(parsedSession);
                    return true;
                }
            }
            return false;
        };

        const isActive = checkSession();
        
        const interval = setInterval(() => {
            if (localStorage.getItem('dvara_session')) {
                const isValid = checkSession();
                if (!isValid) {
                    window.location.reload(); // Force reload if session expired while app is open
                }
            }
        }, 60000); // Check every minute

        return () => clearInterval(interval);
    }, []);

    const handleLogin = (userData) => {
        const sessionDataWithTime = { ...userData, loginTime: Date.now() };
        localStorage.setItem('dvara_session', JSON.stringify(sessionDataWithTime));
        setUser(sessionDataWithTime);
    };

    // Fungsi LOGOUT untuk hapus session & balik ke halaman Auth
    const handleLogout = () => {
        localStorage.removeItem('dvara_session');
        setUser(null);
    };

    // Fungsi untuk update data session (misal abis edit profile)
    const handleUpdateSession = (newData) => {
        const updatedUser = { ...user, ...newData };
        localStorage.setItem('dvara_session', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    // Cek routing sederhana dari URL parameter
    const searchParams = new URLSearchParams(window.location.search);
    const pageParam = searchParams.get('page');

    if (pageParam === 'absensi') {
        return <Absensi />;
    }

    return (
        <>
            {!user ? (
                <Auth onLoginSuccess={handleLogin} />
            ) : (
                <Dashboard 
                    sessionData={user} 
                    updateSession={handleUpdateSession} 
                    onLogout={handleLogout} 
                />
            )}
        </>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);