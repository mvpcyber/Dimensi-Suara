
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

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    waitForConnections: true,
    connectionLimit: 10
});

// --- GOOGLE AUTH SETUP ---
const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}'),
    scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
    ],
});
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

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

// API Routes (Upload, Contracts, etc.)
app.post('/api/upload-release', upload.fields([
    { name: 'coverArt', maxCount: 1 },
    { name: 'audioFiles', maxCount: 20 }
]), async (req, res) => {
    try {
        const metadata = JSON.parse(req.body.metadata);
        const folderResponse = await drive.files.create({
            requestBody: {
                name: `${metadata.title} - ${metadata.upc || 'NOUPC'}`,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
            }
        });
        const folderId = folderResponse.data.id;
        let coverDriveId = '';
        if (req.files.coverArt) {
            coverDriveId = await uploadToDrive(req.files.coverArt[0].buffer, `Cover-${metadata.title}.jpg`, 'image/jpeg', folderId);
        }
        await db.query(
            'INSERT INTO releases (title, upc, status, submission_date, artist_name, aggregator, drive_folder_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [metadata.title, metadata.upc, 'Pending', new Date(), metadata.primaryArtists[0], '', folderId]
        );
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Sheet1!A:G',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[new Date().toISOString(), metadata.upc, metadata.title, metadata.primaryArtists.join(', '), 'Pending', folderId]]
            }
        });
        res.json({ success: true, message: 'Data tersimpan!' });
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

// --- SERVE FRONTEND (DIST FOLDER) ---
// Gunakan path.resolve agar lebih pasti lokasinya
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
    // Jika request bukan API, arahkan ke index.html di folder dist
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
    console.log(`📂 Menyajikan file statis dari: ${distPath}`);
});
