
import { ReleaseData, Contract } from '../types';

const getAuthHeaders = () => {
  const token = localStorage.getItem('google_drive_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const checkSystemHealth = async () => {
  try {
    const response = await fetch('/api/health-check', {
        headers: { 
            'Accept': 'application/json',
            ...getAuthHeaders()
        },
        cache: 'no-store'
    });
    
    if (!response.ok) {
        throw new Error(`Server merespon dengan status ${response.status}`);
    }
    
    return await response.json();
  } catch (err: any) {
    console.error("Health Check Failed:", err);
    throw err;
  }
};

export const getAllReleases = async (): Promise<ReleaseData[]> => {
    const response = await fetch('/api/releases');
    if (!response.ok) throw new Error('Gagal mengambil data rilis.');
    return await response.json();
};

export const uploadReleaseToGoogle = async (data: ReleaseData): Promise<{ success: boolean; message: string }> => {
  const formData = new FormData();
  if (data.coverArt) formData.append('coverArt', data.coverArt);
  data.tracks.forEach((track) => {
    if (track.audioFile) formData.append('audioFiles', track.audioFile);
  });

  formData.append('metadata', JSON.stringify(data));

  const response = await fetch('/api/upload-release', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  });

  if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Gagal menyimpan ke database.');
  }
  return await response.json();
};

export const uploadContractToGoogle = async (data: Contract): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    
    if (data.ktpFile) formData.append('ktpFile', data.ktpFile);
    if (data.npwpFile) formData.append('npwpFile', data.npwpFile);
    if (data.signatureFile) formData.append('signatureFile', data.signatureFile);
    
    formData.append('metadata', JSON.stringify({
        contractNumber: data.contractNumber,
        artistName: data.artistName,
        startDate: data.startDate,
        endDate: data.endDate,
        durationYears: data.durationYears,
        royaltyRate: data.royaltyRate,
        status: data.status
    }));

    const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
    });
    
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal menyimpan kontrak ke database.');
    }
    
    return await response.json();
};

export const updateContractStatus = async (id: string, status: string): Promise<void> => {
    const response = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify({ status })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal memperbarui status kontrak.');
    }
};
