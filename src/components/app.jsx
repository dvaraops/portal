// File: dvaraops/src/components/app.jsx
const App = () => {
    const [user, setUser] = React.useState(null);

    // Cek Session (Keep Login) di localStorage
    React.useEffect(() => {
        const session = localStorage.getItem('dvara_session');
        if (session) setUser(JSON.parse(session));
    }, []);

    const handleLogin = (userData) => {
        localStorage.setItem('dvara_session', JSON.stringify(userData));
        setUser(userData);
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