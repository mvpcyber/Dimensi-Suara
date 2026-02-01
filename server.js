
import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_dimensi_suara_2024';

app.use(cors());
app.use(express.json());

// --- KONFIGURASI SMTP EMAIL ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', 
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, 
    auth: {
        user: process.env.SMTP_USER || 'email@domain.com',
        pass: process.env.SMTP_PASS || 'password_app'
    }
});

// --- KONFIGURASI FOLDER UPLOAD (LOCAL STORAGE) ---
const UPLOAD_DIRS = {
    base: path.join(__dirname, 'public/uploads'),
    covers: path.join(__dirname, 'public/uploads/covers'),
    audio: path.join(__dirname, 'public/uploads/audio'),
    contracts: path.join(__dirname, 'public/uploads/contracts'),
    others: path.join(__dirname, 'public/uploads/others')
};

Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

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

const getFileUrl = (req, folderName, filename) => {
    if (!filename) return '';
    return `${req.protocol}://${req.get('host')}/uploads/${folderName}/${filename}`;
};

// --- ROUTES ---

// Auth
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'User tidak ditemukan' });

        const user = rows[0];
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(401).json({ error: 'Password salah' });

        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            token, 
            user: { username: user.username, role: user.role, fullName: user.full_name } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- SETTINGS ROUTES ---

// 1. Aggregators
app.get('/api/aggregators', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM aggregators ORDER BY name ASC");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/aggregators', async (req, res) => {
    const { name } = req.body;
    try {
        await db.query("INSERT INTO aggregators (name) VALUES (?)", [name]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/aggregators/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM aggregators WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Platforms (DSP)
app.get('/api/platforms', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM platforms ORDER BY name ASC");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/platforms', async (req, res) => {
    const { name, domain } = req.body;
    try {
        await db.query("INSERT INTO platforms (name, domain) VALUES (?, ?)", [name, domain || '']);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/platforms/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM platforms WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Admins
app.get('/api/admins', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, username, email, full_name, created_at FROM users WHERE role = 'Admin'");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admins', async (req, res) => {
    const { username, email, password, fullName } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await db.query(
            "INSERT INTO users (username, email, password_hash, role, full_name) VALUES (?, ?, ?, 'Admin', ?)",
            [username, email, hash, fullName]
        );
        res.json({ success: true, message: 'Admin baru berhasil ditambahkan' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- STATISTICS ROUTE ---
app.get('/api/statistics', async (req, res) => {
    try {
        const [releaseCounts] = await db.query(`
            SELECT 
                COUNT(*) as total_releases,
                SUM(CASE WHEN (SELECT COUNT(*) FROM tracks WHERE tracks.release_id = releases.id) = 1 THEN 1 ELSE 0 END) as singles,
                SUM(CASE WHEN (SELECT COUNT(*) FROM tracks WHERE tracks.release_id = releases.id) > 1 THEN 1 ELSE 0 END) as albums
            FROM releases
        `);
        const [trackCount] = await db.query("SELECT COUNT(*) as total_tracks FROM tracks");
        const [analytics] = await db.query("SELECT platform_name, SUM(streams) as total_streams, SUM(revenue) as total_revenue FROM analytics GROUP BY platform_name");
        
        res.json({
            catalog: {
                totalTracks: trackCount[0].total_tracks,
                albums: releaseCounts[0].albums,
                singles: releaseCounts[0].singles
            },
            platforms: analytics
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USER & CONTRACT ROUTES ---

app.post('/api/users/generate', async (req, res) => {
    const { contractId, email } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const [contracts] = await connection.query('SELECT * FROM contracts WHERE id = ?', [contractId]);
        if (contracts.length === 0) throw new Error('Kontrak tidak ditemukan');
        const contract = contracts[0];

        const cleanName = contract.artist_name.replace(/\s+/g, '').toLowerCase().substring(0, 10);
        const randomStr = Math.random().toString(36).slice(-4);
        const username = `${cleanName}${randomStr}`;
        const rawPassword = Math.random().toString(36).slice(-8); 
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        await connection.query(
            `INSERT INTO users (username, email, password_hash, role, full_name, contract_id) 
             VALUES (?, ?, ?, 'User', ?, ?)`,
            [username, email, passwordHash, contract.artist_name, contractId]
        );

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: email,
            subject: 'Aktivasi Akun Artist - Dimensi Suara',
            html: `
                <h3>Selamat Bergabung, ${contract.artist_name}!</h3>
                <p>Akun CMS Anda telah dibuat:</p>
                <p>Username: <b>${username}</b><br>Password: <b>${rawPassword}</b></p>
                <p>Login di: <a href="${req.protocol}://${req.get('host')}">Dashboard</a></p>
            `
        };
        await transporter.sendMail(mailOptions);

        await connection.commit();
        res.json({ success: true, message: `User ${username} dibuat & email terkirim.` });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.get('/api/users/candidates', async (req, res) => {
    try {
        const sql = `
            SELECT * FROM contracts 
            WHERE status = 'Selesai' 
            AND id NOT IN (SELECT contract_id FROM users WHERE contract_id IS NOT NULL)
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, username, email, role, full_name, created_at FROM users");
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- RELEASE UPLOAD & DATA ---

app.get('/api/health-check', async (req, res) => {
    const status = {
        database: { connected: false, message: 'Checking...' },
        storage: { connected: false, message: 'Checking...' }
    };
    try {
        await db.query('SELECT 1');
        status.database = { connected: true, message: 'Online' };
    } catch(e) { status.database = { connected: false, message: e.message }; }
    
    try {
        fs.accessSync(UPLOAD_DIRS.base, fs.constants.W_OK);
        status.storage = { connected: true, message: 'Writable' };
    } catch(e) { status.storage = { connected: false, message: e.message }; }
    
    res.json(status);
});

app.post('/api/upload-release', upload.fields([{ name: 'coverArt', maxCount: 1 }, { name: 'audioFiles' }]), async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const metadata = JSON.parse(req.body.metadata);
        
        let coverArtUrl = '';
        if (req.files['coverArt'] && req.files['coverArt'][0]) {
            coverArtUrl = getFileUrl(req, 'covers', req.files['coverArt'][0].filename);
        }

        const selectedPlatformsJson = JSON.stringify(metadata.selectedPlatforms || []);

        const [releaseResult] = await connection.query(
            `INSERT INTO releases (title, upc, status, artist_name, label, language, version, is_new_release, original_release_date, planned_release_date, aggregator, cover_art_url, selected_platforms, submission_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [metadata.title, metadata.upc, 'Pending', metadata.primaryArtists.join(', '), metadata.label, metadata.language, metadata.version, metadata.isNewRelease ? 1 : 0, metadata.originalReleaseDate || null, metadata.plannedReleaseDate || null, metadata.aggregator || null, coverArtUrl, selectedPlatformsJson]
        );
        const releaseId = releaseResult.insertId;

        const uploadedAudioFiles = req.files['audioFiles'] || [];
        for (let i = 0; i < metadata.tracks.length; i++) {
            const track = metadata.tracks[i];
            let audioUrl = '';
            if (uploadedAudioFiles[i]) audioUrl = getFileUrl(req, 'audio', uploadedAudioFiles[i].filename);

            await connection.query(
                `INSERT INTO tracks (release_id, title, track_number, isrc, duration, genre, explicit_lyrics, composer, lyricist, lyrics, audio_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [releaseId, track.title, track.trackNumber, track.isrc, track.duration, track.genre, track.explicitLyrics, track.composer, track.lyricist, track.lyrics, audioUrl]
            );
        }
        await connection.commit();
        res.json({ success: true, message: "Rilis berhasil disimpan!" });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

// ... Contracts UPDATED ...
app.post('/api/contracts', upload.fields([{ name: 'ktpFile', maxCount: 1 }, { name: 'npwpFile', maxCount: 1 }, { name: 'signatureFile', maxCount: 1 }]), async (req, res) => {
    try {
        const metadata = JSON.parse(req.body.metadata);
        const { 
            contractNumber, artistName, startDate, endDate, durationYears, royaltyRate, status,
            // New Fields
            legalName, nik, phone, country, citizenship, address, province, city, district, village, postalCode
        } = metadata;
        
        const ktpUrl = req.files['ktpFile'] ? getFileUrl(req, 'contracts', req.files['ktpFile'][0].filename) : '';
        const npwpUrl = req.files['npwpFile'] ? getFileUrl(req, 'contracts', req.files['npwpFile'][0].filename) : '';
        const signatureUrl = req.files['signatureFile'] ? getFileUrl(req, 'contracts', req.files['signatureFile'][0].filename) : '';

        const sql = `INSERT INTO contracts 
            (contract_number, artist_name, legal_name, nik, phone, country, citizenship, address, province, city, district, village, postal_code, start_date, end_date, duration_years, royalty_rate, status, drive_folder_id, ktp_url, npwp_url, signature_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const values = [
            contractNumber, artistName, 
            legalName || null, nik || null, phone || null, country || 'Indonesia', citizenship || null, address || null, province || null, city || null, district || null, village || null, postalCode || null,
            startDate, endDate, durationYears, royaltyRate, status || 'Pending', 'LOCAL', ktpUrl, npwpUrl, signatureUrl
        ];
        
        const [result] = await db.query(sql, values);
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { 
        console.error("Contract Error:", err);
        res.status(500).json({ success: false, error: err.message }); 
    }
});

app.get('/api/contracts', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM contracts ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/contracts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await db.query('UPDATE contracts SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/contracts/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM contracts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/releases', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM releases ORDER BY submission_date DESC');
        const releasesWithTracks = await Promise.all(rows.map(async (release) => {
            const [tracks] = await db.query('SELECT * FROM tracks WHERE release_id = ? ORDER BY track_number ASC', [release.id]);
            let platforms = [];
            try { platforms = JSON.parse(release.selected_platforms || '[]'); } catch(e) {}

            return {
                ...release,
                id: release.id.toString(),
                primaryArtists: release.artist_name ? release.artist_name.split(', ') : [],
                isNewRelease: !!release.is_new_release,
                selectedPlatforms: platforms,
                tracks: tracks.map(t => ({
                    ...t,
                    id: t.id.toString(),
                    trackNumber: t.track_number,
                    explicitLyrics: t.explicit_lyrics,
                    artists: [{ name: release.artist_name, role: 'MainArtist' }],
                    contributors: [],
                    audioFileUrl: t.audio_url 
                })),
                coverArtUrl: release.cover_art_url 
            };
        }));
        res.json(releasesWithTracks);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Serve static files AFTER API routes to ensure API priority
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

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
