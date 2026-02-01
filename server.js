
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- KONFIGURASI FOLDER UPLOAD ---
const UPLOAD_DIRS = {
    base: path.join(__dirname, 'public/uploads'),
    covers: path.join(__dirname, 'public/uploads/covers'),
    audio: path.join(__dirname, 'public/uploads/audio'),
    contracts: path.join(__dirname, 'public/uploads/contracts'),
    others: path.join(__dirname, 'public/uploads/others')
};

// Buat folder jika belum ada
Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// --- KONFIGURASI MULTER ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'coverArt') {
            cb(null, UPLOAD_DIRS.covers);
        } else if (file.fieldname === 'audioFiles' || file.fieldname === 'audioClip') {
            cb(null, UPLOAD_DIRS.audio);
        } else if (['ktpFile', 'npwpFile', 'signatureFile'].includes(file.fieldname)) {
            cb(null, UPLOAD_DIRS.contracts);
        } else {
            cb(null, UPLOAD_DIRS.others);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${uniqueSuffix}-${sanitizedName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } 
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// --- DATABASE ---
const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'dimensi_suara_db',
    password: process.env.DB_PASSWORD || 'Bangbens220488!',
    database: process.env.DB_NAME || 'dimensi_suara_db',
    waitForConnections: true,
    connectionLimit: 10
};

const db = mysql.createPool(dbConfig);

// Init Tables (Pastikan tabel memiliki struktur yang benar)
const initDb = async () => {
    const connection = await db.getConnection();
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS releases (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                upc VARCHAR(50),
                status ENUM('Pending', 'Processing', 'Live', 'Rejected', 'Draft') DEFAULT 'Pending',
                submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                artist_name VARCHAR(255),
                aggregator VARCHAR(100),
                cover_art_url VARCHAR(500), -- Menambah kolom URL cover art
                language VARCHAR(100),
                label VARCHAR(255),
                version VARCHAR(100),
                is_new_release BOOLEAN DEFAULT TRUE,
                original_release_date DATE,
                planned_release_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS tracks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                release_id INT,
                title VARCHAR(255) NOT NULL,
                track_number INT,
                isrc VARCHAR(50),
                duration VARCHAR(20),
                instrumental VARCHAR(10) DEFAULT 'No',
                genre VARCHAR(100),
                explicit_lyrics VARCHAR(10) DEFAULT 'No',
                composer VARCHAR(255),
                lyricist VARCHAR(255),
                lyrics TEXT,
                audio_url VARCHAR(500),
                FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
            )
        `);
        console.log("Database tables initialized.");
    } catch (err) {
        console.error("Init DB Error:", err);
    } finally {
        connection.release();
    }
};
initDb();

const getFileUrl = (req, folderName, filename) => {
    if (!filename) return '';
    return `${req.protocol}://${req.get('host')}/uploads/${folderName}/${filename}`;
};

// --- ROUTES ---

app.get('/api/health-check', async (req, res) => {
    res.json({ status: 'ok', storage: UPLOAD_DIRS.base });
});

// Endpoint Upload Rilis (Fix untuk Album & Cover Art)
app.post('/api/upload-release', upload.fields([
    { name: 'coverArt', maxCount: 1 },
    { name: 'audioFiles' } 
]), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const metadata = JSON.parse(req.body.metadata);
        
        // 1. Simpan Cover Art
        let coverArtUrl = '';
        if (req.files['coverArt'] && req.files['coverArt'][0]) {
            const file = req.files['coverArt'][0];
            coverArtUrl = getFileUrl(req, 'covers', file.filename);
        }

        // 2. Simpan Header Rilis
        const [releaseResult] = await connection.query(
            `INSERT INTO releases 
            (title, upc, status, artist_name, label, language, version, 
            is_new_release, original_release_date, planned_release_date, 
            aggregator, cover_art_url, submission_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                metadata.title, metadata.upc, 'Pending', 
                metadata.primaryArtists.join(', '), metadata.label, 
                metadata.language, metadata.version,
                metadata.isNewRelease ? 1 : 0, 
                metadata.originalReleaseDate || null,
                metadata.plannedReleaseDate || null,
                metadata.aggregator || null,
                coverArtUrl
            ]
        );
        const releaseId = releaseResult.insertId;

        // 3. Simpan Tracks (Looping yang diperbaiki untuk Album)
        const uploadedAudioFiles = req.files['audioFiles'] || [];
        
        // Kita asumsikan urutan array tracks di metadata SAMA dengan urutan file yang diupload.
        // Frontend harus memastikan append 'audioFiles' dilakukan berurutan sesuai track.
        
        for (let i = 0; i < metadata.tracks.length; i++) {
            const track = metadata.tracks[i];
            let audioUrl = '';

            // Ambil file audio berdasarkan index loop
            // Jika user upload 10 lagu, uploadedAudioFiles[0] adalah track 1, uploadedAudioFiles[1] adalah track 2, dst.
            if (uploadedAudioFiles[i]) {
                audioUrl = getFileUrl(req, 'audio', uploadedAudioFiles[i].filename);
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
        res.json({ success: true, message: "Album/Lagu berhasil disimpan ke database!" });

    } catch (err) {
        await connection.rollback();
        console.error("Upload error:", err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

// ... (Sisa kode endpoint Contracts sama seperti sebelumnya) ...
app.post('/api/contracts', upload.fields([
    { name: 'ktpFile', maxCount: 1 },
    { name: 'npwpFile', maxCount: 1 },
    { name: 'signatureFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const metadata = JSON.parse(req.body.metadata);
        const { contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status } = metadata;
        
        const sql = `INSERT INTO contracts 
            (contract_number, artist_name, start_date, end_date, duration_years, royalty_rate, status, drive_folder_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const values = [
            contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status || 'Pending', 'LOCAL_STORAGE'
        ];

        const [result] = await db.query(sql, values);
        res.status(201).json({ success: true, id: result.insertId, message: "Kontrak tersimpan." });
    } catch (err) {
        console.error("DB Error:", err);
        res.status(500).json({ success: false, error: err.message });
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

app.patch('/api/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const [result] = await db.query('UPDATE contracts SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/contracts/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM contracts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/releases', async (req, res) => {
    try {
        // Fetch releases
        const [rows] = await db.query('SELECT * FROM releases ORDER BY submission_date DESC');
        
        const releasesWithTracks = await Promise.all(rows.map(async (release) => {
            const [tracks] = await db.query('SELECT * FROM tracks WHERE release_id = ? ORDER BY track_number ASC', [release.id]);
            
            const mappedTracks = tracks.map(t => ({
                id: t.id.toString(),
                trackNumber: t.track_number,
                title: t.title,
                isrc: t.isrc,
                duration: t.duration,
                genre: t.genre,
                explicitLyrics: t.explicit_lyrics,
                composer: t.composer,
                lyricist: t.lyricist,
                lyrics: t.lyrics,
                artists: [{ name: release.artist_name, role: 'MainArtist' }], 
                contributors: [],
                audioFileUrl: t.audio_url // Send saved URL
            }));

            return {
                ...release,
                id: release.id.toString(),
                primaryArtists: release.artist_name ? release.artist_name.split(', ') : [],
                plannedReleaseDate: release.planned_release_date,
                originalReleaseDate: release.original_release_date,
                submissionDate: release.submission_date,
                isNewRelease: !!release.is_new_release,
                tracks: mappedTracks,
                coverArtUrl: release.cover_art_url // Send saved URL
            };
        }));
        
        res.json(releasesWithTracks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return res.status(404).json({ error: `Not found: ${req.path}` });
    }
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('Backend Running. Frontend build not found.');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
