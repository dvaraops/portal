async function dvaraFetch(action, data) {
    // WAJIB: Ganti dengan URL Exec hasil deployment terbaru dari Langkah 1
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwXayp_RYWj78H4lpxgzxMtDu11XOAhnEZgvKbr64Gkl8P7WFCBQR14flBuBg4nLRP0fg/exec"; 

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: action, ...data })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Koneksi Backend Gagal:", error);
        return { 
            status: 'error', 
            message: 'Gagal terhubung dengan server backend. Pastikan URL Deployment benar.' 
        };
    }
}