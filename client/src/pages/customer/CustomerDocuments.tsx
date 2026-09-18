import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Eye,
  Loader2,
  FileCheck2,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface DocumentItem {
  id: string;
  documentType: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUIRED';
  version: number;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  uploadedAt: string;
}

interface DocumentRequestItem {
  id: string;
  documentType: string;
  title: string;
  description?: string | null;
  status: string;
  createdAt: string;
}

const REQUIRED_DOC_DEFINITIONS = [
  {
    type: 'AADHAAR_FRONT',
    title: 'Aadhaar Card (Front)',
    description: 'Clear photo or scan of the front side showing your photo and name.',
    required: true,
  },
  {
    type: 'AADHAAR_BACK',
    title: 'Aadhaar Card (Back)',
    description: 'Clear photo or scan of the back side showing your full registered address.',
    required: true,
  },
  {
    type: 'PAN',
    title: 'PAN Card',
    description: 'Permanent Account Number card showing clear PAN number and signature.',
    required: true,
  },
  {
    type: 'INCOME_PROOF',
    title: 'Income Proof',
    description: 'Recent salary slip, Form 16, or ITR document verifying monthly income.',
    required: false,
  },
  {
    type: 'BANK_STATEMENT',
    title: 'Bank Statement',
    description: 'Bank statement for the last 3-6 months in PDF or scanned format.',
    required: false,
  },
  {
    type: 'OTHER',
    title: 'Other Documents',
    description: 'Additional documentation requested by the verification team.',
    required: false,
  },
];

export const CustomerDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<DocumentRequestItem[]>([]);
  const [kycStatus, setKycStatus] = useState<string>('PENDING');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [targetReuploadDocId, setTargetReuploadDocId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_DOCS.LIST);
      setDocuments(res.data.data.documents || []);
      setPendingRequests(res.data.data.pendingRequests || []);
      setKycStatus(res.data.data.customer?.kycStatus || 'PENDING');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load KYC documents';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const openUploadModal = (docType: string, reuploadDocId?: string) => {
    setSelectedDocType(docType);
    setTargetReuploadDocId(reuploadDocId || null);
    setSelectedFile(null);
    setDialogError(null);
    setUploadDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10 MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setDialogError('File size exceeds 10 MB limit. Please select a smaller file.');
      setSelectedFile(null);
      return;
    }

    // Validate type
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setDialogError('Unsupported file type. Please upload a PDF, JPG, JPEG, or PNG.');
      setSelectedFile(null);
      return;
    }

    setDialogError(null);
    setSelectedFile(file);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !selectedDocType) {
      setDialogError('Please select a document file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setDialogError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', selectedDocType);

      if (targetReuploadDocId) {
        await apiClient.post(API_ENDPOINTS.CUSTOMER_DOCS.REUPLOAD(targetReuploadDocId), formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await apiClient.post(API_ENDPOINTS.CUSTOMER_DOCS.UPLOAD, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setSuccessMessage('Document uploaded successfully and queued for KYC review.');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      fetchDocuments();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to upload document. Please try again.';
      setDialogError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewDocument = async (documentId: string, fileName: string) => {
    try {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_DOCS.FILE(documentId), {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch {
      setErrorMessage(`Failed to open document "${fileName}". Please try again.`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="success" className="flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case 'REUPLOAD_REQUIRED':
        return (
          <Badge variant="warning" className="flex items-center space-x-1">
            <RotateCw className="w-3 h-3 mr-1" /> Re-upload Required
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      case 'UNDER_REVIEW':
      case 'PENDING':
        return (
          <Badge variant="outline" className="flex items-center space-x-1 bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="w-3 h-3 mr-1" /> Under Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-400 bg-slate-100 border-none">
            Not Uploaded
          </Badge>
        );
    }
  };

  const getKycStatusAlert = () => {
    switch (kycStatus) {
      case 'APPROVED':
        return (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start space-x-3 text-emerald-900">
            <FileCheck2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">KYC Verification Complete</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                All your primary KYC documents have been reviewed and approved by our verification team. You are eligible to apply for instant loans.
              </p>
            </div>
          </div>
        );
      case 'REUPLOAD_REQUIRED':
        return (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-3 text-amber-900">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Action Required: Document Re-upload</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Our verification team reviewed your submissions and requested corrections for one or more documents. Please review the reasons and re-upload clear copies below.
              </p>
            </div>
          </div>
        );
      case 'UNDER_REVIEW':
        return (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start space-x-3 text-blue-900">
            <Clock className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Documents Under Review</h4>
              <p className="text-xs text-blue-700 mt-0.5">
                Your submitted documents are currently being verified. This typically takes between 15 to 30 minutes during business hours.
              </p>
            </div>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start space-x-3 text-red-900">
            <AlertCircle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">KYC Verification Rejected</h4>
              <p className="text-xs text-red-700 mt-0.5">
                Your verification could not be completed. Please review the notes below or contact our customer support team.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex items-start space-x-3 text-slate-800">
            <FolderOpen className="w-6 h-6 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">KYC Verification Pending</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Please upload your Aadhaar Card (Front and Back) and PAN Card to begin the identity verification process.
              </p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-slate-500 font-medium">Loading your KYC documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">KYC & Document Verification</h2>
          <p className="text-xs text-slate-500 mt-1">
            Regulatory compliance requires identity verification before loan disbursement.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Your KYC Status:</span>
          {getStatusBadge(kycStatus)}
        </div>
      </div>

      {/* Global Alerts */}
      {getKycStatusAlert()}

      {successMessage && (
        <div className="flex items-center space-x-2 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center space-x-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Pending Additional Document Requests from Admin */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Requested Documents from Verification Officer</span>
            </CardTitle>
            <CardDescription className="text-amber-800 text-xs">
              The administrator requested additional documentation to proceed with your verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-4 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h5 className="font-semibold text-slate-900 text-sm">{req.title}</h5>
                  {req.description && <p className="text-xs text-slate-600 mt-0.5">{req.description}</p>}
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Requested on {new Date(req.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => openUploadModal(req.documentType)}
                  className="shrink-0 flex items-center space-x-1"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  <span>Upload This Document</span>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Document Category Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REQUIRED_DOC_DEFINITIONS.map((def) => {
          const doc = documents.find((d) => d.documentType === def.type);
          const isUploaded = !!doc;
          const status = doc ? doc.status : 'NOT_UPLOADED';

          return (
            <Card key={def.type} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>{def.title}</span>
                      {def.required && (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          Mandatory
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">{def.description}</CardDescription>
                  </div>
                  {getStatusBadge(status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 flex-1 flex flex-col justify-end">
                {/* Rejection / Correction Reason Alert */}
                {doc && (doc.status === 'REUPLOAD_REQUIRED' || doc.status === 'REJECTED') && doc.rejectionReason && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs">
                    <span className="font-semibold block mb-0.5">Admin Reviewer Feedback:</span>
                    <p className="text-slate-700">{doc.rejectionReason}</p>
                  </div>
                )}

                {/* Document details if uploaded */}
                {doc && (
                  <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div className="truncate mr-2">
                      <span className="font-medium text-slate-800 truncate block">{doc.fileName}</span>
                      <span className="text-[11px] text-slate-400">
                        {(doc.fileSize / 1024).toFixed(1)} KB • Version {doc.version}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDocument(doc.id, doc.fileName)}
                      className="h-7 text-xs flex items-center text-slate-600 hover:text-emerald-700 shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>View</span>
                    </Button>
                  </div>
                )}

                {/* Upload action buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                  {!isUploaded ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openUploadModal(def.type)}
                      className="w-full sm:w-auto flex items-center justify-center space-x-1"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      <span>Upload Document</span>
                    </Button>
                  ) : doc.status === 'REUPLOAD_REQUIRED' || doc.status === 'REJECTED' ? (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => openUploadModal(def.type, doc.id)}
                      className="w-full sm:w-auto flex items-center justify-center space-x-1"
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1" />
                      <span>Re-upload Corrected Version</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openUploadModal(def.type, doc.id)}
                      className="text-xs text-slate-500 hover:text-slate-900"
                    >
                      <span>Replace / Update</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Upload Dialog with Camera & File Picker */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {targetReuploadDocId ? 'Re-upload Corrected Document' : 'Upload Document'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload a clear photo or scanned PDF. Max file size: 10 MB. Supported: PDF, JPG, PNG.
            </DialogDescription>
          </DialogHeader>

          {dialogError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{dialogError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {/* Upload Options */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors text-slate-700"
              >
                <FolderOpen className="w-8 h-8 text-emerald-600 mb-2" />
                <span className="text-xs font-semibold">Choose File</span>
                <span className="text-[10px] text-slate-400">PDF, JPG, PNG</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors text-slate-700"
              >
                <Camera className="w-8 h-8 text-emerald-600 mb-2" />
                <span className="text-xs font-semibold">Use Camera</span>
                <span className="text-[10px] text-slate-400">Capture photo</span>
              </button>
            </div>

            {/* Selected File Feedback */}
            {selectedFile && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="truncate mr-2">
                  <span className="font-semibold text-emerald-900 block truncate">{selectedFile.name}</span>
                  <span className="text-emerald-700">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="h-6 text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleUploadSubmit}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1.5" />
                  <span>Confirm Upload</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
