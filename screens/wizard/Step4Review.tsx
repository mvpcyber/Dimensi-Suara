
import React, { useState } from 'react';
import { ReleaseData } from '../../types';
import { uploadReleaseToGoogle } from '../../services/googleService';
import { Disc, CheckCircle, Loader2, AlertCircle, FileAudio, User, Music2, FileText, Calendar, Globe, Tag, Mic2, Users, PlayCircle } from 'lucide-react';

interface Props {
  data: ReleaseData;
  onSave: (data: ReleaseData) => void;
}

export const Step4Review: React.FC<Props> = ({ data, onSave }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
        const result = await uploadReleaseToGoogle(data);
        
        // Finalize Data
        const finalizedData: ReleaseData = {
            ...data,
            id: Date.now().toString(),
            status: 'Pending',
            submissionDate: new Date().toISOString().split('T')[0]
        };
        
        // Propagate to App
        onSave(finalizedData);
        setSuccessMsg(result.message);
        
    } catch (error) {
        alert("Upload failed. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (successMsg) {
      return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                  <CheckCircle size={48} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Submission Successful!</h2>
              <p className="text-slate-500 mt-2 text-lg">Your release has been queued for distribution.</p>
              
              <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 text-left text-sm max-w-lg shadow-inner">
                <p className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <AlertCircle size={16} /> Technical Summary:
                </p>
                <ul className="space-y-2 text-slate-600">
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></span>
                        Files uploaded to Google Drive
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></span>
                        Metadata synced to Google Sheets
                    </li>
                     <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5"></span>
                        Visible in "All Releases" menu
                    </li>
                </ul>
              </div>

              <div className="mt-10">
                 <p className="text-slate-400 text-sm mb-4">You can now view this in the "All Releases" tab.</p>
              </div>
          </div>
      )
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Final Review</h2>
        <p className="text-slate-500">Please verify all information before submitting your release.</p>
      </div>

      {/* SECTION 1: RELEASE METADATA SUMMARY */}
      <div className="mb-12 animate-fade-in-up">
        <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
            <FileText className="text-blue-500" /> 
            Release Information
        </h3>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row gap-8">
            {/* Cover Art */}
            <div className="w-full md:w-56 flex-shrink-0">
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-md">
                    {data.coverArt ? (
                        <img 
                            src={URL.createObjectURL(data.coverArt)} 
                            alt="Cover" 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <Disc size={40} className="mb-2" />
                            <span className="text-xs">No Cover</span>
                        </div>
                    )}
                </div>
                <div className="mt-3 text-center">
                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                        {data.tracks.length > 1 ? 'Album / EP' : 'Single'}
                    </span>
                </div>
            </div>

            {/* Metadata Grid */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                <MetaItem label="Release Title" value={data.title} icon={<FileText size={14} />} />
                <MetaItem label="Primary Artist" value={data.primaryArtists.join(", ")} icon={<User size={14} />} />
                <MetaItem label="Label" value={data.label} icon={<Users size={14} />} />
                
                <MetaItem label="Language" value={data.language} icon={<Globe size={14} />} />
                <MetaItem label="Genre" value={data.tracks[0]?.genre || "Mixed"} icon={<Music2 size={14} />} />
                <MetaItem label="Version" value={data.version} icon={<Tag size={14} />} />
                
                <MetaItem label="Release Date" value={data.plannedReleaseDate || "TBD"} icon={<Calendar size={14} />} />
                <MetaItem label="UPC" value={data.upc || "Auto-Generated"} icon={<FileAudio size={14} />} />
                <MetaItem 
                    label="Distribution Type" 
                    value={data.isNewRelease ? "New Release" : `Re-release (Orig: ${data.originalReleaseDate})`} 
                    icon={<Disc size={14} />} 
                />
            </div>
        </div>
      </div>

      {/* SECTION 2: DETAILED TRACK METADATA */}
      <div className="mb-12 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2">
            <Music2 className="text-blue-500" /> 
            Track Metadata Details
        </h3>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-600">#</th>
                            <th className="px-6 py-4 font-bold text-slate-600">Title & File</th>
                            <th className="px-6 py-4 font-bold text-slate-600">Credits (Comp/Lyr)</th>
                            <th className="px-6 py-4 font-bold text-slate-600">Explicit</th>
                            <th className="px-6 py-4 font-bold text-slate-600">ISRC</th>
                            <th className="px-6 py-4 font-bold text-slate-600">Audio Clip</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.tracks.map((track) => (
                            <tr key={track.id} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4 font-bold text-slate-700">{track.trackNumber}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800">{track.title}</div>
                                    <div className="text-xs text-blue-500 flex items-center gap-1 mt-1 truncate max-w-[200px]" title={track.audioFile?.name}>
                                        <FileAudio size={10} />
                                        {track.audioFile?.name || "No File"}
                                    </div>
                                    {track.videoFile && (
                                        <div className="text-xs text-purple-500 flex items-center gap-1 mt-0.5">
                                            <PlayCircle size={10} /> Video Attached
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-slate-600"><span className="text-slate-400 text-xs">C:</span> {track.composer}</div>
                                    <div className="text-slate-600"><span className="text-slate-400 text-xs">L:</span> {track.lyricist || '-'}</div>
                                    {track.contributors.length > 0 && (
                                        <div className="text-xs text-slate-400 mt-1">+{track.contributors.length} others</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${
                                        track.explicitLyrics === 'Yes' ? 'bg-red-50 text-red-600 border-red-100' : 
                                        track.explicitLyrics === 'Clean' ? 'bg-green-50 text-green-600 border-green-100' :
                                        'bg-slate-50 text-slate-600 border-slate-100'
                                    }`}>
                                        {track.explicitLyrics}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                                    {track.isrc || "-"}
                                </td>
                                <td className="px-6 py-4">
                                    {track.audioClip ? (
                                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                            <CheckCircle size={12} /> Trimmed
                                        </span>
                                    ) : (
                                        <span className="text-xs text-orange-400">Missing</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Lyrics Preview if any */}
            {data.tracks.some(t => t.lyrics) && (
                 <div className="bg-slate-50 p-4 border-t border-gray-100">
                    <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                        <Mic2 size={12} /> Lyrics Detected
                    </div>
                    <p className="text-xs text-slate-400">
                        Lyrics data has been entered for {data.tracks.filter(t => t.lyrics).length} track(s) and will be submitted to stores.
                    </p>
                 </div>
            )}
        </div>
      </div>

      <div className="mt-12 flex flex-col items-end border-t border-gray-100 pt-8 pb-12">
        
        <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`
                w-full md:w-auto px-10 py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-all
                ${isSubmitting 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1'}
            `}
        >
            {isSubmitting ? (
                <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing Release...
                </>
            ) : (
                <>
                    Submit Release
                    <CheckCircle size={20} />
                </>
            )}
        </button>
      </div>
    </div>
  );
};

// --- Helper Components ---

const MetaItem: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="flex flex-col">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            {icon} {label}
        </span>
        <span className="text-sm font-semibold text-slate-800 truncate" title={value}>
            {value || "-"}
        </span>
    </div>
);
