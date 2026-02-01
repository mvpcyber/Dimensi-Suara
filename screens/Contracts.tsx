
import React, { useState, useEffect, useRef } from 'react';
import { Contract } from '../types';
import { uploadContractToGoogle, updateContractStatus } from '../services/googleService';
import { FileSignature, Plus, Search, Trash2, Calendar, User, FileText, CheckCircle, List, ArrowLeft, ArrowRight, Upload, Clock, CreditCard, PenTool, Hash, Loader2, Database, AlertCircle, WifiOff, FileImage, RotateCw, ZoomIn, X, Check, Eye, Download, ChevronRight, Maximize2, Printer } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop/types';

interface Props {
    activeTab: string;
    contracts: Contract[];
    setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
}

const API_URL = '/api/contracts';

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

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

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

  if (!ctx) return null;
  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(data, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(null); return; }
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      resolve(file);
    }, 'image/jpeg', 0.9);
  });
}

export const Contracts: React.FC<Props> = ({ activeTab, contracts, setContracts }) => {
    const [formData, setFormData] = useState<Contract>({
        id: '',
        contractNumber: '',
        artistName: '',
        startDate: '',
        endDate: '',
        durationYears: 1,
        royaltyRate: 70,
        status: 'Pending',
        createdDate: new Date().toISOString().split('T')[0],
        ktpFile: null,
        npwpFile: null,
        signatureFile: null
    });

    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropTargetField, setCropTargetField] = useState<'ktpFile' | 'npwpFile' | 'signatureFile' | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessingCrop, setIsProcessingCrop] = useState(false);

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [editStatus, setEditStatus] = useState<Contract['status']>('Pending');
    const [signedPdf, setSignedPdf] = useState<File | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGeneratingContract, setIsGeneratingContract] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    const fetchContracts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error("Gagal terhubung ke server");
            const data = await response.json();
            const mappedData: Contract[] = data.map((item: any) => ({
                id: item.id.toString(),
                contractNumber: item.contract_number,
                artistName: item.artist_name,
                startDate: item.start_date ? item.start_date.split('T')[0] : '',
                endDate: item.end_date ? item.end_date.split('T')[0] : '',
                durationYears: item.duration_years,
                royaltyRate: item.royalty_rate,
                status: item.status,
                createdDate: item.created_at ? item.created_at.split('T')[0] : '',
                ktpFile: null, npwpFile: null, signatureFile: null, signedContractFile: null
            }));
            setContracts(mappedData);
            setIsOffline(false);
        } catch (err) {
            setIsOffline(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'CONTRACT_ALL') fetchContracts();
    }, [activeTab]);

    const generateContractNumber = async () => {
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${today.getFullYear()}`;
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `DS.${randomNum}-${dateStr}`;
    };

    useEffect(() => {
        const initForm = async () => {
            if (activeTab === 'CONTRACT_NEW') {
                setShowSuccess(false);
                const newNum = await generateContractNumber();
                setFormData(prev => ({
                    ...prev, id: '', contractNumber: newNum, artistName: '', 
                    startDate: '', status: 'Pending', createdDate: new Date().toISOString().split('T')[0],
                    ktpFile: null, npwpFile: null, signatureFile: null
                }));
            }
        };
        initForm();
    }, [activeTab]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'royaltyRate' || name === 'durationYears') ? Number(value) : value
        }));
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, field: 'ktpFile' | 'npwpFile' | 'signatureFile') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCropImageSrc(reader.result?.toString() || null);
                setCropTargetField(field);
                setCropModalOpen(true);
                setZoom(1); setRotation(0); setCrop({ x: 0, y: 0 });
            });
            reader.readAsDataURL(file);
            e.target.value = ''; 
        }
    };

    // --- Fix: Added missing onCropComplete callback for the Cropper component ---
    const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropSave = async () => {
        if (!cropImageSrc || !croppedAreaPixels || !cropTargetField) return;
        setIsProcessingCrop(true);
        try {
            const prefix = cropTargetField === 'ktpFile' ? 'ktp' : cropTargetField === 'npwpFile' ? 'npwp' : 'signature';
            const fileName = `${prefix}-${formData.contractNumber}.jpg`;
            const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels, rotation, { horizontal: false, vertical: false }, fileName);
            if (croppedFile) {
                setFormData(prev => ({ ...prev, [cropTargetField]: croppedFile }));
                setCropModalOpen(false);
                setCropImageSrc(null); setCropTargetField(null);
            }
        } catch (e) {
            alert("Gagal memproses gambar.");
        } finally {
            setIsProcessingCrop(false);
        }
    };

    const handleViewDetail = (contract: Contract) => {
        setSelectedContract(contract);
        setEditStatus(contract.status);
        setSignedPdf(contract.signedContractFile || null);
        setDetailModalOpen(true);
    };

    const handleSaveDetail = async () => {
        if (!selectedContract) return;
        setIsSubmitting(true);
        try {
            // Update ke backend MySQL
            await updateContractStatus(selectedContract.id, editStatus);
            
            // Update state lokal
            setContracts(prev => prev.map(c => c.id === selectedContract.id ? { ...c, status: editStatus } : c));
            setDetailModalOpen(false);
            alert("Status berhasil diperbarui!");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.ktpFile || !formData.npwpFile || !formData.signatureFile) {
            alert("Harap upload KTP, NPWP, dan Tanda Tangan.");
            return;
        }

        setIsSubmitting(true);
        const start = new Date(formData.startDate);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + formData.durationYears);
        const calculatedEndDate = end.toISOString().split('T')[0];
        
        const newContract: Contract = { ...formData, id: '', endDate: calculatedEndDate, status: 'Pending' };

        try {
            await uploadContractToGoogle(newContract);
            setShowSuccess(true);
        } catch (err: any) {
            alert("Gagal menyimpan: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus kontrak ini?')) return;
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            setContracts(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            alert("Gagal menghapus.");
        }
    };

    const filteredContracts = contracts.filter(c => 
        c.artistName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
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
            </div>

            {activeTab === 'CONTRACT_NEW' && (
                showSuccess ? (
                    <div className="text-center bg-white p-12 rounded-3xl shadow-xl border border-gray-100 max-w-2xl mx-auto mt-10 animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">Kontrak Berhasil Disimpan!</h2>
                        <button 
                            onClick={async () => {
                                setShowSuccess(false);
                                const newNum = await generateContractNumber();
                                setFormData(prev => ({ ...prev, contractNumber: newNum, artistName: '', startDate: '', ktpFile: null, npwpFile: null, signatureFile: null }));
                            }}
                            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            Buat Kontrak Lain
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nomor Kontrak (Otomatis)</label>
                                <input value={formData.contractNumber} readOnly className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-slate-500 font-mono font-bold" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Nama Partner *</label>
                                <input name="artistName" value={formData.artistName} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Royalty Rate (%)</label>
                                <input type="number" name="royaltyRate" value={formData.royaltyRate} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Mulai *</label>
                                <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Durasi (Tahun) *</label>
                                <input type="number" name="durationYears" value={formData.durationYears} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-xl" required />
                            </div>
                            <div className="col-span-2 border-t pt-6">
                                <h3 className="text-sm font-bold text-slate-800 mb-4">Dokumen Pendukung</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {['ktpFile', 'npwpFile', 'signatureFile'].map((field: any) => (
                                        <div key={field} className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer">
                                            <input type="file" onChange={(e) => handleFileSelect(e, field)} className="hidden" id={`upload-${field}`} accept="image/*" />
                                            <label htmlFor={`upload-${field}`} className="cursor-pointer block">
                                                <div className="mx-auto w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
                                                    {(formData as any)[field] ? <CheckCircle className="text-green-500" /> : <Upload className="text-slate-400" />}
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">{field.toUpperCase()}</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg">
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />}
                            {isSubmitting ? 'Mengunggah...' : 'Tambah Kontrak'}
                        </button>
                    </form>
                )
            )}

            {activeTab === 'CONTRACT_ALL' && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[600px] animate-fade-in">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                         <div className="relative w-full md:w-96">
                             <input placeholder="Cari partner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl" />
                             <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                         </div>
                         <div className="font-bold text-blue-600">Total: {contracts.length}</div>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">No. Kontrak</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nama Partner</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayedContracts.map((contract) => (
                                    <tr key={contract.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono text-xs">{contract.contractNumber}</td>
                                        <td className="px-6 py-4 font-bold">{contract.artistName}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${contract.status === 'Selesai' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {contract.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button onClick={() => handleViewDetail(contract)} className="p-2 text-slate-400 hover:text-blue-500"><Eye size={16} /></button>
                                            <button onClick={() => handleDelete(contract.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {detailModalOpen && selectedContract && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold">{selectedContract.artistName}</h3>
                            <button onClick={() => setDetailModalOpen(false)}><X /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Update Status Kontrak</label>
                                <select 
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value as any)}
                                    className="w-full px-4 py-3 rounded-xl border-2 bg-white font-bold"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Review">Review</option>
                                    <option value="Proses">Proses</option>
                                    <option value="Selesai">Selesai</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                             <button onClick={() => setDetailModalOpen(false)} className="px-6 py-2.5 font-bold">Batal</button>
                             <button onClick={handleSaveDetail} disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg">
                                 {isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
                                 Simpan Perubahan
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {cropModalOpen && cropImageSrc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
                        <div className="relative flex-1 bg-slate-900">
                            <Cropper
                                image={cropImageSrc} crop={crop} zoom={zoom} rotation={rotation}
                                aspect={cropTargetField === 'signatureFile' ? 3/2 : 4/3}
                                onCropChange={setCrop} onCropComplete={onCropComplete}
                                onZoomChange={setZoom} onRotationChange={setRotation}
                            />
                        </div>
                        <div className="p-4 bg-white border-t flex justify-end gap-3">
                            <button onClick={() => setCropModalOpen(false)} className="px-6 py-2">Batal</button>
                            <button onClick={handleCropSave} className="px-6 py-2 bg-blue-600 text-white rounded-xl">Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
