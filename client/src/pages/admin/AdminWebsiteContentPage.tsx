import React, { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { useBranding } from '@/contexts/BrandingContext';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Building2,
  HelpCircle,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DocumentItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  mandatory: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

const DEFAULT_DOCUMENTS: DocumentItem[] = [
  { id: 'application_form', name: 'Completed Application Form', description: 'The duly filled and submitted loan application form.', icon: 'ClipboardCheck', enabled: true, mandatory: true },
  { id: 'photograph', name: 'Passport-Sized Photograph', description: 'Recent passport-size photograph of the applicant.', icon: 'Users', enabled: true, mandatory: true },
  { id: 'identity_proof', name: 'Identity Proof', description: 'Aadhaar Card, PAN Card, Passport, Voter ID, or Driving Licence.', icon: 'UserCheck', enabled: true, mandatory: true },
  { id: 'address_proof', name: 'Address Proof', description: 'Utility bill, Aadhaar, Voter ID, Passport, or Rent Agreement.', icon: 'MapPin', enabled: true, mandatory: true },
  { id: 'business_proof', name: 'Business Registration Proof', description: 'GST Certificate, MSME Certificate, Trade Licence, or Partnership Deed (if applicable).', icon: 'Building2', enabled: true, mandatory: false },
  { id: 'bank_statement', name: 'Bank Statements', description: 'Last 3–6 months bank account statements showing income credits.', icon: 'Banknote', enabled: true, mandatory: true },
  { id: 'income_proof', name: 'Income Proof / Balance Sheets', description: 'Salary slips, ITR, Form 16, or audited balance sheets for self-employed.', icon: 'TrendingUp', enabled: true, mandatory: true },
];

const DEFAULT_FAQS: FaqItem[] = [
  { question: 'What documents do I need to apply?', answer: 'You typically need identity proof (Aadhaar / PAN), address proof, bank statements, income proof (salary slips or ITR), and a completed application form. Specific requirements depend on your applicant profile and the loan type.' },
  { question: 'Who is eligible to apply?', answer: 'Indian residents with a regular income source and a valid bank account may apply. Exact eligibility is determined during the application assessment process based on configured criteria.' },
  { question: 'How much can I apply for?', answer: 'Loan amounts are subject to configured limits and individual assessment. The displayed range on this page reflects the currently configured parameters.' },
  { question: 'What is the repayment tenure?', answer: 'Repayment tenure range is displayed in the Loan Information section. Actual tenure for your loan will be determined based on the approved application terms.' },
  { question: 'How is the interest rate determined?', answer: 'Interest rates are determined by the applicable lender based on your credit profile, repayment capacity, loan amount, and tenure. The displayed APR range is indicative only.' },
  { question: 'Is loan approval guaranteed after applying?', answer: 'No. Submission of an application does not guarantee approval. Applications are assessed individually based on eligibility, documentation, credit history, and applicable lender policies.' },
  { question: 'How long does application review take?', answer: 'Review timelines depend on the completeness of your application and documentation, and the applicable lender\'s processing policy. You can track your application status in your dashboard.' },
  { question: 'What happens after I submit my application?', answer: 'After submission, your application enters a review queue. You may be asked to submit additional documents. The final decision (approval or rejection) is communicated through your dashboard and registered contact details.' },
];

export const AdminWebsiteContentPage: React.FC = () => {
  const { refreshBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Active section accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hero: true,
    financial: true,
    eligibility: true,
    documents: true,
    faqs: true,
    regulatory: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Full branding payload to preserve core branding
  const [fullBrandingData, setFullBrandingData] = useState<Record<string, any>>({});

  // 1. Hero
  const [heroHeadline, setHeroHeadline] = useState('Simple, Transparent Loan Application');
  const [heroSubheadline, setHeroSubheadline] = useState('Apply online, complete verification, and track your application status — all in one place.');
  const [appEnabled, setAppEnabled] = useState(false);
  const [appDownloadUrl, setAppDownloadUrl] = useState('');

  // 2. Financial Limits & APR
  const [minLoanAmount, setMinLoanAmount] = useState(10000);
  const [maxLoanAmount, setMaxLoanAmount] = useState(3000000);
  const [minTenureMonths, setMinTenureMonths] = useState(6);
  const [maxTenureMonths, setMaxTenureMonths] = useState(84);
  const [minApr, setMinApr] = useState(12.0);
  const [maxApr, setMaxApr] = useState(36.0);
  const [processingFeePolicy, setProcessingFeePolicy] = useState('Processing fee applicable as per loan terms. GST as per applicable rates.');
  const [otherChargesPolicy, setOtherChargesPolicy] = useState('Late payment charges, prepayment charges, and other fees as per the approved loan agreement.');

  // 3. Eligibility
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [minMonthlyIncome, setMinMonthlyIncome] = useState(15000);
  const [creditScoreCriteria, setCreditScoreCriteria] = useState('Good credit history preferred. Applications assessed individually.');
  const [bankAccountRequired, setBankAccountRequired] = useState(true);
  const [employmentCriteria, setEmploymentCriteria] = useState('Salaried, Self-Employed, or Business Owner');
  const [residentialStatusCriteria, setResidentialStatusCriteria] = useState('Indian Resident with valid address proof');

  // 4. Documents Checklist
  const [documents, setDocuments] = useState<DocumentItem[]>(DEFAULT_DOCUMENTS);

  // 5. FAQs
  const [faqs, setFaqs] = useState<FaqItem[]>(DEFAULT_FAQS);

  // 6. Regulatory & Lender Disclosures
  const [lenderName, setLenderName] = useState('');
  const [lenderLegalName, setLenderLegalName] = useState('');
  const [lenderRegistrationNumber, setLenderRegistrationNumber] = useState('');
  const [lenderType, setLenderType] = useState('NBFC - Investment and Credit Company (NBFC-ICC)');
  const [lenderAddress, setLenderAddress] = useState('');
  const [lenderWebsite, setLenderWebsite] = useState('');
  const [isDirectLender, setIsDirectLender] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerRelationship, setPartnerRelationship] = useState('Lending Service Provider / Direct Sourcing Partner');
  const [disclaimerText, setDisclaimerText] = useState('');

  const fetchContentSettings = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.get(API_ENDPOINTS.SETTINGS.BRANDING_GET);
      const data = res.data?.data || res.data;
      if (data) {
        setFullBrandingData(data);

        // Hero
        setHeroHeadline(data.heroHeadline || 'Simple, Transparent Loan Application');
        setHeroSubheadline(data.heroSubheadline || 'Apply online, complete verification, and track your application status — all in one place.');
        setAppEnabled(Boolean(data.appEnabled));
        setAppDownloadUrl(data.appDownloadUrl || '');

        // Financial
        setMinLoanAmount(data.minLoanAmount ?? 10000);
        setMaxLoanAmount(data.maxLoanAmount ?? 3000000);
        setMinTenureMonths(data.minTenureMonths ?? 6);
        setMaxTenureMonths(data.maxTenureMonths ?? 84);
        setMinApr(data.minApr ?? 12.0);
        setMaxApr(data.maxApr ?? 36.0);
        setProcessingFeePolicy(data.processingFeePolicy || 'Processing fee applicable as per loan terms. GST as per applicable rates.');
        setOtherChargesPolicy(data.otherChargesPolicy || 'Late payment charges, prepayment charges, and other fees as per the approved loan agreement.');

        // Eligibility
        setMinAge(data.minAge ?? 18);
        setMaxAge(data.maxAge ?? 60);
        setMinMonthlyIncome(data.minMonthlyIncome ?? 15000);
        setCreditScoreCriteria(data.creditScoreCriteria || 'Good credit history preferred. Applications assessed individually.');
        setBankAccountRequired(data.bankAccountRequired !== false);
        setEmploymentCriteria(data.employmentCriteria || 'Salaried, Self-Employed, or Business Owner');
        setResidentialStatusCriteria(data.residentialStatusCriteria || 'Indian Resident with valid address proof');

        // Documents JSON
        if (data.documentsConfigJson) {
          try {
            const parsed = JSON.parse(data.documentsConfigJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDocuments(parsed);
            }
          } catch {
            setDocuments(DEFAULT_DOCUMENTS);
          }
        }

        // FAQs JSON
        if (data.faqsJson) {
          try {
            const parsedFaqs = JSON.parse(data.faqsJson);
            if (Array.isArray(parsedFaqs) && parsedFaqs.length > 0) {
              setFaqs(parsedFaqs);
            }
          } catch {
            setFaqs(DEFAULT_FAQS);
          }
        }

        // Regulatory & Disclosures
        setLenderName(data.lenderName || '');
        setLenderLegalName(data.lenderLegalName || '');
        setLenderRegistrationNumber(data.lenderRegistrationNumber || '');
        setLenderType(data.lenderType || 'NBFC - Investment and Credit Company (NBFC-ICC)');
        setLenderAddress(data.lenderAddress || '');
        setLenderWebsite(data.lenderWebsite || '');
        setIsDirectLender(Boolean(data.isDirectLender));
        setPartnerName(data.partnerName || '');
        setPartnerRelationship(data.partnerRelationship || 'Lending Service Provider / Direct Sourcing Partner');
        setDisclaimerText(data.disclaimerText || '');
      }
    } catch (err: unknown) {
      console.error('Failed to load website content settings:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load website content settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContentSettings();
  }, []);

  // Document Helpers
  const addDocument = () => {
    const newDoc: DocumentItem = {
      id: `doc_${Date.now()}`,
      name: 'New Document Requirement',
      description: 'Please upload a clear copy of this document.',
      icon: 'ClipboardCheck',
      enabled: true,
      mandatory: true,
    };
    setDocuments([...documents, newDoc]);
  };

  const updateDocument = (index: number, updated: Partial<DocumentItem>) => {
    setDocuments((prev) => prev.map((d, i) => (i === index ? { ...d, ...updated } : d)));
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // FAQ Helpers
  const addFaq = () => {
    const newFaq: FaqItem = {
      question: 'New Frequently Asked Question',
      answer: 'Provide a clear, transparent answer here.',
    };
    setFaqs([...faqs, newFaq]);
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
  };

  const removeFaq = (index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.put(API_ENDPOINTS.SETTINGS.BRANDING_UPDATE, {
        ...fullBrandingData,
        heroHeadline: heroHeadline.trim(),
        heroSubheadline: heroSubheadline.trim(),
        appEnabled,
        appDownloadUrl: appDownloadUrl.trim() || undefined,

        minLoanAmount: Number(minLoanAmount),
        maxLoanAmount: Number(maxLoanAmount),
        minTenureMonths: Number(minTenureMonths),
        maxTenureMonths: Number(maxTenureMonths),
        minApr: Number(minApr),
        maxApr: Number(maxApr),
        processingFeePolicy: processingFeePolicy.trim(),
        otherChargesPolicy: otherChargesPolicy.trim(),

        minAge: Number(minAge),
        maxAge: Number(maxAge),
        minMonthlyIncome: Number(minMonthlyIncome),
        creditScoreCriteria: creditScoreCriteria.trim(),
        bankAccountRequired,
        employmentCriteria: employmentCriteria.trim(),
        residentialStatusCriteria: residentialStatusCriteria.trim(),

        documentsConfigJson: JSON.stringify(documents),
        faqsJson: JSON.stringify(faqs),

        lenderName: lenderName.trim() || undefined,
        lenderLegalName: lenderLegalName.trim() || undefined,
        lenderRegistrationNumber: lenderRegistrationNumber.trim() || undefined,
        lenderType: lenderType.trim() || undefined,
        lenderAddress: lenderAddress.trim() || undefined,
        lenderWebsite: lenderWebsite.trim() || undefined,
        isDirectLender,
        partnerName: partnerName.trim() || undefined,
        partnerRelationship: partnerRelationship.trim() || undefined,
        disclaimerText: disclaimerText.trim() || undefined,
      });

      setSuccessMessage('Website content saved successfully! Public loan landing page has been updated with your changes.');
      await refreshBranding();
    } catch (err: unknown) {
      console.error('Failed to update website content:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save website content');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
            <Globe className="w-7 h-7 text-primary" />
            Website Content Management
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure dynamic content for the public landing page: Hero banners, Financial parameters, Borrower eligibility rules, Document checklists, FAQs, and NBFC disclosures.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-primary shadow-xs transition"
        >
          <span>View Live Landing Page</span>
          <Globe className="w-3.5 h-3.5 text-primary" />
        </a>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-lg flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-lg flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="font-medium text-sm">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-red-700 hover:text-red-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-text-secondary">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm font-medium">Loading website content configuration...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECTION 1: HERO & CALL TO ACTION */}
          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('hero')}
              className="w-full px-6 py-4 flex items-center justify-between bg-surface hover:bg-surface-elevated transition border-b border-border"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <h2 className="text-sm font-bold text-text-primary">1. Hero Section & Mobile App CTA</h2>
                  <p className="text-xs text-text-secondary">Main headlines, hero subtext, and optional mobile app download button.</p>
                </div>
              </div>
              {openSections.hero ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
            </button>

            {openSections.hero && (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Hero Headline *
                  </label>
                  <input
                    type="text"
                    value={heroHeadline}
                    onChange={(e) => setHeroHeadline(e.target.value)}
                    placeholder="e.g. Simple, Transparent Loan Application"
                    className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Hero Subheadline / Value Proposition *
                  </label>
                  <textarea
                    value={heroSubheadline}
                    onChange={(e) => setHeroSubheadline(e.target.value)}
                    rows={2}
                    placeholder="e.g. Apply online, complete verification, and track your application status — all in one place."
                    className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary transition"
                    required
                  />
                </div>

                <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3 pt-2">
                    <input
                      type="checkbox"
                      id="app-enabled-checkbox"
                      checked={appEnabled}
                      onChange={(e) => setAppEnabled(e.target.checked)}
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                    />
                    <label htmlFor="app-enabled-checkbox" className="text-xs font-semibold text-text-primary cursor-pointer">
                      Enable "Download Mobile App" CTA on Landing Page
                    </label>
                  </div>

                  {appEnabled && (
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                        App Download URL (APK / Play Store)
                      </label>
                      <input
                        type="url"
                        value={appDownloadUrl}
                        onChange={(e) => setAppDownloadUrl(e.target.value)}
                        placeholder="https://play.google.com/store/apps/..."
                        className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: LOAN INFORMATION & FINANCIAL LIMITS */}
          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('financial')}
              className="w-full px-6 py-4 flex items-center justify-between bg-surface hover:bg-surface-elevated transition border-b border-border"
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <h2 className="text-sm font-bold text-text-primary">2. Loan Information & Financial Parameters</h2>
                  <p className="text-xs text-text-secondary">Amount ranges, tenure boundaries, APR rates, and fee disclosure policies.</p>
                </div>
              </div>
              {openSections.financial ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
            </button>

            {openSections.financial && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Min Loan Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={minLoanAmount}
                      onChange={(e) => setMinLoanAmount(Number(e.target.value))}
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Max Loan Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={maxLoanAmount}
                      onChange={(e) => setMaxLoanAmount(Number(e.target.value))}
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Tenure Range (Months)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={minTenureMonths}
                        onChange={(e) => setMinTenureMonths(Number(e.target.value))}
                        className="w-1/2 bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                        placeholder="Min"
                        required
                      />
                      <span className="text-text-secondary">to</span>
                      <input
                        type="number"
                        value={maxTenureMonths}
                        onChange={(e) => setMaxTenureMonths(Number(e.target.value))}
                        className="w-1/2 bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                        placeholder="Max"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Min APR (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={minApr}
                      onChange={(e) => setMinApr(Number(e.target.value))}
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Max APR (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={maxApr}
                      onChange={(e) => setMaxApr(Number(e.target.value))}
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Processing Fee Policy Description
                    </label>
                    <textarea
                      value={processingFeePolicy}
                      onChange={(e) => setProcessingFeePolicy(e.target.value)}
                      rows={2}
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Other Charges & Prepayment Policy
                    </label>
                    <textarea
                      value={otherChargesPolicy}
                      onChange={(e) => setOtherChargesPolicy(e.target.value)}
                      rows={2}
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: BORROWER ELIGIBILITY CRITERIA */}
          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('eligibility')}
              className="w-full px-6 py-4 flex items-center justify-between bg-surface hover:bg-surface-elevated transition border-b border-border"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <h2 className="text-sm font-bold text-text-primary">3. Borrower Eligibility Criteria</h2>
                  <p className="text-xs text-text-secondary">Age requirements, minimum monthly income, credit score guidance, and residential criteria.</p>
                </div>
              </div>
              {openSections.eligibility ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
            </button>

            {openSections.eligibility && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Min Age (Years)
                    </label>
                    <input
                      type="number"
                      value={minAge}
                      onChange={(e) => setMinAge(Number(e.target.value))}
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Max Age (Years)
                    </label>
                    <input
                      type="number"
                      value={maxAge}
                      onChange={(e) => setMaxAge(Number(e.target.value))}
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Min Monthly Income (₹)
                    </label>
                    <input
                      type="number"
                      value={minMonthlyIncome}
                      onChange={(e) => setMinMonthlyIncome(Number(e.target.value))}
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Employment Criteria
                    </label>
                    <input
                      type="text"
                      value={employmentCriteria}
                      onChange={(e) => setEmploymentCriteria(e.target.value)}
                      placeholder="Salaried, Self-Employed, or Business Owner"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Credit Score Guidance
                    </label>
                    <input
                      type="text"
                      value={creditScoreCriteria}
                      onChange={(e) => setCreditScoreCriteria(e.target.value)}
                      placeholder="Good credit history preferred. Assessed individually."
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Residential Status
                    </label>
                    <input
                      type="text"
                      value={residentialStatusCriteria}
                      onChange={(e) => setResidentialStatusCriteria(e.target.value)}
                      placeholder="Indian Resident with valid address proof"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-6">
                    <input
                      type="checkbox"
                      id="bank-account-required"
                      checked={bankAccountRequired}
                      onChange={(e) => setBankAccountRequired(e.target.checked)}
                      className="w-4 h-4 text-primary rounded border-border focus:ring-primary"
                    />
                    <label htmlFor="bank-account-required" className="text-xs font-semibold text-text-primary cursor-pointer">
                      Active Indian Bank Account Required for Disbursal
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: REQUIRED DOCUMENTS CHECKLIST */}
          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('documents')}
              className="w-full px-6 py-4 flex items-center justify-between bg-surface hover:bg-surface-elevated transition border-b border-border"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <h2 className="text-sm font-bold text-text-primary">4. Required Documents Checklist</h2>
                  <p className="text-xs text-text-secondary">Customizable document list shown to borrowers before application.</p>
                </div>
              </div>
              {openSections.documents ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
            </button>

            {openSections.documents && (
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  {documents.map((doc, idx) => (
                    <div key={doc.id || idx} className="p-3.5 rounded-lg border border-border bg-surface-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 space-y-1.5">
                        <input
                          type="text"
                          value={doc.name}
                          onChange={(e) => updateDocument(idx, { name: e.target.value })}
                          className="w-full bg-surface border border-border rounded px-2.5 py-1 text-xs font-bold text-text-primary"
                          placeholder="Document Name"
                        />
                        <input
                          type="text"
                          value={doc.description}
                          onChange={(e) => updateDocument(idx, { description: e.target.value })}
                          className="w-full bg-surface border border-border rounded px-2.5 py-1 text-[11px] text-text-secondary"
                          placeholder="Description & Accepted proofs"
                        />
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={doc.mandatory}
                            onChange={(e) => updateDocument(idx, { mandatory: e.target.checked })}
                            className="w-3.5 h-3.5 text-primary rounded"
                          />
                          <span>Mandatory</span>
                        </label>

                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={doc.enabled}
                            onChange={(e) => updateDocument(idx, { enabled: e.target.checked })}
                            className="w-3.5 h-3.5 text-primary rounded"
                          />
                          <span>Show on Web</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => removeDocument(idx)}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                          title="Remove Document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addDocument}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-primary transition"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Add Document Requirement</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 5: FREQUENTLY ASKED QUESTIONS */}
          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('faqs')}
              className="w-full px-6 py-4 flex items-center justify-between bg-surface hover:bg-surface-elevated transition border-b border-border"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <h2 className="text-sm font-bold text-text-primary">5. Frequently Asked Questions (FAQ)</h2>
                  <p className="text-xs text-text-secondary">Interactive questions and answers displayed in the borrower FAQ accordion.</p>
                </div>
              </div>
              {openSections.faqs ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
            </button>

            {openSections.faqs && (
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg border border-border bg-surface-elevated space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                          className="w-full bg-surface border border-border rounded px-2.5 py-1 text-xs font-bold text-text-primary"
                          placeholder="Question Title"
                        />
                        <button
                          type="button"
                          onClick={() => removeFaq(idx)}
                          className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition shrink-0"
                          title="Remove FAQ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        value={faq.answer}
                        onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                        rows={2}
                        className="w-full bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-text-secondary outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Detailed transparent answer..."
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addFaq}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-primary transition"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Add FAQ Item</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 6: LENDER & REGULATORY DISCLOSURES */}
          <div className="bg-surface rounded-xl border border-border shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('regulatory')}
              className="w-full px-6 py-4 flex items-center justify-between bg-surface hover:bg-surface-elevated transition border-b border-border"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <h2 className="text-sm font-bold text-text-primary">6. Lender & Regulatory Partner Disclosures</h2>
                  <p className="text-xs text-text-secondary">Mandatory NBFC / Bank partner licensing details and landing page disclaimer.</p>
                </div>
              </div>
              {openSections.regulatory ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
            </button>

            {openSections.regulatory && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Lender / NBFC Brand Name
                    </label>
                    <input
                      type="text"
                      value={lenderName}
                      onChange={(e) => setLenderName(e.target.value)}
                      placeholder="e.g. Apex Finserve"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Lender Full Legal Name
                    </label>
                    <input
                      type="text"
                      value={lenderLegalName}
                      onChange={(e) => setLenderLegalName(e.target.value)}
                      placeholder="e.g. Apex Finserve Capital Private Limited"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      RBI Registration / License No.
                    </label>
                    <input
                      type="text"
                      value={lenderRegistrationNumber}
                      onChange={(e) => setLenderRegistrationNumber(e.target.value)}
                      placeholder="e.g. N-13.01928"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Lender Category / Type
                    </label>
                    <input
                      type="text"
                      value={lenderType}
                      onChange={(e) => setLenderType(e.target.value)}
                      placeholder="e.g. NBFC - Investment and Credit Company (NBFC-ICC)"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Registered Office Address
                    </label>
                    <input
                      type="text"
                      value={lenderAddress}
                      onChange={(e) => setLenderAddress(e.target.value)}
                      placeholder="Corporate Tower, BKC, Mumbai"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Lender Regulatory Website
                    </label>
                    <input
                      type="url"
                      value={lenderWebsite}
                      onChange={(e) => setLenderWebsite(e.target.value)}
                      placeholder="https://apexfinserve.com"
                      className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Regulatory Disclaimer Statement (Footer & Application Disclosures)
                  </label>
                  <textarea
                    value={disclaimerText}
                    onChange={(e) => setDisclaimerText(e.target.value)}
                    rows={3}
                    placeholder="Loans are sanctioned and disbursed at the sole discretion of the lending partner subject to credit assessment and regulatory compliance."
                    className="w-full bg-input border border-border rounded-lg p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Master Save Bar */}
          <div className="sticky bottom-4 z-20 bg-surface/95 backdrop-blur-md p-4 rounded-xl border border-border shadow-lg flex items-center justify-between">
            <div className="text-xs text-text-secondary font-medium">
              Changes update the public borrower website immediately upon save.
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm transition flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Website Content...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save All Website Content</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}
    </div>
  );
};

export default AdminWebsiteContentPage;
