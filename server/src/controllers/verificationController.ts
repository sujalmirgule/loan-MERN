import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/db';

export class VerificationController {
  /**
   * Public QR document verification endpoint:
   * GET /api/public/verify/document/:token
   */
  async verifyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.params.token as string;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Verification token required' });
      }

      // Check VerificationToken table
      const record = await prisma.verificationToken.findUnique({
        where: { token },
      });

      if (record) {
        return res.json({
          success: true,
          data: {
            isValid: true,
            status: record.status || 'VERIFIED_VALID',
            documentType: record.documentType,
            customerName: record.customerName,
            applicationNumber: record.applicationNumber,
            loanAccountNumber: record.loanAccountNumber,
            approvalDate: record.approvalDate,
            verifiedAt: new Date().toISOString(),
            message: 'Official Loan Approval Document authenticity confirmed by LoanApprove platform.',
          },
        });
      }

      // Fallback: check LoanApplication by applicationNumber or id or accountNumber
      const loan = await prisma.loanApplication.findFirst({
        where: {
          OR: [
            { id: token },
            { applicationNumber: token },
            { accountNumber: token },
          ],
        },
        include: { customer: true },
      });

      if (loan) {
        return res.json({
          success: true,
          data: {
            isValid: true,
            status: loan.status === 'APPROVED' ? 'VERIFIED_VALID' : loan.status,
            documentType: 'LOAN_APPROVAL_LETTER',
            customerName: loan.customer.fullName,
            applicationNumber: loan.applicationNumber,
            loanAccountNumber: loan.accountNumber || loan.applicationNumber,
            approvalDate: loan.updatedAt,
            verifiedAt: new Date().toISOString(),
            message: 'Official Loan Sanction record verified successfully.',
          },
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Document record not found. Please check the QR code or verification token.',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const verificationController = new VerificationController();
