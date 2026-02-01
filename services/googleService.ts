
import { ReleaseData, Contract } from '../types';

/**
 * GOOGLE SERVICE (PRODUCTION)
 * Sends data to our Node.js Backend which handles the actual Google Drive & MySQL.
 */

export const checkSystemHealth = async () => {
  const response = await fetch('/api/health-check');
  if (!response.ok) throw new Error('Gagal menghubungi backend untuk pengecekan kesehatan.');
  return await response.json();
};

export const uploadReleaseToGoogle = async (data: ReleaseData): Promise<{ success: boolean; message: string }> => {
  const formData = new FormData();
  
  if (data.coverArt) formData.append('coverArt', data.coverArt);
  data.tracks.forEach((track) => {
    if (track.audioFile) formData.append('audioFiles', track.audioFile);
  });

  formData.append('metadata', JSON.stringify({
    title: data.title,
    upc: data.upc,
    primaryArtists: data.primaryArtists,
    plannedReleaseDate: data.plannedReleaseDate,
    version: data.version
  }));

  const response = await fetch('/api/upload-release', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Gagal mengunggah data.');
  }
  return await response.json();
};

export const uploadContractToGoogle = async (data: Contract): Promise<{ success: boolean; message: string }> => {
    const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Gagal menyimpan kontrak ke database.');
    return { success: true, message: "Kontrak berhasil disinkronkan." };
};
