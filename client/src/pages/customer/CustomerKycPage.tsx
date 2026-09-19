import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface DocumentItem {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: string;
  rejectionReason?: string;
  version: number;
  uploadedAt: string;
}

interface ProfileData {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  aadhaarMasked: string;
  kycStatus: string;
}

const REQUIRED_DOCUMENTS = [
  { type: 'AADHAAR_FRONT', label: 'Aadhaar Card (Front)', required: true },
  { type: 'AADHAAR_BACK', label: 'Aadhaar Card (Back)', required: true },
  { type: 'PAN', label: 'PAN Card', required: true },
  { type: 'INCOME_PROOF', label: 'Income Proof / Salary Slip', required: false },
  { type: 'BANK_STATEMENT', label: 'Bank Statement (Latest 3 Months)', required: false },
  { type: 'OTHER', label: 'Additional Supporting Document', required: false },
];

export const CustomerKycPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<string>('AADHAAR_FRONT');
  const [file, setFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch Profile for KYC status and masked details
  const { data: profile } = useQuery<ProfileData>({
    queryKey: ['customer-profile'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMERS.PROFILE);
      return res.data;
    },
  });

  // Fetch Customer Documents
  const { data: documents = [] } = useQuery<DocumentItem[]>({
    queryKey: ['customer-documents'],
    queryFn: async () => {
      const res = await apiClient.get(API_ENDPOINTS.CUSTOMER_DOCS.LIST);
      return res.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ documentType, uploadFile }: { documentType: string; uploadFile: File }) => {
      const formData = new FormData();
      formData.append('documentType', documentType);
      formData.append('file', uploadFile);
      return apiClient.post(API_ENDPOINTS.CUSTOMER_DOCS.UPLOAD, formData);
    },
    onSuccess: () => {
      setSuccessMessage('Document uploaded successfully. Underwriting team has been notified.');
      setErrorMessage(null);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ['customer-documents'] });
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer-profile'] });
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Failed to upload document. Please check file format and size.');
      setSuccessMessage(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 10 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 10 MB limit.');
        setFile(null);
        return;
      }
      setErrorMessage(null);
      setFile(selected);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a file or take a photo to upload.');
      return;
    }
    uploadMutation.mutate({ documentType: selectedType, uploadFile: file });
  };

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-emerald-600 text-white">Verified ✓</Badge>;
      case 'UNDER_REVIEW':
      case 'PENDING':
        return <Badge className="bg-amber-600 text-white">In Review</Badge>;
      case 'REUPLOAD_REQUIRED':
        return <Badge className="bg-orange-600 text-white">Re-upload Required</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <span>KYC & Identity Verification</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Submit Aadhaar, PAN and proof of income to verify your financial profile and qualify for instant loans.
          </p>
        </div>
        <div>
          {profile && (
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-slate-100 text-slate-800 border border-slate-200">
              KYC Status: <strong>{profile.kycStatus}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Masked Info & Status Card */}
      <Card className="shadow-sm border-slate-200 bg-slate-50/70">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Registered Borrower</span>
              <span className="text-sm font-semibold text-slate-900">{profile?.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Aadhaar (Masked)</span>
              <span className="text-sm font-mono font-semibold text-slate-900">{profile?.aadhaarMasked}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Verified Mobile</span>
              <span className="text-sm font-mono font-semibold text-slate-900">+91 {profile?.mobile}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload & Checklist Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Checklist */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Document Checklist</CardTitle>
              <CardDescription>Required proof of identity and income documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {REQUIRED_DOCUMENTS.map((req) => {
                const uploaded = documents.find((d) => d.documentType === req.type);

                return (
                  <div
                    key={req.type}
                    className="p-3.5 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {uploaded && uploaded.status === 'APPROVED' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : uploaded && uploaded.status === 'REUPLOAD_REQUIRED' ? (
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        ) : uploaded ? (
                          <Clock className="w-5 h-5 text-amber-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-slate-900">{req.label}</span>
                          {req.required && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-medium">Mandatory</span>
                          )}
                        </div>

                        {uploaded ? (
                          <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
                            <p className="truncate max-w-xs">{uploaded.fileName} (v{uploaded.version})</p>
                            {uploaded.rejectionReason && (
                              <p className="text-red-600 font-medium">Reason: {uploaded.rejectionReason}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 mt-0.5">Not yet uploaded</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      {uploaded && getDocStatusBadge(uploaded.status)}

                      {uploaded && (
                        <a
                          href={`/api/customer/documents/${uploaded.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded text-slate-500 hover:text-primary hover:bg-slate-100"
                          title="View Document"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}

                      {(!uploaded || uploaded.status === 'REUPLOAD_REQUIRED' || uploaded.status === 'REJECTED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedType(req.type)}
                          className="text-xs h-7 px-2.5"
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          {uploaded ? 'Re-upload' : 'Upload'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Upload Action Form Card */}
        <div>
          <Card className="shadow-sm border-slate-200 sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <Upload className="w-4 h-4 text-primary" />
                <span>Upload Document</span>
              </CardTitle>
              <CardDescription>Upload a clear photo or PDF scan (max 10 MB)</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                {successMessage && (
                  <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="docTypeSelect" className="text-xs font-semibold text-slate-700">Document Type</label>
                  <select
                    id="docTypeSelect"
                    aria-label="Document Type"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full text-xs h-9 px-2.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {REQUIRED_DOCUMENTS.map((req) => (
                      <option key={req.type} value={req.type}>
                        {req.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="kycFileInput" className="text-xs font-semibold text-slate-700">Choose File or Photo</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                    <input
                      type="file"
                      id="kycFileInput"
                      aria-label="Upload KYC File or Take Photo"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="kycFileInput" className="cursor-pointer space-y-2 block">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                        <Camera className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-medium text-slate-700">
                        {file ? file.name : 'Tap to browse or take photo'}
                      </p>
                      <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
                    </label>
                  </div>
                  {file && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!file || uploadMutation.isPending}
                  className="w-full text-xs h-9"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Upload Document
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
