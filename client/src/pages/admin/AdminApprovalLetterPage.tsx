import React from 'react';
import { AdminDocumentBrandingPage } from './AdminDocumentBrandingPage';

/**
 * Re-export AdminDocumentBrandingPage for backwards compatibility with any existing links
 * to /admin/settings/approval-letter.
 */
export const AdminApprovalLetterPage: React.FC = () => {
  return <AdminDocumentBrandingPage />;
};

export default AdminApprovalLetterPage;
