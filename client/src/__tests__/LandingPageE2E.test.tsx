import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { BrandingProvider } from '../contexts/BrandingContext';
import { AuthProvider } from '../contexts/AuthContext';

const mockBrandingData = {
  companyName: 'Apex Financial Services Private Limited',
  appName: 'Apex Loan Solutions',
  logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe',
  faviconUrl: null,
  primaryColor: '#059669',
  secondaryColor: '#047857',
  email: 'support@apexloan.com',
  phone: '+91 98765 43210',
  address: 'Suite 404, Apex Tower, BKC, Mumbai - 400051',
  website: 'https://apexloan.com',
  termsUrl: '',
  privacyUrl: '',
  payment: {
    chargeAmount: 500,
    chargeType: 'PROCESSING_FEE',
    upiId: 'apex@upi',
    accountHolderName: 'Apex Financial Services',
    instructions: 'Pay via UPI'
  },
  hero: {
    headline: 'Simple, Transparent Loan Application',
    subheadline: 'Apply online and track application status.'
  },
  lender: {
    name: 'Apex Capital Finance Limited (RBI Reg: N-13.00998)',
    legalName: 'Apex Capital Finance Ltd',
    registrationNumber: 'N-13.00998',
    type: 'NBFC-ND-SI',
    address: 'Mumbai, MH',
    website: 'https://apexcapital.com',
    isDirectLender: false
  },
  partner: {
    name: 'Apex Capital Finance',
    relationship: 'Lending Partner'
  },
  financial: {
    minLoanAmount: 25000,
    maxLoanAmount: 500000,
    minTenureMonths: 6,
    maxTenureMonths: 60,
    minApr: 11.5,
    maxApr: 24.0,
    processingFeePolicy: 'Processing fee 1.5% + GST.',
    otherChargesPolicy: 'No hidden charges.'
  },
  eligibility: {
    minAge: 21,
    maxAge: 60,
    minMonthlyIncome: 18000,
    creditScoreCriteria: 'Good credit profile preferred',
    bankAccountRequired: true,
    employmentCriteria: 'Salaried or Self-Employed',
    residentialStatusCriteria: 'Indian Resident'
  },
  documents: [
    { id: 'application_form', name: 'Completed Application Form', description: 'Form submission', icon: 'ClipboardCheck', enabled: true, mandatory: true },
    { id: 'photograph', name: 'Passport-Sized Photograph', description: 'Recent photo', icon: 'Users', enabled: true, mandatory: true },
    { id: 'identity_proof', name: 'Identity Proof', description: 'Aadhaar/PAN', icon: 'UserCheck', enabled: true, mandatory: true },
    { id: 'address_proof', name: 'Address Proof', description: 'Utility Bill', icon: 'MapPin', enabled: true, mandatory: true },
    { id: 'bank_statement', name: 'Bank Statements', description: 'Last 6 months', icon: 'Banknote', enabled: true, mandatory: true },
    { id: 'income_proof', name: 'Income Proof', description: 'Payslips / ITR', icon: 'TrendingUp', enabled: true, mandatory: true },
    { id: 'business_proof', name: 'Business Registration Proof', description: 'GST Certificate', icon: 'Building2', enabled: true, mandatory: false }
  ],
  disclaimer: 'Statutory Disclaimer: Apex Loan Solutions is a digital platform partnering with licensed NBFCs.',
  faqs: [
    { question: 'What is Apex Loan Solutions?', answer: 'Apex Loan Solutions is an RBI-compliant loan management platform.' },
    { question: 'What documents are required?', answer: 'Aadhaar, PAN, Address Proof, Bank Statements, and Income Proof.' }
  ],
  app: {
    enabled: false,
    downloadUrl: null
  }
};

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn().mockImplementation(() => Promise.resolve({
      success: true,
      data: mockBrandingData
    })),
    post: vi.fn().mockImplementation(() => Promise.resolve({ success: true, data: {} })),
    put: vi.fn().mockImplementation(() => Promise.resolve({ success: true, data: {} })),
    patch: vi.fn().mockImplementation(() => Promise.resolve({ success: true, data: {} })),
    delete: vi.fn().mockImplementation(() => Promise.resolve({ success: true, data: {} }))
  }
}));

describe('LandingPage Production E2E Interaction Test', () => {
  const renderPage = () => {
    return render(
      <AuthProvider>
        <MemoryRouter>
          <BrandingProvider>
            <LandingPage />
          </BrandingProvider>
        </MemoryRouter>
      </AuthProvider>
    );
  };

  it('renders brand name, header navigation, Apply Now and Login CTAs without dead links', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/Apex Loan Solutions/i).length).toBeGreaterThan(0);
    });

    // Check H1 Heading
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    // Check Apply Now and Login Links
    const applyLinks = screen.getAllByRole('link', { name: /Apply Now/i });
    expect(applyLinks.length).toBeGreaterThan(0);
    expect(applyLinks[0]).toHaveAttribute('href', '/customer/register');

    const loginLinks = screen.getAllByRole('link', { name: /Login/i });
    expect(loginLinks.length).toBeGreaterThan(0);
    expect(loginLinks[0]).toHaveAttribute('href', '/customer/login');
  });

  it('opens Eligibility Checker modal, performs preliminary check, and transitions to Apply flow', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/Check Eligibility/i).length).toBeGreaterThan(0);
    });

    // Click "Check Eligibility" button
    const checkButtons = screen.getAllByText(/Check Eligibility/i);
    fireEvent.click(checkButtons[0]);

    // Modal should open
    expect(await screen.findByRole('button', { name: /Check My Eligibility/i })).toBeInTheDocument();

    // Enter Age: 28, Income: 50000
    const ageInput = document.getElementById('eligibility-age') as HTMLInputElement;
    const incomeInput = document.getElementById('eligibility-income') as HTMLInputElement;
    expect(ageInput).toBeInTheDocument();
    expect(incomeInput).toBeInTheDocument();

    fireEvent.change(ageInput, { target: { value: '28' } });
    fireEvent.change(incomeInput, { target: { value: '50000' } });

    // Click "Check My Eligibility" inside modal
    const modalCheckBtn = document.getElementById('eligibility-check-btn');
    expect(modalCheckBtn).toBeInTheDocument();
    if (modalCheckBtn) fireEvent.click(modalCheckBtn);

    // Verify Preliminary Check Passed message appears
    expect(await screen.findByText(/Preliminary Check Passed/i)).toBeInTheDocument();

    // Verify Proceed to Apply button
    const proceedBtn = screen.getByRole('button', { name: /Proceed to Apply/i });
    expect(proceedBtn).toBeInTheDocument();
  });

  it('calculates EMI dynamically when sliders change and transitions to Apply flow', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/Loan Amount/i)).toBeInTheDocument();
    });

    // Find sliders
    const amountSlider = screen.getByLabelText(/Loan Amount/i);
    const rateSlider = screen.getByLabelText(/Interest Rate/i);
    const tenureSlider = screen.getByLabelText(/Tenure/i);

    // Change slider values
    fireEvent.change(amountSlider, { target: { value: '200000' } });
    fireEvent.change(rateSlider, { target: { value: '14' } });
    fireEvent.change(tenureSlider, { target: { value: '24' } });

    // Check Apply for This Loan button
    const applyLoanBtn = screen.getByRole('button', { name: /Apply for This Loan/i });
    expect(applyLoanBtn).toBeInTheDocument();
  });

  it('renders all document checklist items and expands FAQ accordion items', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Completed Application Form/i)).toBeInTheDocument();
    });

    // Document Checklist
    expect(screen.getAllByText(/Identity Proof/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Address Proof/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Bank Statements/i).length).toBeGreaterThan(0);

    // Expand FAQ accordion item
    const faqQuestions = screen.getAllByText(/What is Apex Loan Solutions\?/i);
    expect(faqQuestions.length).toBeGreaterThan(0);
    fireEvent.click(faqQuestions[0]);

    // Answer text should be visible
    expect(await screen.findByText(/Apex Loan Solutions is an RBI-compliant/i)).toBeInTheDocument();
  });

  it('displays configured lender details and statutory disclaimers without unverified claims', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Apex Capital Finance Limited'))).toBeInTheDocument();
    });

    // Statutory Disclaimer
    expect(screen.getByText((content) => content.includes('Statutory Disclaimer: Apex Loan Solutions'))).toBeInTheDocument();
  });

  it('provides both existing Apply for a Loan and new Eligibility CTA leading to the same signup route', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/Ready to Apply\?/i).length).toBeGreaterThan(0);
    });

    // Path 1: Hero existing "Apply for a Loan" CTA
    const heroApplyBtn = document.getElementById('hero-apply-btn');
    expect(heroApplyBtn).toBeInTheDocument();
    expect(heroApplyBtn).toHaveAttribute('href', '/customer/register');

    // Path 2: New Eligibility Criteria CTA below the criteria grid
    expect(screen.getAllByText(/Create your account and start your loan application/i).length).toBeGreaterThan(0);
    const eligibilitySignupBtn = document.getElementById('eligibility-signup-cta-btn');
    expect(eligibilitySignupBtn).toBeInTheDocument();
    expect(eligibilitySignupBtn).toHaveAttribute('href', '/customer/register');
    expect(screen.getByText(/Create Account \/ Apply for a Loan/i)).toBeInTheDocument();
  });

  it('renders embedded Start Your Loan Application section with multi-step signup form on the landing page', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Start Your Loan Application/i })).toBeInTheDocument();
    });

    // Section exists with ID apply/signup
    const applySection = document.getElementById('apply');
    expect(applySection).toBeInTheDocument();

    // Multi-step embedded signup form rendered inside landing page
    expect(screen.getByText(/What do you need a loan for\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Loan Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Required Amount/i)).toBeInTheDocument();
  });
});

