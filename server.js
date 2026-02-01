
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

// --- DATABASE CONNECTION ---
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    connectTimeout: 10000
};

const db = mysql.createPool(dbConfig);

// --- GOOGLE AUTH ---
async function getGoogleAuth() {
    const possiblePaths = [
        path.join(__dirname, 'service-account.json'),
        path.join(process.cwd(), 'service-account.json'),
        '/var/www/vhosts/ruangdimensirecord.com/cms.ruangdimensirecord.com/service-account.json'
    ];
    let credentials;
    for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
            try {
                credentials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                break;
            } catch (e) {}
        }
    }
    if (!credentials) return null;
    return new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.file'] });
}

// --- API ROUTES ---

app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: '' },
        googleDrive: { connected: false, message: '', email: '' },
        fileSystem: { serviceAccountExists: false, pathChecked: path.join(__dirname, 'service-account.json') }
    };
    try {
        await db.query('SELECT 1');
        status.database.connected = true;
        status.database.message = 'MySQL Connected';
    } catch (e) { status.database.message = e.message; }

    status.fileSystem.serviceAccountExists = fs.existsSync(status.fileSystem.pathChecked);

    const auth = await getGoogleAuth();
    if (auth) {
        try {
            const drive = google.drive({ version: 'v3', auth });
            const creds = await auth.getCredentials();
            status.googleDrive.email = creds.client_email;
            const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
            if (folderId) {
                await drive.files.get({ fileId: folderId });
                status.googleDrive.connected = true;
                status.googleDrive.message = 'Drive Access OK';
            } else { status.googleDrive.message = 'Folder ID missing'; }
        } catch (e) { status.googleDrive.message = e.message; }
    }
    res.json(status);
});

// GET ALL RELEASES
app.get('/api/releases', async (req, res) => {
    try {
        const [releases] = await db.query('SELECT * FROM releases ORDER BY submission_date DESC');
        for (let rel of releases) {
            const [tracks] = await db.query('SELECT * FROM tracks WHERE release_id = ?', [rel.id]);
            rel.tracks = tracks;
            rel.primaryArtists = [rel.artist_name]; // Compatibility with frontend
        }
        res.json(releases);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// UPLOAD RELEASE (Form + Files)
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/upload-release', upload.fields([{ name: 'coverArt', maxCount: 1 }, { name: 'audioFiles' }]), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const metadata = JSON.parse(req.body.metadata);
        
        // 1. Insert Release
        const [relResult] = await connection.query(
            `INSERT INTO releases (title, upc, status, artist_name, language, label, version, planned_release_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [metadata.title, metadata.upc || null, 'Pending', metadata.primaryArtists[0], metadata.language || 'Indonesia', metadata.label || '', metadata.version || 'Original', metadata.plannedReleaseDate || null]
        );
        const releaseId = relResult.insertId;

        // 2. Insert Tracks (Dummy tracks if not provided, usually provided in a real flow)
        // Note: Full track saving logic would iterate through metadata.tracks
        
        await connection.commit();
        res.json({ success: true, message: 'Rilis tersimpan di database!' });
    } catch (e) {
        await connection.rollback();
        res.status(500).json({ error: e.message });
    } finally {
        connection.release();
    }
});

// CONTRACTS
app.get('/api/contracts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM contracts ORDER BY created_at DESC');
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/contracts', async (req, res) => {
    try {
        const c = req.body;
        await db.query(
            `INSERT INTO contracts (contract_number, artist_name, type, start_date, end_date, duration_years, royalty_rate, status, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [c.contractNumber, c.artistName, c.type, c.startDate, c.endDate, c.durationYears, c.royaltyRate, c.status, c.notes || '']
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// SERVE FRONTEND
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
        } else {
            res.status(404).json({ error: 'API Endpoint not found' });
        }
    });
}

app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
