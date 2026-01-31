
import { AnalysisResult, AnalysisSegment, CopyrightMatch } from '../types';

/**
 * MOCK ANALYSIS SERVICE
 * Simulates analyzing audio for AI generation and Copyright infringement.
 * NOW IMPROVED: Uses actual audio data heuristics (duration, loudness, buffer hash).
 * NO LONGER USES FILENAMES.
 */

const MOCK_COPYRIGHT_DB = [
  { title: "Shape of You", artist: "Ed Sheeran" },
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "Stay", artist: "The Kid LAROI & Justin Bieber" },
  { title: "As It Was", artist: "Harry Styles" },
  { title: "Flowers", artist: "Miley Cyrus" },
  { title: "Kill Bill", artist: "SZA" },
  { title: "Someone Like You", artist: "Adele" }
];

export const analyzeAudioTrack = async (file: File): Promise<AnalysisResult> => {
  // 1. Get real Audio Data for "Heuristic" simulation
  let duration = 0;
  let rms = 0;
  let contentHash = 0;
  
  try {
     const arrayBuffer = await file.arrayBuffer();
     const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
     const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
     duration = audioBuffer.duration;
     
     // Calculate RMS (Loudness) of the first 30 seconds
     const rawData = audioBuffer.getChannelData(0);
     let sum = 0;
     // Sample random points to create a "Fingerprint Hash"
     // This ensures the same file always produces the same result, regardless of name
     let hashSum = 0;
     
     const sampleCount = Math.min(rawData.length, 44100 * 30);
     for(let i=0; i<sampleCount; i++) {
        // RMS Calculation
        sum += rawData[i] * rawData[i];
        
        // Hash Calculation (Sample every 1000th point)
        if (i % 1000 === 0) {
            hashSum += Math.abs(rawData[i] * 10000);
        }
     }
     
     rms = Math.sqrt(sum / sampleCount);
     contentHash = Math.floor(hashSum + file.size); // Deterministic hash based on content

  } catch (e) {
     console.error("Analysis decoding failed", e);
     duration = 180; 
     rms = 0.1;
     contentHash = file.size; 
  }

  return new Promise((resolve) => {
    // 2. Heuristic Logic based on Audio Properties (NOT Filename)
    const SEGMENT_SIZE = 10;
    const TOTAL_SEGMENTS = Math.ceil(duration / SEGMENT_SIZE);
    const segments: AnalysisSegment[] = [];
    const copyrightMatches: CopyrightMatch[] = [];
    
    // --- A. AI Detection Heuristics (Based on Audio Engineering) ---
    
    // 1. Duration pattern: AI models (Suno/Udio) often output exact blocks
    // e.g., exactly 60.0s or 120.0s is suspicious. Natural songs are usually 3:02, 2:45 etc.
    const durationMod = duration % 60;
    const isExactBlock = durationMod < 1.0 || durationMod > 59.0;
    
    // 2. Loudness (RMS): AI tracks are often pre-limited/mastered very loud (RMS > 0.25)
    // Natural raw mixes are usually quieter (RMS < 0.15)
    const isLoud = rms > 0.22;
    
    // 3. Spectral Density Simulation (using the hash)
    // Determine if the "content" feels synthetic based on our deterministic hash
    const isSyntheticFingerprint = (contentHash % 100) < 30; // 30% chance based on audio data

    // Calculate Base Probability
    let baseAiProb = 10; // Base noise

    if (isExactBlock) baseAiProb += 40; // High penalty for exact AI-length blocks
    if (isLoud) baseAiProb += 25; // Penalty for overly compressed audio
    if (isSyntheticFingerprint) baseAiProb += 20;

    // Clamp Probability (0-99%)
    const aiProbability = Math.min(99, Math.max(5, Math.round(baseAiProb)));


    // --- B. Copyright Detection Heuristics (Fingerprinting Simulation) ---
    
    // Use the content hash to deterministically "match" a database song
    // Modulo logic simulates finding a match in a large DB
    const dbMatchIndex = contentHash % 25; // simulate 1 in 25 chance of match
    const isCopyrightMatch = dbMatchIndex < MOCK_COPYRIGHT_DB.length;

    
    // --- 3. Generate Segments ---
    
    for (let i = 0; i < TOTAL_SEGMENTS; i++) {
        const start = i * SEGMENT_SIZE;
        const end = Math.min((i + 1) * SEGMENT_SIZE, duration);
        
        let status: AnalysisSegment['status'] = 'CLEAN';
        let description = 'Clean audio';
        let confidence = 0;

        // Use segment index + contentHash to vary results across timeline
        const segmentRandom = (contentHash + i * 17) % 100;

        // Logic:
        // If Copyright Match is active, mark some segments as matched
        if (isCopyrightMatch && (segmentRandom > 70)) {
             status = 'COPYRIGHT_MATCH';
             description = 'Audio fingerprint match';
             confidence = 85 + (segmentRandom % 15);
             
             if (segmentRandom > 85) {
                 const dbMatch = MOCK_COPYRIGHT_DB[dbMatchIndex];
                 
                 const exists = copyrightMatches.find(m => m.title === dbMatch.title);
                 if (!exists) {
                    copyrightMatches.push({
                        title: dbMatch.title,
                        artist: dbMatch.artist,
                        platform: (segmentRandom % 2 === 0) ? 'Spotify' : 'YouTube Music',
                        matchPercentage: confidence,
                        segmentStart: start,
                        segmentEnd: end
                    });
                 }
             }
        } 
        // If AI Probability is high, mark segments as suspected
        else if (aiProbability > 60 && (segmentRandom < aiProbability)) {
             status = 'AI_DETECTED';
             description = 'Synthetic spectral pattern';
             confidence = aiProbability - 10 + (segmentRandom % 15);
        }

        segments.push({ start, end, status, description, confidence });
    }

    // Processing Delay for realism
    setTimeout(() => {
      resolve({
        isAnalyzing: false,
        isComplete: true,
        aiProbability,
        copyrightMatches,
        segments
      });
    }, 3000); // 3 seconds analysis time
  });
};
