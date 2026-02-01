
CREATE DATABASE IF NOT EXISTS dimensi_suara_db;

USE dimensi_suara_db;

-- Tabel untuk menyimpan data Kontrak Artis
CREATE TABLE IF NOT EXISTS contracts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    artist_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_years INT NOT NULL,
    royalty_rate INT NOT NULL,
    status ENUM('Pending', 'Review', 'Proses', 'Selesai') DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk menyimpan metadata Rilis Musik
CREATE TABLE IF NOT EXISTS releases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    upc VARCHAR(50),
    status ENUM('Pending', 'Processing', 'Live', 'Rejected') DEFAULT 'Pending',
    submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    artist_name VARCHAR(255),
    aggregator VARCHAR(100),
    drive_folder_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk menyimpan data Lagu (Track) di dalam rilis
CREATE TABLE IF NOT EXISTS tracks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    release_id INT,
    title VARCHAR(255) NOT NULL,
    isrc VARCHAR(50),
    track_number INT,
    duration VARCHAR(20),
    audio_url VARCHAR(255), -- Link/ID Drive
    FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);
