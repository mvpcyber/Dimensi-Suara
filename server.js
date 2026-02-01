
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

// 1. Health Check
app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: 'Menghubungkan...' },
        googleDrive: { connected: false, message: 'Menunggu...', email: '', suggestion: '' },
        fileSystem: { serviceAccountExists: false, pathChecked: '' },
        serverTime: new Date().toISOString()
    };

    try {
        const [rows] = await db.query('SELECT 1 as ok');
        status.database.connected = true;
        status.database.message = `Koneksi MySQL Berhasil (127.0.0.1)`;
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
            const folderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();
            
            if (folderId) {
                try {
                    const folder = await drive.files.get({ fileId: folderId, fields: 'id, name' });
                    status.googleDrive.connected = true;
                    status.googleDrive.message = `Terhubung ke Folder: "${folder.data.name}"`;
                } catch (driveErr) {
                    status.googleDrive.message = `Drive API Error: ${driveErr.message}`;
                }
            } else {
                status.googleDrive.message = 'ID Folder belum diatur.';
            }
        } catch (err) {
            status.googleDrive.message = `Auth Error: ${err.message}`;
        }
    } else {
        status.googleDrive.message = 'File service-account.json tidak ditemukan.';
    }
    res.json(status);
});

// 2. Contracts: Get All
app.get('/api/contracts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM contracts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Contracts: Create (INI YANG SEBELUMNYA HILANG)
app.post('/api/contracts', async (req, res) => {
    try {
        const c = req.body;
        const sql = `INSERT INTO contracts 
            (contract_number, artist_name, type, start_date, end_date, duration_years, royalty_rate, status, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const values = [
            c.contractNumber, 
            c.artistName, 
            c.type, 
            c.startDate, 
            c.endDate, 
            c.durationYears, 
            c.royaltyRate, 
            c.status || 'Pending', 
            c.notes || ''
        ];

        const [result] = await db.query(sql, values);
        res.status(201).json({ success: true, id: result.insertId, message: "Kontrak berhasil disimpan ke database." });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ success: false, error: "Gagal menyimpan ke database: " + err.message });
    }
});

// 4. Releases: Get All
app.get('/api/releases', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM releases ORDER BY submission_date DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Releases: Create (Placeholder untuk upload lagu)
app.post('/api/upload-release', async (req, res) => {
    // Logic untuk upload rilis lagu bisa kompleks (membutuhkan Multer)
    // Untuk saat ini kita pastikan endpoint tersedia agar tidak 404
    res.status(501).json({ error: "Fitur upload lagu sedang dalam sinkronisasi file sistem." });
});

// --- SERVE FRONTEND (STATIC) ---
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
