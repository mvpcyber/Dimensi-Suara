
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
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
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'),
    scopes: [
        'https://www.googleapis.com/auth/drive.file'
    ],
});
const drive = google.drive({ version: 'v3', auth });

async function uploadToDrive(fileBuffer, fileName, mimeType, folderId) {
    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId || process.env.GOOGLE_DRIVE_FOLDER_ID],
        },
        media: {
            mimeType: mimeType,
            body: Readable.from(fileBuffer),
        },
    });
    return response.data.id;
}

// --- API ROUTES ---

// Upload Release (Metadata to MySQL, Files to Drive)
app.post('/api/upload-release', upload.fields([
    { name: 'coverArt', maxCount: 1 },
    { name: 'audioFiles', maxCount: 20 }
]), async (req, res) => {
    try {
        const metadata = JSON.parse(req.body.metadata);
        
        // 1. Create Folder in Google Drive
        const folderResponse = await drive.files.create({
            requestBody: {
                name: `${metadata.title} - ${metadata.upc || 'NOUPC'}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
            }
        });
        const folderId = folderResponse.data.id;

        // 2. Upload Cover Art to Drive
        let coverDriveId = '';
        if (req.files.coverArt) {
            coverDriveId = await uploadToDrive(
                req.files.coverArt[0].buffer, 
                `Cover-${metadata.title}.jpg`, 
                'image/jpeg', 
                folderId
            );
        }

        // 3. Save Metadata to MySQL (Only)
        await db.query(
            'INSERT INTO releases (title, upc, status, submission_date, artist_name, aggregator, drive_folder_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                metadata.title, 
                metadata.upc, 
                'Pending', 
                new Date(), 
                metadata.primaryArtists[0], 
                '', 
                folderId
            ]
        );

        res.json({ success: true, message: 'Data metadata tersimpan di MySQL & File tersimpan di Google Drive!' });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Contracts API
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

// --- SERVE FRONTEND (DIST FOLDER) ---
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// Handle React Routing (Redirect all non-API requests to index.html)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
    console.log(`📂 Menyajikan file statis dari: ${distPath}`);
    console.log(`🔗 Metadata dikirim ke MySQL, File dikirim ke Drive.`);
});
