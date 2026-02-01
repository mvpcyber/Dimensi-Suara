
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import multer from 'multer';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'dimensi_suara_db',
    password: process.env.DB_PASSWORD || 'Bangbens220488!',
    database: process.env.DB_NAME || 'dimensi_suara_db'
};

const db = mysql.createPool(dbConfig);

// Helper untuk mendapatkan Google Auth Client (Token User atau Service Account)
async function getGoogleAuth(req) {
    const authHeader = req.headers.authorization;
    
    // Jika ada Bearer Token dari frontend (OAuth2 Flow)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: token });
        return oauth2Client;
    }

    // Fallback ke Service Account (jika ada)
    const credPath = path.join(__dirname, 'service-account.json');
    if (fs.existsSync(credPath)) {
        const auth = new google.auth.GoogleAuth({
            keyFile: credPath,
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        return auth;
    }
    return null;
}

const uploadToDrive = async (drive, buffer, fileName, mimeType, parentId) => {
    const media = { mimeType, body: Readable.from(buffer) };
    const response = await drive.files.create({
        requestBody: { name: fileName, parents: [parentId] },
        media: media,
        fields: 'id'
    });
    return response.data.id;
};

app.get('/api/health-check', async (req, res) => {
    const status = { database: { connected: false, message: '' }, googleDrive: { connected: false, message: '' } };
    try {
        await db.query('SELECT 1');
        status.database.connected = true;
        status.database.message = "MySQL Connected";
    } catch (err) { status.database.message = err.message; }

    const auth = await getGoogleAuth(req);
    if (auth) {
        status.googleDrive.connected = true;
        status.googleDrive.message = "Google Authenticated";
    } else {
        status.googleDrive.message = "Google Not Authenticated (Login required)";
    }
    res.json(status);
});

// Endpoint untuk menyimpan Rilis Lagu (Metadata ke MySQL, File ke Drive)
app.post('/api/upload-release', upload.fields([
    { name: 'coverArt', maxCount: 1 },
    { name: 'audioFiles' }
]), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const metadata = JSON.parse(req.body.metadata);
        const auth = await getGoogleAuth(req);
        if (!auth) throw new Error("Akses Google Drive diperlukan. Silakan login.");
        
        const drive = google.drive({ version: 'v3', auth });
        const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        // 1. Buat Folder Rilis di Drive
        const folderMetadata = {
            name: `${metadata.title} - ${metadata.upc || Date.now()}`,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        };
        const folderRes = await drive.files.create({
            requestBody: folderMetadata,
            fields: 'id'
        });
        const folderId = folderRes.data.id;

        // 2. Upload Cover Art
        let coverArtUrl = '';
        if (req.files['coverArt']) {
            const file = req.files['coverArt'][0];
            const fileId = await uploadToDrive(drive, file.buffer, file.originalname, file.mimetype, folderId);
            coverArtUrl = `https://drive.google.com/file/d/${fileId}/view`;
        }

        // 3. Simpan Header Rilis ke MySQL
        const [releaseResult] = await connection.query(
            `INSERT INTO releases 
            (title, upc, status, artist_name, label, language, version, 
            is_new_release, original_release_date, planned_release_date, 
            drive_folder_id, aggregator, submission_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                metadata.title, metadata.upc, 'Pending', 
                metadata.primaryArtists.join(', '), metadata.label, 
                metadata.language, metadata.version,
                metadata.isNewRelease ? 1 : 0, 
                metadata.originalReleaseDate || null,
                metadata.plannedReleaseDate || null,
                folderId,
                metadata.aggregator || null
            ]
        );
        const releaseId = releaseResult.insertId;

        // 4. Proses Track & Upload Audio
        let fileIndex = 0;
        const uploadedAudioFiles = req.files['audioFiles'] || [];

        for (const track of metadata.tracks) {
            let audioUrl = '';
            
            // Asumsi file audio diupload berurutan sesuai track yang memiliki file
            if (fileIndex < uploadedAudioFiles.length) {
                const file = uploadedAudioFiles[fileIndex];
                const fileId = await uploadToDrive(drive, file.buffer, file.originalname, file.mimetype, folderId);
                audioUrl = `https://drive.google.com/file/d/${fileId}/view`;
                fileIndex++;
            }

            await connection.query(
                `INSERT INTO tracks 
                (release_id, title, track_number, isrc, duration, genre, 
                explicit_lyrics, composer, lyricist, lyrics, audio_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    releaseId, track.title, track.trackNumber, track.isrc,
                    track.duration, track.genre, track.explicitLyrics,
                    track.composer, track.lyricist, track.lyrics, audioUrl
                ]
            );
        }

        await connection.commit();
        res.json({ success: true, message: "Rilis berhasil disimpan ke Database & Drive!" });

    } catch (err) {
        await connection.rollback();
        console.error("Upload error:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

app.post('/api/contracts', upload.fields([
    { name: 'ktpFile', maxCount: 1 },
    { name: 'npwpFile', maxCount: 1 },
    { name: 'signatureFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const metadata = JSON.parse(req.body.metadata);
        const { contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status } = metadata;
        
        const auth = await getGoogleAuth(req);
        if (!auth) throw new Error("Akses Google ditolak. Silakan login.");

        const drive = google.drive({ version: 'v3', auth });
        const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        // 1. Upload ke Drive
        const folderResponse = await drive.files.create({
            requestBody: { name: contractNumber, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
            fields: 'id'
        });
        const driveFolderId = folderResponse.data.id;

        if (req.files['ktpFile']) await uploadToDrive(drive, req.files['ktpFile'][0].buffer, `KTP.jpg`, 'image/jpeg', driveFolderId);
        if (req.files['npwpFile']) await uploadToDrive(drive, req.files['npwpFile'][0].buffer, `NPWP.jpg`, 'image/jpeg', driveFolderId);

        // 2. Simpan ke Database
        await db.query('INSERT INTO contracts (contract_number, artist_name, start_date, end_date, duration_years, royalty_rate, status, drive_folder_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status || 'Pending', driveFolderId]);

        res.json({ success: true, message: "Kontrak tersimpan di Database & Drive!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/releases', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM releases ORDER BY submission_date DESC');
        // Kita juga bisa mengambil tracks jika diperlukan, tapi untuk list view cukup header saja
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
app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
