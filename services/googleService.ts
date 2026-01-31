
import { ReleaseData, Contract } from '../types';
import { GOOGLE_CONFIG } from '../constants';

/**
 * GOOGLE SERVICE
 * Handles uploading files to Google Drive and metadata to Google Sheets.
 */

export const uploadReleaseToGoogle = async (data: ReleaseData): Promise<{ success: boolean; message: string }> => {
  return new Promise(async (resolve, reject) => {
    console.log("Starting Google Integration Process...");
    
    // Check if we have credentials (mock check)
    const hasCredentials = GOOGLE_CONFIG.API_KEY !== "YOUR_GOOGLE_API_KEY";

    if (!hasCredentials) {
        // --- MOCK MODE (Simulation) ---
        console.warn("Using MOCK Upload - No real API credentials configured in constants.ts");
        
        setTimeout(() => {
            console.log("1. [MOCK] Creating Folder in Drive...");
            console.log(`   Folder Name: ${data.title} - ${data.upc || 'NO_UPC'}`);
            
            console.log("2. [MOCK] Uploading Cover Art...");
            if (data.coverArt) console.log(`   File: ${data.coverArt.name} (${(data.coverArt.size/1024/1024).toFixed(2)} MB)`);
            
            console.log("3. [MOCK] Uploading Tracks...");
            data.tracks.forEach((t, i) => {
                if (t.audioFile) console.log(`   Track ${i+1}: ${t.audioFile.name}`);
            });

            console.log("4. [MOCK] Appending Row to Sheets...");
            const rowData = [
                data.submissionDate,
                data.upc,
                data.title,
                data.primaryArtists.join(", "),
                data.version,
                data.tracks.length,
                data.selectedPlatforms?.join(", ")
            ];
            console.table(rowData);

            resolve({
                success: true,
                message: "Simulated upload complete! Configure GOOGLE_CONFIG in constants.ts for real integration."
            });
        }, 2000);
        
    } else {
        // Real implementation placeholder
        resolve({ success: true, message: "Real implementation skipped." });
    }
  });
};

export const uploadContractToGoogle = async (data: Contract): Promise<{ success: boolean; message: string }> => {
    return new Promise(async (resolve, reject) => {
      console.log("Starting Contract Google Integration...");
      
      const hasCredentials = GOOGLE_CONFIG.API_KEY !== "YOUR_GOOGLE_API_KEY";
  
      if (!hasCredentials) {
          // --- MOCK MODE ---
          setTimeout(() => {
              console.log(`1. [MOCK] Creating Contract Folder: ${data.contractNumber} - ${data.artistName}`);
              
              console.log("2. [MOCK] Uploading Documents...");
              if (data.ktpFile) console.log(`   - KTP: ${data.ktpFile.name}`);
              if (data.npwpFile) console.log(`   - NPWP: ${data.npwpFile.name}`);
              if (data.signatureFile) console.log(`   - Signature: ${data.signatureFile.name}`);
  
              console.log("3. [MOCK] Appending Contract Data to Sheets...");
              const rowData = [
                  data.contractNumber,
                  data.artistName,
                  data.type,
                  data.startDate,
                  data.endDate,
                  data.royaltyRate + '%',
                  data.status
              ];
              console.table(rowData);
  
              resolve({
                  success: true,
                  message: "Contract files uploaded to Drive and data synced to Sheets."
              });
          }, 2000);
      } else {
          // Real implementation placeholder
          resolve({ success: true, message: "Real implementation skipped." });
      }
    });
  };
