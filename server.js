
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
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
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
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'] 
    });
    
    return { auth, foundPath };
}

// --- API ROUTES ---

app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: 'Menghubungkan...' },
        googleDrive: { connected: false, message: 'Menunggu...', email: '', suggestion: '' },
        fileSystem: { serviceAccountExists: false, pathChecked: '' },
        serverTime: new Date().toISOString()
    };

    // 1. Cek MySQL
    try {
        const [rows] = await db.query('SELECT 1 as ok');
        status.database.connected = true;
        status.database.message = `Koneksi MySQL Berhasil (127.0.0.1)`;
    } catch (err) {
        status.database.message = `MySQL Error: ${err.message}`;
    }

    // 2. Cek Auth & Drive
    const { auth, foundPath } = await getGoogleAuth();
    status.fileSystem.serviceAccountExists = !!auth;
    status.fileSystem.pathChecked = foundPath;

    if (auth) {
        try {
            const drive = google.drive({ version: 'v3', auth });
            const creds = await auth.getCredentials();
            status.googleDrive.email = creds.client_email;

            // Bersihkan folderId dari spasi yang mungkin terbawa di Plesk
            const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
            
            if (folderId) {
                try {
                    const folder = await drive.files.get({ 
                        fileId: folderId,
                        fields: 'id, name'
                    });
                    status.googleDrive.connected = true;
                    status.googleDrive.message = `Terhubung ke Folder: "${folder.data.name}"`;
                } catch (driveErr) {
                    if (driveErr.message.includes('not found')) {
                        status.googleDrive.message = `Error 404: Folder tidak terlihat oleh Service Account.`;
                        status.googleDrive.suggestion = "Pastikan Google Drive API sudah di-ENABLE di Google Cloud Console dan email di bawah sudah diundang sebagai EDITOR ke folder tersebut.";
                    } else if (driveErr.message.includes('API has not been used')) {
                        status.googleDrive.message = "Google Drive API Belum Aktif.";
                        status.googleDrive.suggestion = "Buka Google Cloud Console, pilih project Anda, lalu aktifkan 'Google Drive API'.";
                    } else {
                        status.googleDrive.message = `Drive API Error: ${driveErr.message}`;
                    }
                }
            } else {
                status.googleDrive.message = 'GOOGLE_DRIVE_FOLDER_ID kosong di Plesk.';
            }
        } catch (err) {
            status.googleDrive.message = `Auth Error: ${err.message}`;
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

const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `API endpoint ${req.path} tidak ditemukan.` });
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Build frontend tidak ditemukan.');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
});
