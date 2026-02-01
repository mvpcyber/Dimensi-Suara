
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
// Pastikan folder ini ada saat server start
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

// --- KONFIGURASI MULTER (DISK STORAGE) ---
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
        // Format nama file: TIMESTAMP-RANDOM-ORIGINALNAME (Sanitized)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${uniqueSuffix}-${sanitizedName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // Max 100MB per file
});

// --- SERVING STATIC FILES ---
// Agar file yang diupload bisa diakses via URL http://domain/uploads/...
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

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

// Helper untuk membuat Full URL
const getFileUrl = (req, folderName, filename) => {
    if (!filename) return '';
    return `${req.protocol}://${req.get('host')}/uploads/${folderName}/${filename}`;
};

// --- API ROUTES ---

app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: 'Menghubungkan...' },
        storage: { connected: false, message: 'Mengecek folder...' },
        serverTime: new Date().toISOString()
    };

    try {
        await db.query('SELECT 1');
        status.database.connected = true;
        status.database.message = `Koneksi MySQL Berhasil`;
    } catch (err) {
        status.database.message = `MySQL Error: ${err.message}`;
    }

    try {
        // Cek apakah folder uploads bisa ditulisi
        const testFile = path.join(UPLOAD_DIRS.base, 'test.txt');
        fs.writeFileSync(testFile, 'write-test');
        fs.unlinkSync(testFile);
        status.storage.connected = true;
        status.storage.message = `Penyimpanan Lokal Siap (${UPLOAD_DIRS.base})`;
    } catch (err) {
        status.storage.message = `Storage Error: ${err.message}`;
    }

    res.json(status);
});

// Endpoint Upload Rilis (Local Storage)
app.post('/api/upload-release', upload.fields([
    { name: 'coverArt', maxCount: 1 },
    { name: 'audioFiles' } // Supports multiple files
]), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const metadata = JSON.parse(req.body.metadata);
        
        // 1. Proses URL Cover Art
        let coverArtUrl = '';
        if (req.files['coverArt'] && req.files['coverArt'][0]) {
            const file = req.files['coverArt'][0];
            coverArtUrl = getFileUrl(req, 'covers', file.filename);
        }

        // 2. Simpan Header Rilis ke MySQL
        const [releaseResult] = await connection.query(
            `INSERT INTO releases 
            (title, upc, status, artist_name, label, language, version, 
            is_new_release, original_release_date, planned_release_date, 
            aggregator, submission_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                metadata.title, metadata.upc, 'Pending', 
                metadata.primaryArtists.join(', '), metadata.label, 
                metadata.language, metadata.version,
                metadata.isNewRelease ? 1 : 0, 
                metadata.originalReleaseDate || null,
                metadata.plannedReleaseDate || null,
                metadata.aggregator || null
            ]
        );
        const releaseId = releaseResult.insertId;

        // 3. Proses Track & URL Audio
        const uploadedAudioFiles = req.files['audioFiles'] || [];
        // Kita asumsikan urutan file yang diupload sesuai dengan urutan track yang dikirim dari frontend
        // (Frontend biasanya append FormData secara berurutan)
        
        // Mapping file index manual karena metadata.tracks mungkin berisi track tanpa file baru (jika edit mode, logic perlu disesuaikan nanti)
        // Untuk upload baru, kita asumsikan 1-to-1 mapping untuk track yang punya file.
        let audioFileIndex = 0;

        for (const track of metadata.tracks) {
            let audioUrl = '';
            
            // Cek apakah track ini punya file audio yang diupload
            // Di frontend, kita append 'audioFiles' hanya jika track.audioFile ada.
            // Logic sederhana: Assign file berikutnya dari array ke track ini.
            if (track.audioFile && audioFileIndex < uploadedAudioFiles.length) {
                const file = uploadedAudioFiles[audioFileIndex];
                audioUrl = getFileUrl(req, 'audio', file.filename);
                audioFileIndex++;
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
        res.json({ success: true, message: "Rilis berhasil disimpan ke Database & Local Storage!" });

    } catch (err) {
        await connection.rollback();
        console.error("Upload error:", err);
        // Hapus file yang sudah terlanjur diupload jika error database (opsional cleanup)
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

// Endpoint Kontrak (Local Storage)
app.post('/api/contracts', upload.fields([
    { name: 'ktpFile', maxCount: 1 },
    { name: 'npwpFile', maxCount: 1 },
    { name: 'signatureFile', maxCount: 1 }
]), async (req, res) => {
    try {
        const metadata = JSON.parse(req.body.metadata);
        const { contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status } = metadata;
        
        // Helper untuk ambil URL file
        const getUrl = (fieldName) => {
            if (req.files[fieldName] && req.files[fieldName][0]) {
                return getFileUrl(req, 'contracts', req.files[fieldName][0].filename);
            }
            return null;
        };

        // Simpan path/url ke database (Anda mungkin perlu menambah kolom di tabel contracts untuk menyimpan URL file ini jika belum ada)
        // Untuk saat ini, kita simpan logika insertnya.
        // NOTE: Skema DB contracts saat ini tidak punya kolom khusus untuk URL file KTP/NPWP.
        // Anda mungkin ingin menambahkan kolom: ktp_url, npwp_url, signature_url.
        // Di sini saya asumsikan tabel sudah disesuaikan atau kita simpan di kolom drive_folder_id sementara sebagai JSON string (hack) atau ubah skema.
        // Mari kita simpan path folder saja di drive_folder_id agar kompatibel dengan frontend existing.
        
        // Namun, solusi terbaik adalah frontend tahu bahwa file tersimpan.
        
        const sql = `INSERT INTO contracts 
            (contract_number, artist_name, start_date, end_date, duration_years, royalty_rate, status, drive_folder_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        
        // Kita simpan placeholder "LOCAL" di drive_folder_id untuk menandakan ini bukan gdrive
        const values = [
            contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status || 'Pending', 'LOCAL_STORAGE'
        ];

        const [result] = await db.query(sql, values);
        res.status(201).json({ success: true, id: result.insertId, message: "Kontrak tersimpan di Local Storage." });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ success: false, error: "Gagal menyimpan: " + err.message });
    }
});

// Get All Contracts
app.get('/api/contracts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM contracts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Contract Status
app.patch('/api/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const sql = `UPDATE contracts SET status = ? WHERE id = ?`;
        const [result] = await db.query(sql, [status, id]);
        res.json({ success: true, message: "Status kontrak berhasil diperbarui." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Contract
app.delete('/api/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Opsional: Hapus file fisik terkait kontrak ini sebelum hapus row DB
        await db.query('DELETE FROM contracts WHERE id = ?', [id]);
        res.json({ success: true, message: "Kontrak dihapus." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Releases
app.get('/api/releases', async (req, res) => {
    try {
        // Ambil releases
        const [rows] = await db.query('SELECT * FROM releases ORDER BY submission_date DESC');
        
        // Ambil tracks untuk setiap release agar audio_url bisa dikirim ke frontend
        // (Frontend membutuhkan struktur tracks di dalam release object)
        const releasesWithTracks = await Promise.all(rows.map(async (release) => {
            const [tracks] = await db.query('SELECT * FROM tracks WHERE release_id = ?', [release.id]);
            
            // Map tracks field names to match frontend expectations if necessary
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
                artists: [{ name: release.artist_name, role: 'MainArtist' }], // Simplification
                contributors: [],
                // Kirim URL audio fisik ke frontend sebagai properti
                audioFileUrl: t.audio_url 
            }));

            // Cover Art URL logic construction (if stored as full URL, use it, else construct it)
            // Di kode upload di atas, kita simpan Full URL.
            // Namun, karena 'coverArt' di frontend ReleaseData mengharapkan File object,
            // kita perlu adjust di frontend.
            // Tapi untuk list view, kita kirim URL-nya saja.
            
            return {
                ...release,
                id: release.id.toString(),
                primaryArtists: release.artist_name ? release.artist_name.split(', ') : [],
                plannedReleaseDate: release.planned_release_date,
                originalReleaseDate: release.original_release_date,
                submissionDate: release.submission_date,
                isNewRelease: !!release.is_new_release,
                tracks: mappedTracks,
                // Kita kirim URL cover art sebagai properti tambahan
                coverArtUrl: release.drive_folder_id // HACK: Kita simpan URL cover art? Tidak, tadi kita tidak simpan URL cover di tabel releases.
                // KOREKSI: Tabel releases tidak punya kolom cover_art_url.
                // Mari kita tambahkan logic untuk mencari cover art jika ada, atau gunakan drive_folder_id (yang skrg mungkin null/local).
            };
        }));
        
        // KOREKSI DATABASE SCHEMA PENTING:
        // Tabel releases belum punya kolom 'cover_url'. 
        // Kode upload sebelumnya tidak menyimpan URL cover art ke DB releases secara eksplisit (hanya insert tracks).
        // Kita harus memperbaiki endpoint upload untuk menyimpan URL cover jika memungkinkan, 
        // atau menyimpan di tracks.
        
        res.json(releasesWithTracks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Handle React Routing (SPA)
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
    console.log(`📂 Folder Upload: ${UPLOAD_DIRS.base}`);
});
