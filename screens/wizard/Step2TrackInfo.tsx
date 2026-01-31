
import React, { useState, useRef, useEffect } from 'react';
import { ReleaseData, Track, TrackArtist, TrackContributor, ReleaseType } from '../../types';
import { Music, Trash2, PlusCircle, Info, ChevronDown, ChevronUp, FileAudio, Video, Mic2, User, UserPlus, Loader2, Scissors, Play, Pause, X, Check } from 'lucide-react';
import { ARTIST_ROLES, CONTRIBUTOR_TYPES, EXPLICIT_OPTIONS, TRACK_GENRES } from '../../constants';
import { processFullAudio, cropAndConvertAudio, getAudioDuration } from '../../utils/audioProcessing';

interface Props {
  data: ReleaseData;
  updateData: (updates: Partial<ReleaseData>) => void;
  releaseType: ReleaseType;
}

// Sub-component for Audio Preview
const AudioPreview: React.FC<{ file: File }> = ({ file }) => {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    if (!url) return null;

    return (
        <audio controls className="w-full mt-2 h-8">
            <source src={url} type={file.type} />
            Your browser does not support the audio element.
        </audio>
    );
};

export const Step2TrackInfo: React.FC<Props> = ({ data, updateData, releaseType }) => {
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  
  // Track processing state
  const [processingState, setProcessingState] = useState<{ [key: string]: boolean }>({});

  // Trimmer State
  const [trimmerState, setTrimmerState] = useState<{
    isOpen: boolean;
    trackId: string | null;
    rawFile: File | null;
    duration: number;
    startTime: number;
    isPlaying: boolean;
  }>({
    isOpen: false,
    trackId: null,
    rawFile: null,
    duration: 0,
    startTime: 0,
    isPlaying: false
  });

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // Stable Audio URL State to prevent src changing on every render
  const [stableAudioUrl, setStableAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (trimmerState.rawFile) {
        const url = URL.createObjectURL(trimmerState.rawFile);
        setStableAudioUrl(url);
        return () => URL.revokeObjectURL(url);
    }
    setStableAudioUrl(null);
  }, [trimmerState.rawFile]);

  // Initialize first track if empty
  useEffect(() => {
    if (data.tracks.length === 0) {
       addTrack();
    }
  }, []);

  // --- Trimmer Helpers ---
  const handleTrimmerPlayToggle = () => {
    if (previewAudioRef.current) {
        if (trimmerState.isPlaying) {
            previewAudioRef.current.pause();
            setTrimmerState(prev => ({ ...prev, isPlaying: false }));
        } else {
            previewAudioRef.current.currentTime = trimmerState.startTime;
            const playPromise = previewAudioRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                         setTrimmerState(prev => ({ ...prev, isPlaying: true }));
                    })
                    .catch(error => {
                        console.log("Playback interrupted or failed:", error);
                        // Reset playing state if failed
                        setTrimmerState(prev => ({ ...prev, isPlaying: false }));
                    });
            }
        }
    }
  };

  const handleTrimmerSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = Number(e.target.value);
    setTrimmerState(prev => ({ ...prev, startTime: newStart }));
    
    // Update audio position if playing or paused
    if (previewAudioRef.current) {
        // If the difference is significant, update current time
        if (Math.abs(previewAudioRef.current.currentTime - newStart) > 0.5) {
             previewAudioRef.current.currentTime = newStart;
        }
    }
  };

  const closeTrimmer = () => {
    if (previewAudioRef.current) {
        previewAudioRef.current.pause();
    }
    setTrimmerState({
        isOpen: false,
        trackId: null,
        rawFile: null,
        duration: 0,
        startTime: 0,
        isPlaying: false
    });
  };

  const saveTrimmedAudio = async () => {
      if (!trimmerState.rawFile || !trimmerState.trackId) return;
      
      const track = data.tracks.find(t => t.id === trimmerState.trackId);
      const trackTitle = track?.title || `Track-${track?.trackNumber}`;
      const processKey = `${trimmerState.trackId}-audioClip`;

      setProcessingState(prev => ({ ...prev, [processKey]: true }));
      closeTrimmer(); // Close inline trimmer

      try {
        const processedFile = await cropAndConvertAudio(
            trimmerState.rawFile,
            trimmerState.startTime,
            60, // Duration fixed to 60s
            trackTitle
        );
        updateTrack(trimmerState.trackId, { audioClip: processedFile });
      } catch (error) {
          console.error(error);
          alert("Failed to trim audio.");
      } finally {
        setProcessingState(prev => {
            const newState = { ...prev };
            delete newState[processKey];
            return newState;
        });
      }
  };

  const toggleExpand = (id: string) => {
    setExpandedTrackId(expandedTrackId === id ? null : id);
  };

  const addTrack = () => {
    if (releaseType === 'SINGLE' && data.tracks.length >= 1) return;

    const inheritedArtists: TrackArtist[] = data.primaryArtists
      .filter(name => name.trim() !== "")
      .map(name => ({ name, role: "MainArtist" }));

    const initialArtists = inheritedArtists.length > 0 ? inheritedArtists : [{ name: "", role: "MainArtist" }];

    const newTrack: Track = {
      id: Date.now().toString(),
      title: data.title || "", 
      trackNumber: (data.tracks.length + 1).toString(),
      duration: "",
      releaseDate: data.plannedReleaseDate || "",
      isrc: "",
      instrumental: "No", // Default NO
      genre: "",
      explicitLyrics: "No",
      composer: "",
      lyricist: "",
      lyrics: "",
      artists: initialArtists,
      contributors: [],
    };
    const newTracks = [...data.tracks, newTrack];
    updateData({ tracks: newTracks });
    setExpandedTrackId(newTrack.id);
  };

  const removeTrack = (id: string) => {
    if (releaseType === 'SINGLE') return;
    if (confirm('Are you sure you want to remove this track?')) {
        updateData({ tracks: data.tracks.filter(t => t.id !== id) });
    }
  };

  const updateTrack = (id: string, updates: Partial<Track>) => {
    const updatedTracks = data.tracks.map(t => 
      t.id === id ? { ...t, ...updates } : t
    );
    updateData({ tracks: updatedTracks });
  };

  // --- File Handlers ---
  const handleFileChange = async (trackId: string, field: 'audioFile' | 'videoFile' | 'audioClip', file: File | null) => {
    if (!file) {
        updateTrack(trackId, { [field]: null });
        return;
    }

    const processKey = `${trackId}-${field}`;
    const track = data.tracks.find(t => t.id === trackId);
    // Fallback title if empty
    const trackNameBase = track?.title && track.title.trim() !== "" ? track.title : `Track-${track?.trackNumber}`;

    if (field === 'videoFile') {
        updateTrack(trackId, { [field]: file });
        return;
    }

    // 1. Handle Full Audio (WAV Force Convert & Rename)
    if (field === 'audioFile') {
        setProcessingState(prev => ({ ...prev, [processKey]: true }));
        try {
            // Convert to WAV 24bit/48kHz and Rename
            const processedFile = await processFullAudio(file, trackNameBase);
            updateTrack(trackId, { audioFile: processedFile });
        } catch (error) {
            console.error("File processing error:", error);
            alert("Error processing Full Audio.");
        } finally {
            setProcessingState(prev => {
                const newState = { ...prev };
                delete newState[processKey];
                return newState;
            });
        }
    } 
    
    // 2. Handle Audio Clip (Open Trimmer)
    else if (field === 'audioClip') {
        try {
            const duration = await getAudioDuration(file);
            setTrimmerState({
                isOpen: true,
                trackId: trackId,
                rawFile: file,
                duration: duration,
                startTime: 0,
                isPlaying: false
            });
            // We do NOT update track.audioClip yet. We wait for user to save in Trimmer.
        } catch (e) {
            alert("Could not read audio file for clipping.");
        }
    }
  };

  // --- Nested Array Handlers ---
  const handleArtistChange = (trackId: string, index: number, field: keyof TrackArtist, value: string) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    const newArtists = [...track.artists];
    newArtists[index] = { ...newArtists[index], [field]: value };
    updateTrack(trackId, { artists: newArtists });
  };

  const addArtist = (trackId: string) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    updateTrack(trackId, { artists: [...track.artists, { name: "", role: "MainArtist" }] });
  };

  const removeArtist = (trackId: string, index: number) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    if (track.artists.length > 1) {
        updateTrack(trackId, { artists: track.artists.filter((_, i) => i !== index) });
    }
  };

  const handleContributorChange = (trackId: string, index: number, field: keyof TrackContributor, value: string) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    const newContribs = [...track.contributors];
    newContribs[index] = { ...newContribs[index], [field]: value };
    updateTrack(trackId, { contributors: newContribs });
  };

  const addContributor = (trackId: string) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    updateTrack(trackId, { contributors: [...track.contributors, { name: "", type: "Performer", role: "" }] });
  };

  const removeContributor = (trackId: string, index: number) => {
    const track = data.tracks.find(t => t.id === trackId);
    if (!track) return;
    updateTrack(trackId, { contributors: track.contributors.filter((_, i) => i !== index) });
  };

  return (
    <div className="w-full max-w-5xl mx-auto relative">
       <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-6">
        <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Tracklist</h2>
            <p className="text-slate-500">Upload audio and fill in details for each track.</p>
        </div>
        
        {releaseType === 'ALBUM' && (
          <button 
              onClick={addTrack}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5 text-sm"
          >
              <PlusCircle size={18} />
              Add Track
          </button>
        )}
      </div>
      
      <div className="space-y-6">
        {data.tracks.map((track, index) => {
            const isExpanded = expandedTrackId === track.id;
            const isProcessingAudio = processingState[`${track.id}-audioFile`];
            const isProcessingClip = processingState[`${track.id}-audioClip`];
            
            // Check if Trimmer should be active for this specific track
            const isTrimmerActive = trimmerState.isOpen && trimmerState.trackId === track.id && trimmerState.rawFile;
            
            const isInstrumental = track.instrumental === 'Yes';

            return (
                <div key={track.id} className={`bg-white rounded-2xl border transition-all duration-300 ${isExpanded ? 'border-blue-200 shadow-xl ring-1 ring-blue-50' : 'border-gray-200 hover:border-blue-300'}`}>
                    {/* Header */}
                    <div 
                        className="flex items-center justify-between p-5 cursor-pointer"
                        onClick={() => toggleExpand(track.id)}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isExpanded ? 'bg-blue-500 text-white' : 'bg-gray-100 text-slate-500'}`}>
                                {track.trackNumber}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${track.title ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                                    {track.title || "Untitled Track"}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                    {isProcessingAudio ? (
                                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                                            <Loader2 size={12} className="animate-spin" /> Converting...
                                        </span>
                                    ) : track.audioFile ? (
                                        <span className="flex items-center gap-1 text-green-600 font-medium">
                                            <FileAudio size={12} /> Audio Ready
                                        </span>
                                    ) : null}
                                    
                                    {track.videoFile && (
                                        <span className="flex items-center gap-1 text-purple-600 font-medium">
                                            <Video size={12} /> Video Attached
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             {/* Only show delete button if it's an Album */}
                             {releaseType === 'ALBUM' && (
                               <button 
                                  onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
                                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                               >
                                  <Trash2 size={18} />
                               </button>
                             )}
                            {isExpanded ? <ChevronUp className="text-blue-500" /> : <ChevronDown className="text-gray-400" />}
                        </div>
                    </div>

                    {/* Content */}
                    {isExpanded && (
                        <div className="p-6 pt-2 border-t border-gray-100 animate-fade-in">
                            
                            {/* 1. File Uploads */}
                            <div className="bg-slate-50 rounded-xl p-5 mb-8 border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <FileAudio size={16} /> Files
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* FULL AUDIO */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 flex items-center justify-between">
                                            <span>Full Audio (WAV) <span className="text-red-500">*</span></span>
                                            {isProcessingAudio && <span className="text-xs text-blue-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Converting...</span>}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                accept="audio/*"
                                                disabled={isProcessingAudio}
                                                onChange={(e) => handleFileChange(track.id, 'audioFile', e.target.files?.[0] || null)}
                                                className={`block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold cursor-pointer border border-gray-200 rounded-lg bg-white
                                                    ${isProcessingAudio ? 'opacity-50 cursor-not-allowed' : 'file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200'}
                                                `}
                                            />
                                            {track.audioFile ? (
                                                <div className="mt-2">
                                                    <p className="text-[10px] text-green-600 font-bold mb-1 truncate">
                                                        ✅ Uploaded: {track.audioFile.name}
                                                    </p>
                                                    <AudioPreview file={track.audioFile} />
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Auto-converts to WAV 24-bit 48kHz & Renames</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* MUSIC VIDEO */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-slate-600 flex items-center justify-between">
                                            <span>Music Video (Optional)</span>
                                            <Info size={14} className="text-slate-400" />
                                        </label>
                                        <input 
                                            type="file" 
                                            accept="video/*"
                                            onChange={(e) => handleFileChange(track.id, 'videoFile', e.target.files?.[0] || null)}
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer border border-gray-200 rounded-lg bg-white"
                                        />
                                    </div>

                                    {/* AUDIO CLIP */}
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-semibold text-slate-600 flex items-center justify-between">
                                            <span>Audio Clip (60s) <span className="text-red-500">*</span></span>
                                            {isProcessingClip && <span className="text-xs text-orange-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Processing...</span>}
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                accept="audio/*"
                                                disabled={isProcessingClip}
                                                onChange={(e) => handleFileChange(track.id, 'audioClip', e.target.files?.[0] || null)}
                                                className={`block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold cursor-pointer border border-gray-200 rounded-lg bg-white
                                                    ${isProcessingClip ? 'opacity-50 cursor-not-allowed' : 'file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200'}
                                                `}
                                            />
                                            {track.audioClip ? (
                                                <div className="mt-2">
                                                    <p className="text-[10px] text-orange-600 font-bold mb-1 truncate">
                                                        ✂️ Clipped: {track.audioClip.name}
                                                    </p>
                                                    <AudioPreview file={track.audioClip} />
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Opens Trimmer Tool on upload</p>
                                            )}
                                        </div>

                                        {/* INLINE TRIMMER UI */}
                                        {isTrimmerActive && (
                                            <div className="mt-4 p-4 bg-white rounded-xl border-2 border-blue-100 shadow-sm animate-fade-in">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                        <Scissors size={18} className="text-blue-500" />
                                                        Trim Audio Clip
                                                    </h3>
                                                    <button onClick={closeTrimmer} className="text-slate-400 hover:text-slate-600">
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200">
                                                    <div className="text-center mb-3">
                                                        <div className="text-xl font-mono font-bold text-blue-600">
                                                            {new Date(trimmerState.startTime * 1000).toISOString().substr(14, 5)} - {new Date((trimmerState.startTime + 60) * 1000).toISOString().substr(14, 5)}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-1">Duration: 60 Seconds</p>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                         <button 
                                                            onClick={handleTrimmerPlayToggle}
                                                            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0"
                                                         >
                                                            {trimmerState.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
                                                         </button>
                                                         <div className="flex-1 relative">
                                                             <input 
                                                                type="range" 
                                                                min="0" 
                                                                max={Math.max(0, trimmerState.duration - 60)} 
                                                                step="1" 
                                                                value={trimmerState.startTime}
                                                                onChange={handleTrimmerSliderChange}
                                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                             />
                                                         </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Hidden Audio for preview logic */}
                                                <audio 
                                                    ref={previewAudioRef} 
                                                    src={stableAudioUrl || undefined} 
                                                    onTimeUpdate={(e) => {
                                                        if (e.currentTarget.currentTime >= trimmerState.startTime + 60) {
                                                            e.currentTarget.currentTime = trimmerState.startTime;
                                                        }
                                                    }}
                                                />

                                                <div className="flex gap-3 justify-end">
                                                    <button 
                                                        onClick={closeTrimmer}
                                                        className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button 
                                                        onClick={saveTrimmedAudio}
                                                        className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Check size={14} />
                                                        Crop & Convert
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-100 mb-8" />

                            {/* 2. Basic Metadata */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Track Number <span className="text-red-500">*</span></label>
                                    <input 
                                        value={track.trackNumber}
                                        onChange={(e) => updateTrack(track.id, { trackNumber: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        placeholder="1"
                                    />
                                </div>
                                {/* Release Date Field Removed as per request */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">ISRC Code</label>
                                    <input 
                                        value={track.isrc}
                                        onChange={(e) => updateTrack(track.id, { isrc: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none bg-gray-50 placeholder-gray-400"
                                        placeholder="e.g. USABC1234567"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Track Title <span className="text-red-500">*</span></label>
                                    <input 
                                        value={track.title}
                                        onChange={(e) => updateTrack(track.id, { title: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        placeholder="Enter song title"
                                    />
                                </div>
                            </div>

                            {/* 3. Artists */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    Artists <span className="text-red-500">*</span>
                                    <span title="Add all main artists and featured artists here.">
                                        <Info size={14} className="text-slate-400 cursor-help" />
                                    </span>
                                </label>
                                <div className="space-y-3">
                                    {track.artists.map((artist, idx) => (
                                        <div key={idx} className="flex gap-3">
                                            <input 
                                                value={artist.name}
                                                onChange={(e) => handleArtistChange(track.id, idx, 'name', e.target.value)}
                                                className="flex-[2] px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                                placeholder="Artist Name"
                                            />
                                            <div className="flex-1 relative">
                                                <select 
                                                    value={artist.role}
                                                    onChange={(e) => handleArtistChange(track.id, idx, 'role', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                                >
                                                    {ARTIST_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                                                </select>
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                    <ChevronDown size={14} />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => removeArtist(track.id, idx)}
                                                className={`p-3 rounded-xl transition-colors ${track.artists.length > 1 ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-300 bg-gray-50 cursor-not-allowed'}`}
                                                disabled={track.artists.length <= 1}
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => addArtist(track.id)}
                                    className="mt-3 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <PlusCircle size={16} /> Add Artist
                                </button>
                            </div>

                            <hr className="border-gray-100 mb-8" />

                            {/* 4. Details (Instrumental & Genre) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Instrumental <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select 
                                            value={track.instrumental || 'No'}
                                            onChange={(e) => updateTrack(track.id, { instrumental: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                        >
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Genre <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select 
                                            value={track.genre}
                                            onChange={(e) => updateTrack(track.id, { genre: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                        >
                                            <option value="">Select Genre</option>
                                            {TRACK_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Composer <span className="text-red-500">*</span></label>
                                    <input 
                                        value={track.composer}
                                        onChange={(e) => updateTrack(track.id, { composer: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        placeholder="Full Name"
                                    />
                                </div>

                                {!isInstrumental && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Explicit Lyrics <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select 
                                                    value={track.explicitLyrics}
                                                    onChange={(e) => updateTrack(track.id, { explicitLyrics: e.target.value })}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                                >
                                                    {EXPLICIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                    <ChevronDown size={14} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Lyricist <span className="text-red-500">*</span></label>
                                            <input 
                                                value={track.lyricist}
                                                onChange={(e) => updateTrack(track.id, { lyricist: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                                placeholder="Full Name"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {!isInstrumental && (
                                <div className="mb-8">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                        <Mic2 size={16} /> Lyrics
                                    </label>
                                    <textarea 
                                        value={track.lyrics}
                                        onChange={(e) => updateTrack(track.id, { lyrics: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none h-32 resize-y"
                                        placeholder="Enter song lyrics here..."
                                    />
                                </div>
                            )}

                            {/* 5. Additional Contributors */}
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    Additional Contributors
                                </label>
                                <div className="space-y-3">
                                    {track.contributors.map((contrib, idx) => (
                                        <div key={idx} className="flex flex-col md:flex-row gap-3">
                                            <input 
                                                value={contrib.name}
                                                onChange={(e) => handleContributorChange(track.id, idx, 'name', e.target.value)}
                                                className="flex-[2] px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                                placeholder="Name"
                                            />
                                            <div className="flex-1 relative">
                                                <select 
                                                    value={contrib.type}
                                                    onChange={(e) => handleContributorChange(track.id, idx, 'type', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none appearance-none bg-white"
                                                >
                                                    {CONTRIBUTOR_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                                </select>
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                                                    <ChevronDown size={14} />
                                                </div>
                                            </div>
                                            <input 
                                                value={contrib.role}
                                                onChange={(e) => handleContributorChange(track.id, idx, 'role', e.target.value)}
                                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                                placeholder="Role (e.g. Drums)"
                                            />
                                            <button 
                                                onClick={() => removeContributor(track.id, idx)}
                                                className="p-3 text-red-500 bg-white border border-gray-200 hover:bg-red-50 rounded-xl transition-colors"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => addContributor(track.id)}
                                    className="mt-4 text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-all bg-white"
                                >
                                    <UserPlus size={16} /> Add Contributor
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            );
        })}
      </div>

       {releaseType === 'ALBUM' && data.tracks.length > 3 && (
        <button 
            onClick={addTrack}
            className="w-full mt-6 py-4 border-2 border-dashed border-blue-200 rounded-2xl text-blue-500 font-bold hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-2"
        >
            <PlusCircle size={20} />
            Add Another Track
        </button>
      )}
    </div>
  );
};
