
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
    contract_id INT NULL, -- Jika user adalah artist dari kontrak tertentu
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Admin (Password: admin123)
-- Hash bcrypt untuk 'admin123' adalah $2a$10$X.w.... (disederhanakan untuk contoh import, server.js akan handle pembuatan otomatis jika kosong)
-- INSERT INTO users (username, email, password_hash, role, full_name) VALUES 
-- ('admin', 'admin@dimensisuara.com', '$2a$10$TargetHashGeneratedByBcrypt', 'Admin', 'Super Admin');

-- 2. Tabel Contracts (Kontrak Kerjasama)
CREATE TABLE IF NOT EXISTS contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    artist_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_years INT NOT NULL,
    royalty_rate INT NOT NULL,
    status ENUM('Pending', 'Review', 'Proses', 'Selesai') DEFAULT 'Pending',
    drive_folder_id VARCHAR(255) DEFAULT 'LOCAL', -- Path folder lokal atau ID GDrive
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Releases (Header Rilis Album/Single)
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Tracks (Lagu dalam Rilis)
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
