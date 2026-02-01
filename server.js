
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Plesk biasanya memberikan port via environment variable
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
// Mengambil dari Environment Variables Plesk sesuai screenshot Anda
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'dimensi_suara_db',
    password: process.env.DB_PASSWORD || 'Bangbens220488!',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000 
};

const db = mysql.createPool(dbConfig);

// --- GOOGLE AUTH ---
async function getGoogleAuth() {
    // Mencari di beberapa lokasi umum Plesk
    const possiblePaths = [
        path.join(__dirname, 'service-account.json'),
        path.join(process.cwd(), 'service-account.json'),
        '/var/www/vhosts/ruangdimensirecords.com/cms.ruangdimensirecords.com/service-account.json'
    ];
    
    let credentials;
    let foundPath = 'Tidak ditemukan';

    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            try {
                credentials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                foundPath = filePath;
                break;
            } catch (e) {
                console.error(`Gagal memproses JSON di ${filePath}:`, e.message);
            }
        }
    }

    if (!credentials) return { auth: null, pathChecked: possiblePaths.join(' | ') };

    const auth = new google.auth.GoogleAuth({ 
        credentials, 
        scopes: ['https://www.googleapis.com/auth/drive.file'] 
    });
    
    return { auth, foundPath };
}

// --- API ROUTES (Wajib di atas Static Files) ---

app.get('/api/health-check', async (req, res) => {
    console.log('Health check requested');
    const status = {
        database: { connected: false, message: 'Menghubungkan...' },
        googleDrive: { connected: false, message: 'Menunggu...', email: '' },
        fileSystem: { serviceAccountExists: false, pathChecked: '' },
        serverTime: new Date().toISOString()
    };

    try {
        const [rows] = await db.query('SELECT 1 as ok');
        status.database.connected = true;
        status.database.message = `Terhubung ke MySQL (${dbConfig.host})`;
    } catch (err) {
        status.database.message = `MySQL Error: ${err.message}`;
    }

    const { auth, foundPath } = await getGoogleAuth();
    status.fileSystem.serviceAccountExists = !!auth;
    status.fileSystem.pathChecked = foundPath;

    if (auth) {
        try {
            const drive = google.drive({ version: 'v3', auth });
            const creds = await auth.getCredentials();
            status.googleDrive.email = creds.client_email;

            const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
            if (folderId) {
                const folder = await drive.files.get({ fileId: folderId });
                status.googleDrive.connected = true;
                status.googleDrive.message = `Drive OK: ${folder.data.name}`;
            } else {
                status.googleDrive.message = 'ID Folder Drive belum diatur di Plesk.';
            }
        } catch (err) {
            status.googleDrive.message = `Drive API Error: ${err.message}`;
        }
    } else {
        status.googleDrive.message = 'File service-account.json tidak ditemukan.';
    }

    res.json(status);
});

app.get('/api/releases', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM releases ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/contracts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM contracts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SERVE FRONTEND (STATIC) ---
const distPath = path.resolve(__dirname, 'dist');

// Pastikan rute API tidak masuk ke catch-all index.html
app.use(express.static(distPath));

app.get('*', (req, res) => {
    // Jika path diawali /api tapi tidak cocok dengan rute di atas, beri JSON 404, bukan HTML
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `API endpoint ${req.path} tidak ditemukan.` });
    }
    // Kirim index.html untuk rute frontend (SPA)
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Build frontend tidak ditemukan. Jalankan npm run build.');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
    console.log(`📂 Document Root: ${distPath}`);
});
