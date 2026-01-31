
import React, { useState, useEffect, useRef } from 'react';
import { Contract } from '../types';
import { uploadContractToGoogle } from '../services/googleService';
import { FileSignature, Plus, Search, Trash2, Calendar, User, FileText, CheckCircle, List, ArrowLeft, ArrowRight, Upload, Clock, CreditCard, PenTool, Hash, Loader2, Database, AlertCircle, WifiOff, FileImage, RotateCw, ZoomIn, X, Check, Eye, Download, ChevronRight, Maximize2, Printer } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop/types';

interface Props {
    activeTab: string;
    contracts: Contract[];
    setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
}

// URL Backend API MySQL kita (Asumsi mock/local)
const API_URL = 'http://localhost:5000/api/contracts';

// --- CANVAS UTILS FOR CROPPING ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * This function extracts the cropped image from the source image canvas.
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false },
  fileName: string
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw image
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      resolve(file);
    }, 'image/jpeg', 0.9);
  });
}

export const Contracts: React.FC<Props> = ({ activeTab, contracts, setContracts }) => {
    // FORM STATE
    const [formData, setFormData] = useState<Contract>({
        id: '',
        contractNumber: '',
        artistName: '',
        type: 'Exclusive',
        startDate: '',
        endDate: '',
        durationYears: 1,
        royaltyRate: 70,
        status: 'Pending',
        createdDate: new Date().toISOString().split('T')[0],
        notes: '',
        ktpFile: null,
        npwpFile: null,
        signatureFile: null
    });

    // CROPPER STATE
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropTargetField, setCropTargetField] = useState<'ktpFile' | 'npwpFile' | 'signatureFile' | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessingCrop, setIsProcessingCrop] = useState(false);

    // DETAIL MODAL STATE
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [editStatus, setEditStatus] = useState<Contract['status']>('Pending');
    const [signedPdf, setSignedPdf] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null); // For document preview
    const [isGeneratingContract, setIsGeneratingContract] = useState(false); // For PDF Generation

    // VIEW STATE
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // OFFLINE MODE STATE
    const [isOffline, setIsOffline] = useState(false);

    // PAGINATION
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // --- FETCH DATA ---
    const fetchContracts = async () => {
        setIsLoading(true);
        try {
            // Attempt to fetch from backend
            const response = await fetch(API_URL, { signal: AbortSignal.timeout(3000) });
            
            if (!response.ok) {
                throw new Error("Gagal terhubung ke server backend");
            }
            
            const data = await response.json();
            
            const mappedData: Contract[] = data.map((item: any) => ({
                id: item.id.toString(),
                contractNumber: item.contract_number,
                artistName: item.artist_name,
                type: item.type,
                startDate: item.start_date ? item.start_date.split('T')[0] : '',
                endDate: item.end_date ? item.end_date.split('T')[0] : '',
                durationYears: item.duration_years,
                royaltyRate: item.royalty_rate,
                status: item.status,
                createdDate: item.created_at ? item.created_at.split('T')[0] : '',
                notes: item.notes,
                ktpFile: null,
                npwpFile: null,
                signatureFile: null,
                signedContractFile: null
            }));

            setContracts(mappedData);
            setIsOffline(false);
        } catch (err) {
            console.warn("Backend offline or unreachable. Switching to Offline Mode.");
            setIsOffline(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'CONTRACT_ALL') {
            fetchContracts();
        }
    }, [activeTab]);

    // Check Unique Number (Simulated)
    const checkUniqueNumberInDB = async (number: string): Promise<boolean> => {
        return !contracts.some(c => c.contractNumber === number);
    };
    
    // Generate Contract Number
    const generateContractNumber = async () => {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const dateStr = `${dd}${mm}${yyyy}`;

        let uniqueNum = '';
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const candidate = `DS.${randomNum}-${dateStr}`;
            
            isUnique = await checkUniqueNumberInDB(candidate);
            if (isUnique) uniqueNum = candidate;
            attempts++;
        }
        
        if (!uniqueNum) uniqueNum = `DS.${Date.now().toString().slice(-3)}-${dateStr}`;
        return uniqueNum;
    };

    // Initialize New Form
    useEffect(() => {
        const initForm = async () => {
            if (activeTab === 'CONTRACT_NEW') {
                setShowSuccess(false);
                const newNum = await generateContractNumber();
                setFormData(prev => ({
                    ...prev,
                    id: '',
                    contractNumber: newNum,
                    artistName: '',
                    type: 'Exclusive',
                    startDate: '',
                    status: 'Pending', 
                    createdDate: new Date().toISOString().split('T')[0],
                    ktpFile: null,
                    npwpFile: null,
                    signatureFile: null
                }));
            }
        };
        initForm();
    }, [activeTab]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'royaltyRate' || name === 'durationYears') ? Number(value) : value
        }));
    };

    // --- CROP HANDLERS ---
    
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, field: 'ktpFile' | 'npwpFile' | 'signatureFile') => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropImageSrc(reader.result?.toString() || null);
                setCropTargetField(field);
                setCropModalOpen(true);
                setZoom(1);
                setRotation(0);
                setCrop({ x: 0, y: 0 });
            });
            reader.readAsDataURL(file);
            
            // Reset input so same file can be selected again if cancelled
            e.target.value = ''; 
        }
    };

    const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropSave = async () => {
        if (!cropImageSrc || !croppedAreaPixels || !cropTargetField) return;

        setIsProcessingCrop(true);
        try {
            // Generate filename: [type]-[contractNumber].jpg
            const prefix = cropTargetField === 'ktpFile' ? 'ktp' : cropTargetField === 'npwpFile' ? 'npwp' : 'signature';
            // Sanitize contract number just in case
            const safeContractNum = formData.contractNumber.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `${prefix}-${safeContractNum}.jpg`;

            const croppedFile = await getCroppedImg(
                cropImageSrc,
                croppedAreaPixels,
                rotation,
                { horizontal: false, vertical: false },
                fileName
            );

            if (croppedFile) {
                setFormData(prev => ({
                    ...prev,
                    [cropTargetField]: croppedFile
                }));
                setCropModalOpen(false);
                setCropImageSrc(null);
                setCropTargetField(null);
            }
        } catch (e) {
            console.error(e);
            alert("Gagal memproses gambar.");
        } finally {
            setIsProcessingCrop(false);
        }
    };

    const handleCloseCrop = () => {
        setCropModalOpen(false);
        setCropImageSrc(null);
        setCropTargetField(null);
    };

    // --- CONTRACT DETAIL & STATUS HANDLERS ---
    const handleViewDetail = (contract: Contract) => {
        setSelectedContract(contract);
        setEditStatus(contract.status);
        setSignedPdf(contract.signedContractFile || null);
        setDetailModalOpen(true);
    };

    const handleCloseDetail = () => {
        setDetailModalOpen(false);
        setSelectedContract(null);
        setSignedPdf(null);
        setPreviewImage(null);
    };

    const handleSignedPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files[0]) {
            setSignedPdf(e.target.files[0]);
        }
    };

    const handleGenerateContract = async () => {
        if (!selectedContract) return;
        setIsGeneratingContract(true);

        // Simulation delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create a simple text content mimicking a contract
        const content = `
SURAT PERJANJIAN KERJASAMA
NOMOR: ${selectedContract.contractNumber}

Pada hari ini, tanggal ${new Date().toLocaleDateString('id-ID')}, kami yang bertanda tangan di bawah ini:

PIHAK PERTAMA: Dimensi Suara
PIHAK KEDUA: ${selectedContract.artistName}

Sepakat untuk mengikatkan diri dalam perjanjian kerjasama dengan ketentuan sebagai berikut:

PASAL 1: MASA BERLAKU
Perjanjian ini berlaku selama ${selectedContract.durationYears} tahun, terhitung mulai tanggal ${selectedContract.startDate} sampai dengan ${selectedContract.endDate}.

PASAL 2: BAGI HASIL (ROYALTI)
Pihak Kedua berhak mendapatkan bagi hasil sebesar ${selectedContract.royaltyRate}% dari pendapatan bersih yang diterima.

Demikian surat perjanjian ini dibuat untuk dapat dipergunakan sebagaimana mestinya.

TTD Pihak Pertama                                  TTD Pihak Kedua
(Dimensi Suara)                                    (${selectedContract.artistName})
        `;

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Draft_Kontrak_${selectedContract.contractNumber}.txt`; // Using .txt for simulation, real implementation might use jsPDF
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsGeneratingContract(false);
    };

    const handleSaveDetail = async () => {
        if (!selectedContract) return;

        // Validation: If status is 'Selesai', MUST have PDF
        if (editStatus === 'Selesai' && !signedPdf && !selectedContract.signedContractFile) {
            alert("Status Selesai WAJIB mengupload dokumen Kontrak yang sudah ditandatangani (PDF).");
            return;
        }

        setIsSubmitting(true);

        try {
            // Mock Update
            const updatedContract: Contract = {
                ...selectedContract,
                status: editStatus,
                signedContractFile: signedPdf || selectedContract.signedContractFile
            };
            
            // Update List
            setContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
            
            // Backend Sync (Mock)
            if(!isOffline) {
                 // Simulate API Update
                 // await fetch(API_URL + '/' + updatedContract.id, { method: 'PUT', ... })
            }

            // Sync to Google (if PDF exists)
            if (editStatus === 'Selesai' && signedPdf) {
                await uploadContractToGoogle(updatedContract);
            }

            setDetailModalOpen(false);
            setSignedPdf(null);
        } catch (error) {
            alert("Gagal update status.");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Basic Validation
        if (!formData.ktpFile || !formData.npwpFile || !formData.signatureFile) {
            alert("Harap upload KTP, NPWP, dan Tanda Tangan.");
            return;
        }

        setIsSubmitting(true);

        const start = new Date(formData.startDate);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + formData.durationYears);
        const calculatedEndDate = end.toISOString().split('T')[0];
        
        // Finalize object
        const newContract: Contract = {
            ...formData,
            id: Date.now().toString(),
            endDate: calculatedEndDate,
            status: 'Pending'
        };

        try {
            await uploadContractToGoogle(newContract);

            if (isOffline) {
                await new Promise(resolve => setTimeout(resolve, 500));
                setContracts(prev => [newContract, ...prev]);
            } else {
                const payload = {
                    contract_number: formData.contractNumber,
                    artist_name: formData.artistName,
                    type: formData.type,
                    start_date: formData.startDate,
                    end_date: calculatedEndDate,
                    duration_years: formData.durationYears,
                    royalty_rate: formData.royaltyRate,
                    status: 'Pending',
                    notes: formData.notes || ''
                };

                try {
                    const response = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!response.ok) throw new Error("Database sync failed.");
                } catch (dbErr) {
                    console.warn("DB save failed, falling back to local state");
                }
                
                setContracts(prev => [newContract, ...prev]);
            }

            setIsSubmitting(false);
            setShowSuccess(true);

        } catch (err: any) {
            console.error("Save failed:", err);
            alert("Gagal menyimpan: " + err.message);
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Apakah anda yakin ingin menghapus kontrak ini?')) return;
        setContracts(prev => prev.filter(c => c.id !== id));
    };

    // Filter Logic
    const filteredContracts = contracts.filter(c => 
        c.artistName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.contractNumber && c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);
    const displayedContracts = filteredContracts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="p-4 md:p-8 w-full max-w-[1400px] mx-auto min-h-screen">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <FileSignature size={32} className="text-blue-600" />
                        Manajemen Kontrak
                    </h1>
                    <p className="text-slate-500 mt-1">Buat dan kelola kontrak kerjasama partner.</p>
                </div>
                {isOffline ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700 font-bold">
                        <WifiOff size={14} />
                        Mode Offline
                    </div>
                ) : (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-700">
                        <Database size={12} />
                        Sync Active
                    </div>
                )}
            </div>

            {/* TAB: KONTRAK BARU */}
            {activeTab === 'CONTRACT_NEW' && (
                showSuccess ? (
                    <div className="text-center bg-white p-12 rounded-3xl shadow-xl border border-gray-100 max-w-2xl mx-auto mt-10 animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Kontrak Berhasil Disimpan!</h2>
                        <p className="text-slate-500 mb-8">
                            Nomor Kontrak: <strong>{formData.contractNumber}</strong><br/>
                            Status: <span className="text-yellow-600 font-bold">Pending</span><br/>
                            File telah diunggah ke Google Drive & Database.
                        </p>
                        <button 
                            onClick={async () => {
                                setShowSuccess(false);
                                const newNum = await generateContractNumber();
                                setFormData(prev => ({ 
                                    ...prev, 
                                    contractNumber: newNum,
                                    artistName: '', 
                                    startDate: '', 
                                    ktpFile: null,
                                    npwpFile: null,
                                    signatureFile: null
                                }));
                            }}
                            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Buat Kontrak Lain
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto animate-fade-in">
                        <div className="mb-8 border-b border-gray-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-800">Form Kontrak Baru</h2>
                            <p className="text-sm text-slate-500">Lengkapi data partner dan dokumen pendukung.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            
                            {/* Auto Contract Number */}
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nomor Kontrak (Otomatis)</label>
                                <div className="relative">
                                    <input 
                                        name="contractNumber"
                                        value={formData.contractNumber}
                                        readOnly
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-slate-500 font-mono font-bold focus:outline-none cursor-not-allowed"
                                    />
                                    <Hash className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                </div>
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Partner <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input 
                                        name="artistName"
                                        value={formData.artistName}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        placeholder="Nama Lengkap Partner / Pihak Kedua"
                                        required
                                    />
                                    <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Royalty Rate (%)</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        name="royaltyRate"
                                        value={formData.royaltyRate}
                                        onChange={handleInputChange}
                                        min="0" max="100"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                    />
                                    <div className="absolute right-4 top-3.5 text-slate-500 font-bold">%</div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Mulai <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input 
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        required
                                    />
                                    <Calendar className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Durasi (Tahun) <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        name="durationYears"
                                        value={formData.durationYears}
                                        onChange={handleInputChange}
                                        min="1" max="50"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                                        required
                                    />
                                    <Clock className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" size={18} />
                                </div>
                            </div>

                            {/* UPLOAD SECTIONS */}
                            <div className="col-span-2 border-t border-gray-100 pt-6 mt-2">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Upload size={16} className="text-blue-500" /> Dokumen Pendukung (Crop & Rotate)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* KTP */}
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${formData.ktpFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                                        <input type="file" onChange={(e) => handleFileSelect(e, 'ktpFile')} className="hidden" id="upload-ktp" accept="image/*" />
                                        <label htmlFor="upload-ktp" className="cursor-pointer block">
                                            <div className="mx-auto w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm relative overflow-hidden">
                                                {formData.ktpFile ? (
                                                    <img src={URL.createObjectURL(formData.ktpFile)} className="w-full h-full object-cover rounded-full" alt="KTP" />
                                                ) : <CreditCard className="text-slate-400" />}
                                                {formData.ktpFile && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle size={20} className="text-white drop-shadow-md" /></div>}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 block">Upload KTP</span>
                                            <span className="text-[10px] text-slate-400 truncate block max-w-full">
                                                {formData.ktpFile ? formData.ktpFile.name : 'JPG/PNG'}
                                            </span>
                                        </label>
                                    </div>

                                    {/* NPWP */}
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${formData.npwpFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                                        <input type="file" onChange={(e) => handleFileSelect(e, 'npwpFile')} className="hidden" id="upload-npwp" accept="image/*" />
                                        <label htmlFor="upload-npwp" className="cursor-pointer block">
                                            <div className="mx-auto w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm relative overflow-hidden">
                                                 {formData.npwpFile ? (
                                                    <img src={URL.createObjectURL(formData.npwpFile)} className="w-full h-full object-cover rounded-full" alt="NPWP" />
                                                ) : <FileText className="text-slate-400" />}
                                                {formData.npwpFile && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle size={20} className="text-white drop-shadow-md" /></div>}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 block">Upload NPWP</span>
                                            <span className="text-[10px] text-slate-400 truncate block max-w-full">
                                                {formData.npwpFile ? formData.npwpFile.name : 'JPG/PNG'}
                                            </span>
                                        </label>
                                    </div>

                                    {/* SIGNATURE */}
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${formData.signatureFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                                        <input type="file" onChange={(e) => handleFileSelect(e, 'signatureFile')} className="hidden" id="upload-sig" accept="image/*" />
                                        <label htmlFor="upload-sig" className="cursor-pointer block">
                                            <div className="mx-auto w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm relative overflow-hidden">
                                                {formData.signatureFile ? (
                                                    <img src={URL.createObjectURL(formData.signatureFile)} className="w-full h-full object-cover rounded-full" alt="Sig" />
                                                ) : <PenTool className="text-slate-400" />}
                                                {formData.signatureFile && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><CheckCircle size={20} className="text-white drop-shadow-md" /></div>}
                                            </div>
                                            <span className="text-xs font-bold text-slate-700 block">Tanda Tangan</span>
                                            <span className="text-[10px] text-slate-400 truncate block max-w-full">
                                                {formData.signatureFile ? formData.signatureFile.name : 'Scan/Foto'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                             <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30"
                             >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                                {isSubmitting ? 'Mengunggah...' : 'Tambah Kontrak'}
                             </button>
                        </div>
                    </form>
                )
            )}

            {/* TAB: SEMUA KONTRAK */}
            {activeTab === 'CONTRACT_ALL' && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px] animate-fade-in">
                    
                    {/* Toolbar */}
                    <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                         <div className="relative w-full md:w-96">
                             <input 
                                 placeholder="Cari partner atau nomor kontrak..." 
                                 value={searchTerm}
                                 onChange={(e) => {
                                     setSearchTerm(e.target.value);
                                     setCurrentPage(1);
                                 }}
                                 className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                             />
                             <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                         </div>
                         <div className="flex items-center gap-3">
                             {isLoading && <Loader2 className="animate-spin text-blue-500" size={20} />}
                             <div className="text-sm font-bold bg-blue-50 text-blue-600 px-4 py-2 rounded-lg">
                                 Total: {contracts.length}
                             </div>
                         </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nomor Kontrak</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nama Partner</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Durasi</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Royalty</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayedContracts.map((contract) => (
                                    <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-mono font-bold text-slate-700 bg-gray-100 inline-block px-2 py-1 rounded text-xs">
                                                {contract.contractNumber || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">{contract.artistName}</div>
                                            <div className="text-xs text-slate-500">
                                                {contract.ktpFile ? <span className="flex items-center gap-1"><FileImage size={10}/> KTP</span> : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <div className="flex flex-col">
                                                <span className="font-bold">{contract.durationYears} Tahun</span>
                                                <span className="text-xs text-slate-400">Berakhir: {contract.endDate}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">
                                            {contract.royaltyRate}%
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border 
                                                ${contract.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : 
                                                  contract.status === 'Proses' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                  contract.status === 'Review' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                  'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                                {contract.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleViewDetail(contract)}
                                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Detail Kontrak"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(contract.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Hapus Kontrak"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {displayedContracts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-slate-400 italic">
                                            {isLoading ? "Memuat data dari database..." : 
                                             "Tidak ada kontrak ditemukan."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-slate-50/50">
                            <span className="text-sm text-slate-500">
                                Menampilkan {displayedContracts.length} dari {filteredContracts.length} data
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50 hover:bg-slate-50"
                                >
                                    <ArrowLeft size={16} />
                                </button>
                                <span className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-gray-200 rounded-lg">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50 hover:bg-slate-50"
                                >
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DETAIL MODAL */}
            {detailModalOpen && selectedContract && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-slate-50">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold text-slate-800">{selectedContract.artistName}</h3>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-gray-200 rounded text-slate-600">
                                        {selectedContract.contractNumber}
                                    </span>
                                </div>
                            </div>
                            <button onClick={handleCloseDetail} className="p-2 hover:bg-gray-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            
                            {/* 1. INFO DETAIL (Moved Up) */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tanggal Mulai</span>
                                    <div className="text-sm font-bold text-slate-700">{selectedContract.startDate}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tanggal Berakhir</span>
                                    <div className="text-sm font-bold text-slate-700">{selectedContract.endDate}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Durasi</span>
                                    <div className="text-sm font-bold text-slate-700">{selectedContract.durationYears} Tahun</div>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Royalty Rate</span>
                                    <div className="text-sm font-bold text-slate-700">{selectedContract.royaltyRate}%</div>
                                </div>
                            </div>

                            {/* 2. DOKUMEN PARTNER */}
                            <div className="mb-8">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FileText size={16} /> Dokumen Partner
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: 'KTP', file: selectedContract.ktpFile },
                                        { label: 'NPWP', file: selectedContract.npwpFile },
                                        { label: 'Tanda Tangan', file: selectedContract.signatureFile }
                                    ].map((doc, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-200 group">
                                            <div 
                                                onClick={() => doc.file && setPreviewImage(URL.createObjectURL(doc.file))}
                                                className={`aspect-[4/3] bg-white rounded-lg mb-2 overflow-hidden flex items-center justify-center border border-gray-100 relative ${doc.file ? 'cursor-zoom-in hover:opacity-90' : ''}`}
                                            >
                                                {doc.file ? (
                                                    <>
                                                        <img src={URL.createObjectURL(doc.file)} alt={doc.label} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Maximize2 className="text-white drop-shadow-md" size={24} />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-gray-300 text-xs">No Image</div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-700">{doc.label}</span>
                                                {doc.file && (
                                                    <a href={URL.createObjectURL(doc.file)} download={`${doc.label}-${selectedContract.contractNumber}.jpg`} className="text-blue-500 hover:text-blue-700">
                                                        <Download size={14} />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 3. STATUS SECTION & GENERATE */}
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <RotateCw size={16} className="text-blue-500" /> Update Status & Dokumen
                                </h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Status Kontrak</label>
                                        <select 
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value as any)}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none bg-white font-bold text-slate-700"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Review">Review</option>
                                            <option value="Proses">Proses</option>
                                            <option value="Selesai">Selesai</option>
                                        </select>
                                        
                                        {/* Generate Button Logic */}
                                        {(editStatus === 'Proses' || selectedContract.status === 'Proses') && (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={handleGenerateContract}
                                                    disabled={isGeneratingContract}
                                                    className="w-full py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 text-sm"
                                                >
                                                    {isGeneratingContract ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                                                    {isGeneratingContract ? 'Membuat Dokumen...' : 'Generate Draft Kontrak'}
                                                </button>
                                                <p className="text-[10px] text-slate-400 mt-2 text-center">
                                                    Unduh draft perjanjian otomatis untuk ditandatangani.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload PDF Logic */}
                                    {editStatus === 'Selesai' && (
                                        <div className="animate-fade-in">
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                                                Upload Kontrak Final (PDF) <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input 
                                                    type="file" 
                                                    accept="application/pdf"
                                                    onChange={handleSignedPdfUpload}
                                                    className="hidden" 
                                                    id="pdf-upload"
                                                />
                                                <label 
                                                    htmlFor="pdf-upload"
                                                    className={`w-full px-4 py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors
                                                        ${signedPdf || selectedContract.signedContractFile ? 'border-green-500 bg-green-50 text-green-700' : 'border-blue-300 bg-white hover:bg-blue-50 text-blue-600'}
                                                    `}
                                                >
                                                    {signedPdf ? (
                                                        <><CheckCircle size={18} /> {signedPdf.name}</>
                                                    ) : selectedContract.signedContractFile ? (
                                                        <><CheckCircle size={18} /> File Tersedia (Ganti?)</>
                                                    ) : (
                                                        <><Upload size={18} /> Pilih File PDF</>
                                                    )}
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-2">
                                                Wajib upload dokumen yang sudah ditandatangani kedua belah pihak.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
                             <button 
                                onClick={handleCloseDetail}
                                className="px-6 py-2.5 bg-white border border-gray-200 text-slate-600 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                             >
                                 Batal
                             </button>
                             <button 
                                onClick={handleSaveDetail}
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/30"
                             >
                                 {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                 Simpan Perubahan
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DOCUMENT PREVIEW MODAL */}
            {previewImage && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
                    onClick={() => setPreviewImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
                        onClick={() => setPreviewImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img 
                        src={previewImage} 
                        alt="Preview" 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}

            {/* CROPPER MODAL */}
            {cropModalOpen && cropImageSrc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white z-10">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FileImage size={20} className="text-blue-500" />
                                Crop & Rotate Image
                            </h3>
                            <button onClick={handleCloseCrop} className="p-2 hover:bg-gray-100 rounded-full text-slate-500">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="relative flex-1 bg-slate-900">
                            <Cropper
                                image={cropImageSrc}
                                crop={crop}
                                zoom={zoom}
                                rotation={rotation}
                                aspect={cropTargetField === 'signatureFile' ? 3 / 2 : 4 / 3}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                onRotationChange={setRotation}
                            />
                        </div>

                        <div className="p-4 bg-white border-t border-gray-200 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                        <ZoomIn size={12} /> Zoom
                                    </label>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                        <RotateCw size={12} /> Rotate
                                    </label>
                                    <input
                                        type="range"
                                        value={rotation}
                                        min={0}
                                        max={360}
                                        step={1}
                                        aria-labelledby="Rotation"
                                        onChange={(e) => setRotation(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    onClick={handleCloseCrop}
                                    className="px-6 py-2.5 text-slate-600 font-bold text-sm bg-gray-100 rounded-xl hover:bg-gray-200"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleCropSave}
                                    disabled={isProcessingCrop}
                                    className="px-6 py-2.5 text-white font-bold text-sm bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2"
                                >
                                    {isProcessingCrop ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Simpan Gambar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
