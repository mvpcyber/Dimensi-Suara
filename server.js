
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Multer setup for handling file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION (MySQL) ---
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    waitForConnections: true,
    connectionLimit: 10
});

// --- GOOGLE DRIVE AUTH SETUP ---
async function getGoogleAuth() {
    let credentials;
    
    // 1. Check Env Var
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
            credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        } catch (e) {
            console.error("❌ Gagal parse GOOGLE_SERVICE_ACCOUNT_JSON dari Env Var.");
        }
    } 
    
    // 2. Check service-account.json file
    if (!credentials) {
        const filePath = path.join(__dirname, 'service-account.json');
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            try {
                credentials = JSON.parse(fileContent);
            } catch (e) {
                console.error("❌ File service-account.json tidak valid (Format JSON salah).");
            }
        }
    }

    if (!credentials) {
        return null;
    }

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
            console.log("✅ Google Drive API siap digunakan.");
        }
    } catch (err) {
        console.error("❌ Inisialisasi Drive Gagal:", err.message);
    }
};
initDrive();

// --- API ROUTES ---

// Health Check API to debug connection issues
app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: '' },
        googleDrive: { connected: false, message: '', email: '' },
        fileSystem: { serviceAccountExists: false }
    };

    // 1. Check MySQL
    try {
        await db.query('SELECT 1');
        status.database.connected = true;
        status.database.message = 'Koneksi MySQL Berhasil.';
    } catch (err) {
        status.database.message = `Gagal koneksi MySQL: ${err.message}`;
    }

    // 2. Check service-account.json
    const filePath = path.join(__dirname, 'service-account.json');
    status.fileSystem.serviceAccountExists = fs.existsSync(filePath);

    // 3. Check Google Drive Access
    if (!drive) {
        status.googleDrive.message = 'Google Drive API belum terinisialisasi. Pastikan file service-account.json ada di folder root.';
    } else {
        try {
            const auth = await getGoogleAuth();
            const creds = await auth.getCredentials();
            status.googleDrive.email = creds.client_email;

            const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
            if (!folderId) {
                status.googleDrive.message = 'GOOGLE_DRIVE_FOLDER_ID tidak ditemukan di environment variables.';
            } else {
                // Try to get folder metadata to verify access
                const folder = await drive.files.get({ fileId: folderId, fields: 'id, name' });
                status.googleDrive.connected = true;
                status.googleDrive.message = `Berhasil mengakses folder: "${folder.data.name}"`;
            }
        } catch (err) {
            status.googleDrive.message = `Gagal mengakses Google Drive: ${err.message}. Pastikan folder Drive sudah dibagikan (Shared) ke email Service Account.`;
        }
    }

    res.json(status);
});

app.post('/api/upload-release', upload.fields([
    { name: 'coverArt', maxCount: 1 },
    { name: 'audioFiles', maxCount: 20 }
]), async (req, res) => {
    try {
        if (!drive) throw new Error("Google Drive API belum siap. Periksa kredensial.");
        
        const metadata = JSON.parse(req.body.metadata);
        
        // 1. Create Folder
        const folderResponse = await drive.files.create({
            requestBody: {
                name: `${metadata.title} - ${metadata.upc || 'NOUPC'}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
            }
        });
        const folderId = folderResponse.data.id;

        // 2. Metadata to MySQL
        await db.query(
            'INSERT INTO releases (title, upc, status, submission_date, artist_name, aggregator, drive_folder_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [metadata.title, metadata.upc, 'Pending', new Date(), metadata.primaryArtists[0], '', folderId]
        );

        res.json({ success: true, message: 'Upload berhasil!' });
    } catch (err) {
        console.error("Upload Error:", err);
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
