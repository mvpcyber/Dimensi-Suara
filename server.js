
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION (Prioritaskan Environment Variables Plesk) ---
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'dimensi_suara_db',
    password: process.env.DB_PASSWORD || 'Bangbens220488!',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 20000 
};

// Inisialisasi Pool
const db = mysql.createPool(dbConfig);

// --- GOOGLE DRIVE AUTH (Perbaikan Path Domain) ---
async function getGoogleAuth() {
    const possiblePaths = [
        path.join(__dirname, 'service-account.json'),
        path.join(process.cwd(), 'service-account.json'),
        // Perbaikan typo: records (dengan 's') sesuai screenshot Plesk anda
        '/var/www/vhosts/ruangdimensirecords.com/cms.ruangdimensirecords.com/service-account.json'
    ];
    
    let credentials;
    let foundPath = '';

    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            try {
                credentials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                foundPath = filePath;
                break;
            } catch (e) {
                console.error(`Gagal baca file di ${filePath}:`, e.message);
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

// --- API ROUTES (DIDEFINISIKAN SEBELUM STATIC FILES) ---

app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: 'Mengecek...' },
        googleDrive: { connected: false, message: 'Mengecek...', email: '' },
        fileSystem: { serviceAccountExists: false, pathChecked: '' }
    };

    // 1. Cek MySQL
    try {
        const [rows] = await db.query('SELECT 1 as ok');
        status.database.connected = true;
        status.database.message = 'Koneksi MySQL Berhasil (127.0.0.1)';
    } catch (err) {
        status.database.message = `Gagal: ${err.message}`;
    }

    // 2. Cek File & Drive
    const { auth, foundPath, pathChecked } = await getGoogleAuth();
    status.fileSystem.serviceAccountExists = !!auth;
    status.fileSystem.pathChecked = foundPath || pathChecked;

    if (auth) {
        try {
            const drive = google.drive({ version: 'v3', auth });
            const creds = await auth.getCredentials();
            status.googleDrive.email = creds.client_email;

            const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
            if (!folderId) {
                status.googleDrive.message = 'GOOGLE_DRIVE_FOLDER_ID belum diset di Plesk.';
            } else {
                const folder = await drive.files.get({ fileId: folderId });
                status.googleDrive.connected = true;
                status.googleDrive.message = `Akses Drive Oke: "${folder.data.name}"`;
            }
        } catch (err) {
            status.googleDrive.message = `Drive Error: ${err.message}`;
        }
    } else {
        status.googleDrive.message = 'File JSON tidak ditemukan atau rusak.';
    }

    res.json(status);
});

// GET RELEASES (DATABASE)
app.get('/api/releases', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM releases ORDER BY created_at DESC');
        // Map data agar sesuai dengan kebutuhan frontend
        const mapped = rows.map(r => ({
            ...r,
            primaryArtists: [r.artist_name],
            tracks: [] // Dalam implementasi nyata, lakukan join atau query kedua
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET CONTRACTS (DATABASE)
app.get('/api/contracts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM contracts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SIMPAN KONTRAK (DATABASE)
app.post('/api/contracts', async (req, res) => {
    try {
        const c = req.body;
        const [result] = await db.query(
            `INSERT INTO contracts (contract_number, artist_name, type, start_date, end_date, duration_years, royalty_rate, status, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [c.contractNumber, c.artistName, c.type, c.startDate, c.endDate, c.durationYears, c.royaltyRate, c.status, c.notes || '']
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SERVE STATIC FILES (FRONTEND) ---
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // Catch-all: Kirim index.html untuk rute yang bukan API
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
        } else {
            res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
        }
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
});
