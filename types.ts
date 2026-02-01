

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
  confidence: number; 
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
  aiProbability: number;
  copyrightMatches: CopyrightMatch[];
  segments: AnalysisSegment[];
}

export interface Track {
  id: string;
  audioFile?: File | null;
  audioClip?: File | null;
  videoFile?: File | null;
  trackNumber: string;
  releaseDate: string;
  isrc: string;
  title: string;
  duration: string;
  artists: TrackArtist[];
  instrumental: string; 
  genre: string;
  explicitLyrics: string; 
  composer: string;
  lyricist: string;
  lyrics: string;
  contributors: TrackContributor[];
  analysis?: AnalysisResult;
}

export interface ReleaseData {
  id?: string;
  status?: 'Pending' | 'Processing' | 'Live' | 'Rejected' | 'Draft';
  submissionDate?: string;
  aggregator?: string;
  rejectionReason?: string;
  rejectionDescription?: string;
  coverArt: File | null;
  upc: string; 
  title: string;
  language: string; 
  primaryArtists: string[];
  label: string;
  version: string;
  tracks: Track[];
  isNewRelease: boolean;
  originalReleaseDate: string;
  plannedReleaseDate: string;
  selectedPlatforms?: string[];
  socialPlatforms?: string[];
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

export interface Songwriter {
  id: string;
  name: string;
  role: 'Author' | 'Composer' | 'Author & Composer' | 'Arranger';
  share: number;
}

export interface SavedSongwriter {
  id: string;
  name: string; 
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nik: string; 
  npwp: string; 
  country: string;
  province: string;
  city: string;
  district: string;
  village: string;
  postalCode: string;
  address1: string;
  address2: string;
  bankName: string;
  bankBranch: string;
  accountName: string;
  accountNumber: string;
  publisher?: string;
  ipi?: string;
}

export interface PublishingRegistration {
  id?: string; 
  status?: 'Pending' | 'Approved' | 'Rejected';
  submissionDate?: string; 
  title: string;
  songCode: string; 
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
  lyrics: string; 
  note: string;
  songwriters: Songwriter[];
}

export interface Contract {
  id: string;
  contractNumber: string; 
  artistName: string; // Nama Panggung
  
  // Data Diri Baru
  legalName?: string; // Nama Sesuai KTP
  nik?: string;
  phone?: string;
  country?: string;
  citizenship?: string;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  village?: string;
  postalCode?: string;

  startDate: string;
  endDate: string; 
  durationYears: number; 
  royaltyRate: number; 
  status: 'Pending' | 'Review' | 'Proses' | 'Selesai';
  createdDate: string;
  
  ktpFile: File | null;
  npwpFile: File | null;
  signatureFile: File | null;
}