
import { ReleaseData, Contract } from '../types';

export const checkSystemHealth = async () => {
  try {
    const response = await fetch('/api/health-check', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
    });
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        // Return a dummy offline status instead of throwing, so the UI handles it gracefully
        return {
            database: { connected: false, message: 'Invalid Response (HTML)' },
            storage: { connected: false, message: 'Check Connection' }
        };
    }

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
    
    // Append files
    if (data.ktpFile) formData.append('ktpFile', data.ktpFile);
    if (data.npwpFile) formData.append('npwpFile', data.npwpFile);
    if (data.signatureFile) formData.append('signatureFile', data.signatureFile);
    
    // Append metadata as stringified JSON
    formData.append('metadata', JSON.stringify({
        contractNumber: data.contractNumber,
        artistName: data.artistName,
        legalName: data.legalName,
        nik: data.nik,
        phone: data.phone,
        country: data.country,
        citizenship: data.citizenship,
        address: data.address,
        province: data.province,
        city: data.city,
        district: data.district,
        village: data.village,
        postalCode: data.postalCode,
        startDate: data.startDate,
        endDate: data.endDate,
        durationYears: data.durationYears,
        royaltyRate: data.royaltyRate,
        status: data.status
    }));

    const response = await fetch('/api/contracts', {
        method: 'POST',
        body: formData // Use FormData for multi-part upload
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal memperbarui status kontrak.');
    }
};
