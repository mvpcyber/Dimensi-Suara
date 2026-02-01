
export const LANGUAGES = [
  "Indonesia", "United States", "United Kingdom", "Japan", "South Korea", "Malaysia", "Singapore"
];

export const VERSIONS = ["Original", "Remix", "Live", "Cover", "Radio Edit"];
export const ARTIST_ROLES = ["MainArtist", "FeaturedArtist", "Remixer"];
export const CONTRIBUTOR_TYPES = ["Performer", "Producer", "Engineer", "Mixer", "Mastering Engineer"];
export const EXPLICIT_OPTIONS = ["No", "Yes", "Clean"];
export const TRACK_GENRES = ["Pop", "Rock", "Hip Hop", "R&B", "Jazz", "Electronic", "Dangdut"];

export const DISTRIBUTION_PLATFORMS = ["Spotify", "Apple Music", "YouTube Music", "Deezer", "Tidal"];

export const PLATFORM_DOMAINS: Record<string, string> = {
  "Spotify": "spotify.com",
  "Apple Music": "apple.com",
  "YouTube Music": "music.youtube.com"
};

export const SOCIAL_PLATFORMS = {
  IN_HOUSE: [
    { id: 'TikTok', name: 'TikTok', domain: 'tiktok.com' },
    { id: 'Douyin', name: 'Douyin', domain: 'douyin.com' }
  ],
  EXTERNAL: [
    { id: 'Meta', name: 'Meta', domain: 'meta.com', helpText: 'Facebook & Instagram' }
  ]
};

// Fungsi aman untuk mengambil environment variable
const getClientId = () => {
  try {
    // Cek import.meta.env (Vite standard)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      // @ts-ignore
      return import.meta.env.VITE_GOOGLE_CLIENT_ID;
    }
  } catch (e) { console.warn("Error reading import.meta.env", e); }

  try {
    // Cek process.env (Vite 'define' replacement / Node fallback)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.VITE_GOOGLE_CLIENT_ID) {
      // @ts-ignore
      return process.env.VITE_GOOGLE_CLIENT_ID;
    }
  } catch (e) { console.warn("Error reading process.env", e); }

  return "";
};

export const GOOGLE_CONFIG = {
  CLIENT_ID: getClientId(),
  
  // ID Folder Google Drive (tempat upload lagu/kontrak) - Opsional jika ingin hardcode
  FOLDER_ID: "" 
};
