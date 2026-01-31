import React, { useRef, useState } from 'react';
import { ReleaseData } from '../../types';
import { TextInput, SelectInput } from '../../components/Input';
import { LANGUAGES, VERSIONS } from '../../constants';
import { ImagePlus, UserPlus, Trash2, Loader2 } from 'lucide-react';

interface Props {
  data: ReleaseData;
  updateData: (updates: Partial<ReleaseData>) => void;
}

export const Step1ReleaseInfo: React.FC<Props> = ({ data, updateData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  // --- Image Processing Logic ---
  const processImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 3000;
        canvas.height = 3000;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Canvas context error"));
          return;
        }

        // Fill white background (optional, but good for JPG)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, 3000, 3000);

        // Draw image stretched/resized to 3000x3000px
        ctx.drawImage(img, 0, 0, 3000, 3000);

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            reject(new Error("Blob creation failed"));
          }
        }, "image/jpeg", 0.95); // High quality JPG
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingImg(true);
      try {
        const processedFile = await processImage(e.target.files[0]);
        updateData({ coverArt: processedFile });
      } catch (error) {
        console.error("Image processing failed", error);
        alert("Failed to process image.");
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const removeCover = () => {
    updateData({ coverArt: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Multi Artist Logic ---
  const handleArtistChange = (index: number, value: string) => {
    const newArtists = [...data.primaryArtists];
    newArtists[index] = value;
    updateData({ primaryArtists: newArtists });
  };

  const addArtist = () => {
    updateData({ primaryArtists: [...data.primaryArtists, ""] });
  };

  const removeArtist = (index: number) => {
    if (data.primaryArtists.length > 1) {
      const newArtists = data.primaryArtists.filter((_, i) => i !== index);
      updateData({ primaryArtists: newArtists });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Basic Information</h2>
        <p className="text-slate-500">Let's start with the essentials of your release.</p>
      </div>
      
      <div className="flex flex-col md:flex-row gap-10 items-start">
          {/* Left Side: Cover Art */}
          <div className="w-full md:w-1/3 flex flex-col items-center">
            <div className="w-full aspect-square max-w-[280px] bg-blue-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-blue-200 relative group hover:border-blue-400 transition-colors cursor-pointer shadow-inner"
                 onClick={() => !data.coverArt && !isProcessingImg && fileInputRef.current?.click()}
            >
                {isProcessingImg ? (
                  <div className="flex flex-col items-center text-blue-500">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <span className="text-xs font-bold">Resizing to 3000px...</span>
                  </div>
                ) : data.coverArt ? (
                  <img 
                      src={URL.createObjectURL(data.coverArt)} 
                      alt="Cover" 
                      className="w-full h-full object-cover shadow-lg" 
                  />
                ) : (
                  <div className="flex flex-col items-center p-6 text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                          <ImagePlus size={28} className="text-blue-500" />
                      </div>
                      <p className="text-sm font-bold text-blue-600 mb-1">Upload Cover Art</p>
                      <p className="text-xs text-slate-400">Auto-convert to 3000x3000px JPG</p>
                  </div>
                )}
                
                {data.coverArt && !isProcessingImg && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={(e) => { e.stopPropagation(); removeCover(); }} className="px-4 py-2 bg-white text-red-500 rounded-full font-bold text-sm shadow-lg hover:bg-red-50">
                            Change Image
                        </button>
                    </div>
                )}
            </div>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleCoverUpload}
            />
          </div>

          {/* Right Side: Form */}
          <div className="w-full md:w-2/3">
              {/* UPC Field (Moved to Top) */}
              <TextInput 
                label="UPC Album (Optional)" 
                value={data.upc} 
                onChange={(e) => updateData({ upc: e.target.value })} 
                placeholder="Leave blank to auto-generate"
              />

              <TextInput 
                label="Release Title" 
                value={data.title} 
                onChange={(e) => updateData({ title: e.target.value })} 
                placeholder="e.g. Midnight Memories"
              />

              {/* Primary Artists (Multiple) */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Artist(s)</label>
                <div className="space-y-3">
                  {data.primaryArtists.map((artist, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input 
                        value={artist}
                        onChange={(e) => handleArtistChange(index, e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder-gray-400 transition-all"
                        placeholder="Artist Name"
                      />
                      {data.primaryArtists.length > 1 && (
                        <button 
                          onClick={() => removeArtist(index)}
                          className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={addArtist}
                  className="mt-3 flex items-center text-blue-600 font-bold text-sm hover:underline"
                >
                  <UserPlus size={16} className="mr-2" />
                  Add Another Artist
                </button>
              </div>

              <TextInput 
                label="Record Label" 
                value={data.label} 
                onChange={(e) => updateData({ label: e.target.value })} 
                placeholder="Your Label Name"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <SelectInput 
                    label="Language / Territory"
                    options={LANGUAGES}
                    value={data.language}
                    onChange={(e) => updateData({ language: e.target.value })}
                  />
                   <SelectInput 
                    label="Release Version"
                    options={VERSIONS}
                    value={data.version}
                    onChange={(e) => updateData({ version: e.target.value })}
                  />
              </div>
              {/* Genre and Subgenre removed */}
          </div>
      </div>
    </div>
  );
};