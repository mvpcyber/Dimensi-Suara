
import { ReleaseData, Contract } from '../types';

/**
 * GOOGLE SERVICE (PRODUCTION)
 * Sends data to our Node.js Backend which handles the actual Google Drive & Sheets API.
 */

export const uploadReleaseToGoogle = async (data: ReleaseData): Promise<{ success: boolean; message: string }> => {
  const formData = new FormData();
  
  // Append files
  if (data.coverArt) formData.append('coverArt', data.coverArt);
  data.tracks.forEach((track, index) => {
    if (track.audioFile) formData.append('audioFiles', track.audioFile);
  });

  // Append metadata
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

  if (!response.ok) throw new Error('Failed to upload to server');
  return await response.json();
};

export const uploadContractToGoogle = async (data: Contract): Promise<{ success: boolean; message: string }> => {
    const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to save contract');
    return { success: true, message: "Contract synced successfully" };
};
