
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

export const GOOGLE_CONFIG = {
  // Client ID dari gambar Google Console Anda
  CLIENT_ID: "1083744045117-p0p143eububq812pnd2q4091v7itp9of.apps.googleusercontent.com",
  
  // ID Folder Google Drive (tempat upload lagu/kontrak)
  FOLDER_ID: "1_example_folder_id_anda" 
};
