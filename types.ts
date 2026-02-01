
export interface TrackArtist {
  name: string;
  role: string;
}

export interface TrackContributor {
  name: string;
  type: string;
  role: string;
}

export interface AnalysisSegment {
  start: number;
  end: number;
  status: 'CLEAN' | 'AI_DETECTED' | 'COPYRIGHT_MATCH';
  description?: string;
  confidence: number; // 0-100
}

export interface CopyrightMatch {
  title: string;
  artist: string;
  platform: 'Spotify' | 'YouTube Music';
  matchPercentage: number;
  segmentStart: number;
  segmentEnd: number;
}

export interface AnalysisResult {
  isAnalyzing: boolean;
  isComplete: boolean;
  aiProbability: number; // 0-100
  copyrightMatches: CopyrightMatch[];
  segments: AnalysisSegment[]; // Per 10 seconds
}

export interface Track {
  id: string;
  // Files
  audioFile?: File | null;
  audioClip?: File | null;
  videoFile?: File | null;
  
  // Metadata
  trackNumber: string;
  releaseDate: string;
  isrc: string;
  title: string;
  duration: string; // MM:SS

  // Artists
  artists: TrackArtist[];

  // Details
  instrumental: string; // 'Yes' | 'No'
  genre: string;
  explicitLyrics: string; // 'Yes', 'No', 'Clean'
  composer: string;
  lyricist: string;
  lyrics: string;

  // Additional Contributors
  contributors: TrackContributor[];
  
  // Optional: Store analysis if we want to persist it
  analysis?: AnalysisResult;
}

export interface ReleaseData {
  id?: string; // Unique ID for the list
  status?: 'Pending' | 'Processing' | 'Live' | 'Rejected' | 'Draft';
  submissionDate?: string;
  aggregator?: string; // New Field
  
  // Rejection Data
  rejectionReason?: string;
  rejectionDescription?: string;

  // Step 1
  coverArt: File | null;
  upc: string; 
  title: string;
  language: string; 
  primaryArtists: string[];
  label: string;
  version: string;

  // Step 2
  tracks: Track[];

  // Step 3
  isNewRelease: boolean;
  originalReleaseDate: string;
  plannedReleaseDate: string;
  selectedPlatforms?: string[]; // Added: Platform selection
  socialPlatforms?: string[]; // Added: Social Platform selection
  
  // TikTok Pre-release
  tiktokPreRelease?: boolean;
  tiktokPreReleaseDate?: string;
  tiktokPreReleaseTime?: string;
}

export enum Step {
  INFO = 1,
  TRACKS = 2,
  DETAILS = 3,
  REVIEW = 4,
}

export type ReleaseType = 'SINGLE' | 'ALBUM';

// --- PUBLISHING TYPES ---

export interface Songwriter {
  id: string;
  name: string;
  role: 'Author' | 'Composer' | 'Author & Composer' | 'Arranger';
  share: number; // Percentage 0-100
}

export interface SavedSongwriter {
  id: string;
  // Display Name (Computed)
  name: string; 
  
  // Personal Details
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nik: string; // KTP
  npwp: string; // Tax ID
  
  // Address
  country: string;
  province: string;
  city: string;
  district: string;
  village: string;
  postalCode: string;
  address1: string;
  address2: string;

  // Bank Details
  bankName: string;
  bankBranch: string;
  accountName: string;
  accountNumber: string;

  // Legacy/Optional
  publisher?: string;
  ipi?: string;
}

export interface PublishingRegistration {
  id?: string; // Added for list view
  status?: 'Pending' | 'Approved' | 'Rejected'; // Added for list view
  submissionDate?: string; // Added for list view
  
  title: string;
  songCode: string; // New Field
  otherTitle: string;
  sampleLink: string;
  rightsGranted: {
    synchronization: boolean;
    mechanical: boolean;
    performing: boolean;
    printing: boolean;
    other: boolean;
  };
  performer: string;
  duration: string;
  genre: string;
  language: string;
  region: string;
  iswc: string;
  isrc: string;
  lyrics: string; // New Field
  note: string;
  songwriters: Songwriter[];
}

// --- CONTRACT TYPES ---

export interface Contract {
  id: string;
  contractNumber: string; 
  artistName: string; 
  startDate: string;
  endDate: string; 
  durationYears: number; 
  royaltyRate: number; 
  status: 'Pending' | 'Review' | 'Proses' | 'Selesai';
  createdDate: string;
  
  // Files
  ktpFile: File | null;
  npwpFile: File | null;
  signatureFile: File | null;
  
  // Final Document
  signedContractFile?: File | null;
}
