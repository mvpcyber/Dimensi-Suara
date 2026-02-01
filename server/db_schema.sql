
-- Buat Database
CREATE DATABASE IF NOT EXISTS dimensi_suara_db;
USE dimensi_suara_db;

-- 1. Tabel Users (Admin & Artist)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'User') DEFAULT 'User',
    full_name VARCHAR(255),
    contract_id INT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Aggregators (Partner Distribusi)
CREATE TABLE IF NOT EXISTS aggregators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO aggregators (name) VALUES 
('LokaMusik'), ('SoundOn'), ('Tunecore'), ('Believe'), ('DistroKid');

-- 3. Tabel Platforms (DSP - Spotify, Apple, dll)
CREATE TABLE IF NOT EXISTS platforms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO platforms (name, domain) VALUES 
('Spotify', 'spotify.com'),
('Apple Music', 'apple.com'),
('TikTok', 'tiktok.com'),
('YouTube Music', 'music.youtube.com'),
('Amazon Music', 'music.amazon.com'),
('Deezer', 'deezer.com'),
('Instagram/Facebook', 'meta.com');

-- 4. Tabel Analytics (Statistik Stream & Revenue)
CREATE TABLE IF NOT EXISTS analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform_name VARCHAR(100),
    streams BIGINT DEFAULT 0,
    revenue DECIMAL(15, 2) DEFAULT 0,
    month INT,
    year INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Contracts (Kontrak Kerjasama) - UPDATED
CREATE TABLE IF NOT EXISTS contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    artist_name VARCHAR(255) NOT NULL, -- Nama Panggung
    legal_name VARCHAR(255), -- Nama Sesuai KTP
    nik VARCHAR(50),
    phone VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Indonesia',
    citizenship VARCHAR(100),
    address TEXT,
    province VARCHAR(100),
    city VARCHAR(100),
    district VARCHAR(100),
    village VARCHAR(100),
    postal_code VARCHAR(20),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_years INT NOT NULL,
    royalty_rate INT NOT NULL,
    status ENUM('Pending', 'Review', 'Proses', 'Selesai') DEFAULT 'Pending',
    drive_folder_id VARCHAR(255) DEFAULT 'LOCAL',
    ktp_url VARCHAR(500),
    npwp_url VARCHAR(500),
    signature_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Releases (Header Rilis Album/Single)
CREATE TABLE IF NOT EXISTS releases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    upc VARCHAR(50),
    status ENUM('Pending', 'Processing', 'Live', 'Rejected', 'Draft') DEFAULT 'Pending',
    submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    artist_name VARCHAR(255),
    aggregator VARCHAR(100),
    cover_art_url VARCHAR(500),
    language VARCHAR(100),
    label VARCHAR(255),
    version VARCHAR(100),
    is_new_release BOOLEAN DEFAULT TRUE,
    original_release_date DATE,
    planned_release_date DATE,
    rejection_reason TEXT,
    rejection_description TEXT,
    selected_platforms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Tracks (Lagu dalam Rilis)
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
);
