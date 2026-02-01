
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

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION (MySQL) ---
// Pastikan variabel ini diset di Environment Variables Plesk
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 10000 // 10 detik timeout
};

const db = mysql.createPool(dbConfig);

// --- GOOGLE DRIVE AUTH SETUP (ROBUST PATHING) ---
async function getGoogleAuth() {
    let credentials;
    
    // 1. Cek Environment Variable (Prioritas Utama)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
            credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
            console.log("✅ Menggunakan kredensial dari Environment Variable.");
        } catch (e) {
            console.error("❌ Gagal parse GOOGLE_SERVICE_ACCOUNT_JSON.");
        }
    } 
    
    // 2. Cek File service-account.json (Beberapa lokasi)
    if (!credentials) {
        const possiblePaths = [
            path.join(__dirname, 'service-account.json'),
            path.join(process.cwd(), 'service-account.json'),
            '/var/www/vhosts/ruangdimensirecord.com/cms.ruangdimensirecord.com/service-account.json' // Absolute path Plesk Anda
        ];

        for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
                try {
                    const fileContent = fs.readFileSync(filePath, 'utf8');
                    credentials = JSON.parse(fileContent);
                    console.log(`✅ File kredensial ditemukan di: ${filePath}`);
                    break;
                } catch (e) {
                    console.error(`❌ File ditemukan di ${filePath} tapi tidak bisa dibaca/parse.`);
                }
            }
        }
    }

    if (!credentials) return null;

    return new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
}

// Global Drive instance
let drive;
const initDrive = async () => {
    try {
        const auth = await getGoogleAuth();
        if (auth) {
            drive = google.drive({ version: 'v3', auth });
        }
    } catch (err) {
        console.error("❌ Drive Init Error:", err.message);
    }
};
initDrive();

// --- API ROUTES ---

app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: 'Mengecek...' },
        googleDrive: { connected: false, message: 'Mengecek...', email: '' },
        fileSystem: { serviceAccountExists: false, pathChecked: '' }
    };

    // 1. Check MySQL
    try {
        const [rows] = await db.query('SELECT 1 as ok');
        status.database.connected = true;
        status.database.message = 'Koneksi MySQL Berhasil.';
    } catch (err) {
        status.database.message = `Gagal: ${err.message}`;
    }

    // 2. Check File
    const filePath = path.join(__dirname, 'service-account.json');
    status.fileSystem.serviceAccountExists = fs.existsSync(filePath);
    status.fileSystem.pathChecked = filePath;

    // 3. Check Google Drive
    if (!drive) {
        status.googleDrive.message = 'Google Drive API belum terinisialisasi. Cek file JSON.';
    } else {
        try {
            const auth = await getGoogleAuth();
            const creds = await auth.getCredentials();
            status.googleDrive.email = creds.client_email;

            const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
            if (!folderId) {
                status.googleDrive.message = 'GOOGLE_DRIVE_FOLDER_ID belum diset di Plesk.';
            } else {
                const folder = await drive.files.get({ fileId: folderId, fields: 'id, name' });
                status.googleDrive.connected = true;
                status.googleDrive.message = `Akses Oke: "${folder.data.name}"`;
            }
        } catch (err) {
            status.googleDrive.message = `Drive Error: ${err.message}`;
        }
    }

    res.json(status);
});

// Route lainnya tetap sama...
app.post('/api/upload-release', upload.fields([
    { name: 'coverArt', maxCount: 1 },
    { name: 'audioFiles', maxCount: 20 }
]), async (req, res) => {
    try {
        if (!drive) throw new Error("Google Drive API belum siap.");
        const metadata = JSON.parse(req.body.metadata);
        const folderResponse = await drive.files.create({
            requestBody: {
                name: `${metadata.title} - ${metadata.upc || 'NEW'}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
            }
        });
        const folderId = folderResponse.data.id;
        await db.query(
            'INSERT INTO releases (title, upc, status, submission_date, artist_name, aggregator, drive_folder_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [metadata.title, metadata.upc, 'Pending', new Date(), metadata.primaryArtists[0], '', folderId]
        );
        res.json({ success: true, message: 'Upload berhasil!' });
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

app.post('/api/contracts', async (req, res) => {
    try {
        const { contract_number, artist_name, type, start_date, end_date, duration_years, royalty_rate, status, notes } = req.body;
        await db.query(
            'INSERT INTO contracts (contract_number, artist_name, type, start_date, end_date, duration_years, royalty_rate, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [contract_number, artist_name, type, start_date, end_date, duration_years, royalty_rate, status, notes]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
});
