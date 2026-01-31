
import React, { useState, useEffect } from 'react';
import { ReleaseData, Track } from '../types';
import { GoogleGenAI } from "@google/genai";
import { ArrowLeft, Play, Pause, FileAudio, CheckCircle, AlertTriangle, Globe, Disc, Save, Clipboard, Calendar, Tag, User, Mic2, FileText, Wand2, Loader2, Clock, Music2, Info, Download, Scissors, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  release: ReleaseData;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedRelease: ReleaseData) => void;
  availableAggregators: string[];
}

export const ReleaseDetailModal: React.FC<Props> = ({ release, isOpen, onClose, onUpdate, availableAggregators }) => {
  const [activeTab, setActiveTab] = useState<'INFO' | 'DISTRIBUTION'>('INFO');
  
  // Accordion State for Tracklist
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);

  // Audio Preview State
  // Keys: `${trackId}_full` or `${trackId}_clip`
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [objectUrls, setObjectUrls] = useState<{ [key: string]: string }>({});

  // Form State for Distribution
  const [status, setStatus] = useState(release.status || 'Pending');
  const [selectedAggregator, setSelectedAggregator] = useState(release.aggregator || '');
  const [upcInput, setUpcInput] = useState(release.upc || '');
  const [isrcInputs, setIsrcInputs] = useState<{ [key: string]: string }>({});

  // Rejection State
  const [rejectionReason, setRejectionReason] = useState(release.rejectionReason || '');
  const [rejectionDesc, setRejectionDesc] = useState(release.rejectionDescription || '');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    if (isOpen) {
        // Initialize ISRC inputs from existing tracks
        const initialIsrcs: any = {};
        release.tracks.forEach(t => {
            initialIsrcs[t.id] = t.isrc || '';
        });
        setIsrcInputs(initialIsrcs);
        setStatus(release.status || 'Pending');
        setSelectedAggregator(release.aggregator || '');
        setUpcInput(release.upc || '');
        setRejectionReason(release.rejectionReason || '');
        setRejectionDesc(release.rejectionDescription || '');
        
        // Reset expanded track
        setExpandedTrackId(null);
    }
  }, [isOpen, release]);

  // Generate Object URLs for preview (Cover, Full Audio, Clip Audio)
  useEffect(() => {
    if (!isOpen) return;
    const newUrls: { [key: string]: string } = {};
    
    // Cover Art
    if (release.coverArt) {
        newUrls['cover_art'] = URL.createObjectURL(release.coverArt);
    }

    // Tracks
    release.tracks.forEach(t => {
        if (t.audioFile) {
            newUrls[`${t.id}_full`] = URL.createObjectURL(t.audioFile);
        }
        if (t.audioClip) {
            newUrls[`${t.id}_clip`] = URL.createObjectURL(t.audioClip);
        }
    });
    setObjectUrls(newUrls);

    return () => {
        Object.values(newUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [isOpen, release.tracks, release.coverArt]);

  if (!isOpen) return null;

  const toggleTrackExpand = (trackId: string) => {
    setExpandedTrackId(prev => prev === trackId ? null : trackId);
  };

  // AI Generation for Rejection
  const generateRejectionMessage = async () => {
      if (!rejectionReason) {
          alert("Mohon isi alasan utama terlebih dahulu.");
          return;
      }
      setIsGeneratingAi(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const prompt = `
            Bertindaklah sebagai tim Quality Control distribusi musik digital. 
            Tuliskan email penolakan rilis yang **detail, sopan, dan profesional dalam Bahasa Indonesia** kepada artis.
            Jelaskan mengapa rilis mereka ditolak berdasarkan alasan utama ini: "${rejectionReason}".
            Berikan instruksi spesifik tentang apa yang perlu mereka perbaiki agar rilis dapat disetujui pada pengajuan berikutnya.
            Hindari sapaan pembuka seperti "Halo Artis", langsung ke inti permasalahan namun tetap ramah.
          `;

          const result = await ai.models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: prompt,
          });
          setRejectionDesc(result.text || "");
      } catch (error) {
          console.error("AI Generation Error", error);
          alert("Gagal membuat deskripsi. Periksa API Key atau coba lagi manual.");
          // Fallback if AI fails
          setRejectionDesc(`Rilis Anda ditolak karena: ${rejectionReason}. Mohon perbaiki masalah ini dan ajukan ulang.`);
      } finally {
          setIsGeneratingAi(false);
      }
  };

  const handleSaveStatus = () => {
      // 1. Validation for Processing
      if (status === 'Processing' && !selectedAggregator) {
          alert("Please select an Aggregator for processing.");
          return;
      }

      // 2. Validation for LIVE/RELEASED (Strict)
      if (status === 'Live') {
          if (!upcInput || upcInput.trim() === "") {
             alert("CRITICAL: Album UPC is REQUIRED for Live status.");
             return;
          }
          
          const missingIsrcs = release.tracks.some(t => {
              const val = isrcInputs[t.id];
              return !val || val.trim() === "";
          });

          if (missingIsrcs) {
              alert("CRITICAL: ISRC Codes are REQUIRED for ALL tracks when status is Live.");
              return;
          }
      }

      // 3. Validation for Rejection
      if (status === 'Rejected' && !rejectionReason) {
          alert("Please provide a reason for rejection.");
          return;
      }

      // Construct Updated Release
      const updatedTracks = release.tracks.map(t => ({
          ...t,
          isrc: isrcInputs[t.id] || t.isrc
      }));

      const updatedRelease: ReleaseData = {
          ...release,
          status: status,
          aggregator: selectedAggregator,
          upc: upcInput,
          rejectionReason: status === 'Rejected' ? rejectionReason : undefined,
          rejectionDescription: status === 'Rejected' ? rejectionDesc : undefined,
          tracks: updatedTracks
      };

      onUpdate(updatedRelease);
      onClose();
  };

  const downloadFile = (url: string, filename: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
  };

  const AudioPlayer = ({ track, type = 'full' }: { track: Track, type?: 'full' | 'clip' }) => {
    const key = `${track.id}_${type}`;
    const url = objectUrls[key];
    
    if (!url) return <span className="text-xs text-gray-400 italic">No Audio</span>;

    const isPlaying = playingKey === key;

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent accordion toggle
        const audioEl = document.getElementById(`audio-${key}`) as HTMLAudioElement;
        if (!audioEl) return;

        if (isPlaying) {
            audioEl.pause();
            setPlayingKey(null);
        } else {
            // Stop others
            document.querySelectorAll('audio').forEach(el => el.pause());
            setPlayingKey(key);
            audioEl.play();
        }
    };

    const fileName = type === 'full' ? track.audioFile?.name : track.audioClip?.name;

    return (
        <div className="flex items-center gap-2">
            <button 
                onClick={togglePlay} 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isPlaying ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                title="Preview"
            >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); downloadFile(url, fileName || `audio_${type}.wav`); }}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 hover:text-blue-600 transition-colors"
                title={`Download ${type === 'full' ? 'Full Track' : 'Clip'}`}
            >
                <Download size={14} />
            </button>
            <audio id={`audio-${key}`} src={url} onEnded={() => setPlayingKey(null)} className="hidden" />
        </div>
    );
  };

  const InfoRow = ({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) => (
      <div className="flex flex-col mb-3">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{label}</span>
          <div className={`text-sm font-semibold flex items-center justify-between group ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>
              <span className="truncate pr-2">{value || "-"}</span>
              {value && (
                  <button 
                    onClick={() => navigator.clipboard.writeText(value)}
                    className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-600 transition-opacity"
                    title="Copy"
                  >
                      <Clipboard size={12} />
                  </button>
              )}
          </div>
      </div>
  );

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-12 animate-fade-in">
        
        {/* Header - No longer a modal header */}
        <div className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    >
                        <ArrowLeft size={20} />
                        Back to List
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors">
                            Discard
                        </button>
                        <button 
                            onClick={handleSaveStatus}
                            className={`px-5 py-2 text-white font-bold rounded-lg shadow-md flex items-center gap-2 transition-all text-sm
                                ${status === 'Rejected' 
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' 
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}
                            `}
                        >
                            <Save size={16} />
                            {status === 'Rejected' ? 'Save Rejection' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
            
            {/* Release Banner */}
            <div className="flex flex-col md:flex-row gap-8 items-start mb-8 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl bg-gray-200 shadow-md overflow-hidden flex-shrink-0 border border-gray-300">
                    {release.coverArt ? (
                        <img src={objectUrls['cover_art']} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><Disc size={40} /></div>
                    )}
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">{release.title}</h1>
                    <p className="text-slate-500 font-medium text-xl mb-4">{release.primaryArtists.join(", ")}</p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                         <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                             status === 'Live' ? 'bg-green-100 text-green-700 border-green-200' :
                             status === 'Processing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                             status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                             'bg-yellow-100 text-yellow-700 border-yellow-200'
                         }`}>
                             {status === 'Rejected' && <AlertTriangle size={14} />}
                             <span className="uppercase tracking-wider">{status}</span>
                         </span>
                         {release.aggregator && (
                             <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1.5">
                                 <Globe size={14} /> {release.aggregator}
                             </span>
                         )}
                         <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-slate-600 border border-gray-200 flex items-center gap-1.5">
                             <Music2 size={14} /> {release.tracks.length > 1 ? 'Album' : 'Single'}
                         </span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
                <button 
                    onClick={() => setActiveTab('INFO')}
                    className={`pb-4 px-4 mr-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'INFO' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <FileText size={16} /> Metadata & Tracks
                </button>
                <button 
                    onClick={() => setActiveTab('DISTRIBUTION')}
                    className={`pb-4 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'DISTRIBUTION' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    <Globe size={16} /> Distribution & Status
                </button>
            </div>

            {/* Content Area */}
            <div>
                {/* TAB 1: INFO & PREVIEW */}
                {activeTab === 'INFO' && (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* RELEASE METADATA CARD (Detailed Step 1 & 3) */}
                        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                                <FileText size={20} className="text-blue-500" />
                                <h3 className="font-bold text-slate-700 text-xl">Full Release Metadata</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                {/* Cover Art Column */}
                                <div className="md:col-span-1">
                                    <div className="aspect-square rounded-xl overflow-hidden border border-gray-200 mb-3 bg-gray-50">
                                        {release.coverArt ? (
                                            <img src={objectUrls['cover_art']} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <Disc size={40} />
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => release.coverArt && downloadFile(objectUrls['cover_art'], release.coverArt.name)}
                                        disabled={!release.coverArt}
                                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <Download size={14} /> Download Cover
                                    </button>
                                </div>

                                {/* Metadata Grid */}
                                <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6 content-start">
                                    <InfoRow label="Release Title" value={release.title} />
                                    <InfoRow label="Primary Artist(s)" value={release.primaryArtists.join(", ")} />
                                    <InfoRow label="Label Name" value={release.label} />
                                    <InfoRow label="Language / Territory" value={release.language} />
                                    
                                    <InfoRow label="Version" value={release.version} />
                                    <InfoRow label="Release Format" value={release.tracks.length > 1 ? "Album/EP" : "Single"} />
                                    <InfoRow label="Primary Genre" value={release.tracks[0]?.genre} />
                                    <InfoRow label="Explicit Content" value={release.tracks.some(t => t.explicitLyrics === 'Yes') ? "Yes" : "No"} />

                                    <div className="col-span-2 md:col-span-3 border-t border-gray-100 my-1"></div>

                                    {/* Step 3 Data */}
                                    <InfoRow label="UPC Code" value={upcInput || release.upc || "Not Assigned"} highlight />
                                    <InfoRow label="Distribution Type" value={release.isNewRelease ? "New Release" : "Re-release"} />
                                    <InfoRow label="Planned Release Date" value={release.plannedReleaseDate} highlight />
                                    <InfoRow label="Original Release Date" value={!release.isNewRelease ? release.originalReleaseDate : "-"} />
                                    
                                    <InfoRow label="Submission Date" value={release.submissionDate || "Not Submitted"} />
                                    <InfoRow label="Total Tracks" value={release.tracks.length.toString()} />
                                    <InfoRow label="Current Status" value={status} />
                                    <InfoRow label="Aggregator" value={selectedAggregator || "-"} />
                                </div>
                            </div>
                        </div>

                        {/* TRACKLIST SECTION (FULL VIEW - NO TABLE) */}
                        <div>
                             <div className="flex items-center gap-2 mb-4">
                                 <FileAudio size={20} className="text-blue-500" />
                                 <h3 className="font-bold text-slate-700 text-xl">Tracklist & Metadata (Detailed)</h3>
                            </div>

                            <div className="space-y-4">
                                {release.tracks.map((track) => {
                                    const isExpanded = expandedTrackId === track.id;
                                    
                                    return (
                                        <div key={track.id} className={`bg-white rounded-xl border overflow-hidden transition-all shadow-sm ${isExpanded ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-200 hover:border-blue-200'}`}>
                                            {/* Track Header (Clickable for Accordion) */}
                                            <div 
                                                className={`px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : 'bg-slate-50 hover:bg-slate-100'}`}
                                                onClick={() => toggleTrackExpand(track.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-gray-200'}`}>
                                                        {track.trackNumber}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-lg text-slate-800">{track.title}</h4>
                                                        <p className="text-xs text-slate-500">
                                                            {track.artists.map(a => `${a.name} (${a.role})`).join(", ")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right hidden sm:block">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase">ISRC CODE</div>
                                                        <div className="font-mono text-sm font-medium text-slate-700 bg-white px-2 py-1 rounded border border-gray-200">
                                                            {isrcInputs[track.id] || track.isrc || "N/A"}
                                                        </div>
                                                    </div>
                                                    <div className="text-slate-400">
                                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Track Details Grid (Conditionally Rendered) */}
                                            {isExpanded && (
                                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in border-t border-gray-100">
                                                    {/* Column 1: Audio Files & Actions */}
                                                    <div className="space-y-6">
                                                        {/* Full Audio */}
                                                        <div>
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                                                                <FileAudio size={12} /> Full Audio File
                                                            </span>
                                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                                <div className="text-xs font-bold text-slate-700 truncate mb-2" title={track.audioFile?.name}>
                                                                    {track.audioFile?.name || "No file uploaded"}
                                                                </div>
                                                                <AudioPlayer track={track} type="full" />
                                                            </div>
                                                        </div>

                                                        {/* Audio Clip */}
                                                        <div>
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-1">
                                                                <Scissors size={12} /> Audio Clip (Trim)
                                                            </span>
                                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                                {track.audioClip ? (
                                                                    <>
                                                                        <div className="text-xs font-bold text-slate-700 truncate mb-2" title={track.audioClip.name}>
                                                                            {track.audioClip.name}
                                                                        </div>
                                                                        <AudioPlayer track={track} type="clip" />
                                                                    </>
                                                                ) : (
                                                                    <div className="text-xs text-slate-400 italic py-1">No clip generated</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-4">
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400">Genre</span>
                                                                <div className="text-sm font-medium text-slate-700">{track.genre}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400">Explicit</span>
                                                                <div className={`text-sm font-bold ${track.explicitLyrics === 'Yes' ? 'text-red-500' : 'text-green-600'}`}>
                                                                    {track.explicitLyrics}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Column 2: Credits & Contributors */}
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-2 gap-4">
                                                             <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400">Composer</span>
                                                                <div className="text-sm font-medium text-slate-700">{track.composer}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400">Lyricist</span>
                                                                <div className="text-sm font-medium text-slate-700">{track.lyricist}</div>
                                                            </div>
                                                        </div>

                                                        {/* Full Additional Contributors Display */}
                                                        <div>
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mb-2">
                                                                <Users size={12} /> Additional Contributors
                                                            </span>
                                                            {track.contributors.length > 0 ? (
                                                                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                                    <table className="w-full text-left text-xs">
                                                                        <thead className="bg-gray-50 text-gray-500 font-bold">
                                                                            <tr>
                                                                                <th className="px-3 py-2">Name</th>
                                                                                <th className="px-3 py-2">Role</th>
                                                                                <th className="px-3 py-2">Type</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-100">
                                                                            {track.contributors.map((c, idx) => (
                                                                                <tr key={idx}>
                                                                                    <td className="px-3 py-2 font-medium text-slate-700">{c.name}</td>
                                                                                    <td className="px-3 py-2 text-slate-500">{c.role}</td>
                                                                                    <td className="px-3 py-2 text-slate-500">{c.type}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-slate-400 italic">None added.</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Column 3: Lyrics & Extras */}
                                                    <div>
                                                         <div className="flex justify-between items-center mb-1">
                                                             <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                                 <Mic2 size={10} /> Lyrics Preview
                                                             </span>
                                                             {track.lyrics && (
                                                                 <button 
                                                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(track.lyrics); }}
                                                                    className="text-blue-500 hover:text-blue-700 transition-colors"
                                                                    title="Copy Lyrics"
                                                                 >
                                                                     <Clipboard size={14} />
                                                                 </button>
                                                             )}
                                                         </div>
                                                         <div className="bg-gray-50 rounded-lg p-3 text-xs text-slate-600 italic h-48 overflow-y-auto border border-gray-100 whitespace-pre-line">
                                                             {track.lyrics ? track.lyrics : "No lyrics provided."}
                                                         </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: DISTRIBUTION ADMIN */}
                {activeTab === 'DISTRIBUTION' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm mb-8 animate-fade-in-up">
                            <h3 className="font-bold text-xl text-slate-800 mb-2">Workflow Management</h3>
                            <p className="text-sm text-slate-500 mb-8 pb-4 border-b border-gray-100">Update the status of this release to move it through the pipeline.</p>
                            
                            <div className="space-y-8">
                                {/* Status Selector */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Release Status</label>
                                    <select 
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value as any)}
                                        className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 font-bold text-slate-700
                                            ${status === 'Rejected' ? 'border-red-200 bg-red-50 focus:border-red-500 focus:ring-red-100' : 
                                            status === 'Live' ? 'border-green-200 bg-green-50 focus:border-green-500 focus:ring-green-100' :
                                            'border-blue-200 bg-white focus:border-blue-500 focus:ring-blue-100'}
                                        `}
                                    >
                                        <option value="Pending">Pending Review</option>
                                        <option value="Processing">Processing (Aggregator)</option>
                                        <option value="Live">Released / Live</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>

                                {/* --- REJECTION WORKFLOW --- */}
                                {status === 'Rejected' && (
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-6 animate-fade-in-down">
                                        <h4 className="font-bold text-red-800 flex items-center gap-2 mb-4 text-lg">
                                            <AlertTriangle size={20} /> Rejection Details
                                        </h4>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-red-700 uppercase mb-1">Main Reason</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        placeholder="e.g. Cover Art tidak sesuai guideline"
                                                        className="flex-1 px-4 py-3 border border-red-200 rounded-lg focus:outline-none focus:border-red-500 text-sm"
                                                    />
                                                    <button 
                                                        onClick={generateRejectionMessage}
                                                        disabled={isGeneratingAi || !rejectionReason.trim()}
                                                        className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 min-w-[80px] justify-center"
                                                        title="Generate Detailed Description with AI"
                                                    >
                                                        {isGeneratingAi ? <Loader2 size={16} className="animate-spin"/> : "OK"}
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-red-500 mt-1.5 font-medium">Klik OK untuk membuat deskripsi detail otomatis menggunakan AI.</p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-red-700 uppercase mb-1 flex justify-between">
                                                    <span>Detailed Description (Email to User)</span>
                                                </label>
                                                <textarea 
                                                    value={rejectionDesc}
                                                    onChange={(e) => setRejectionDesc(e.target.value)}
                                                    placeholder="Deskripsi detail akan muncul di sini setelah klik OK..."
                                                    rows={6}
                                                    className="w-full px-4 py-3 border border-red-200 rounded-lg focus:outline-none focus:border-red-500 text-sm resize-none bg-white shadow-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* --- PROCESSING WORKFLOW --- */}
                                {(status === 'Processing' || status === 'Live') && (
                                    <div className="animate-fade-in-down">
                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <Globe size={16} className="text-purple-500" />
                                            Select Aggregator
                                        </label>
                                        <select 
                                            value={selectedAggregator}
                                            onChange={(e) => setSelectedAggregator(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-purple-500 shadow-sm"
                                        >
                                            <option value="">-- Choose Aggregator --</option>
                                            {availableAggregators.map(agg => (
                                                <option key={agg} value={agg}>{agg}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* --- LIVE WORKFLOW (CODES) --- */}
                                {status === 'Live' && (
                                    <div className="animate-fade-in-down bg-green-50 p-6 rounded-xl border border-green-100 space-y-6">
                                        <div className="flex items-center gap-2 border-b border-green-200 pb-3">
                                            <CheckCircle size={20} className="text-green-600" />
                                            <span className="font-bold text-green-800 text-lg">Mandatory Release Codes</span>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-green-700 uppercase mb-1">
                                                Album UPC <span className="text-red-500">*</span>
                                            </label>
                                            <input 
                                                value={upcInput}
                                                onChange={(e) => setUpcInput(e.target.value)}
                                                placeholder="Enter UPC Code (Required)"
                                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 font-mono text-sm shadow-sm
                                                    ${!upcInput ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-white' : 'border-green-200 focus:ring-green-500'}`}
                                            />
                                            {!upcInput && <p className="text-[10px] text-red-500 mt-1 font-bold">UPC is required to set status to Live.</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-green-700 uppercase mb-3">
                                                Track ISRCs <span className="text-red-500">*</span>
                                            </label>
                                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                                {release.tracks.map(track => {
                                                    const hasVal = isrcInputs[track.id] && isrcInputs[track.id].trim() !== "";
                                                    return (
                                                        <div key={track.id} className="flex items-center gap-3 bg-white p-2 rounded border border-green-100">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs">{track.trackNumber}</div>
                                                            <span className="text-sm text-slate-700 w-1/3 truncate font-medium" title={track.title}>{track.title}</span>
                                                            <input 
                                                                value={isrcInputs[track.id] || ''}
                                                                onChange={(e) => setIsrcInputs(prev => ({...prev, [track.id]: e.target.value}))}
                                                                placeholder="ISRC (Required)"
                                                                className={`flex-1 px-3 py-2 border rounded text-sm font-mono focus:outline-none
                                                                    ${!hasVal ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-green-500'}`}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
