-- CreateTable
CREATE TABLE `AdminUser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'STAFF',
    `permissions` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminUser_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NULL,
    `fatherName` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `dob` VARCHAR(191) NULL,
    `address` TEXT NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `pincode` VARCHAR(191) NULL,
    `aadhaarEncrypted` VARCHAR(191) NOT NULL,
    `aadhaarMasked` VARCHAR(191) NOT NULL,
    `panEncrypted` VARCHAR(191) NULL,
    `panMasked` VARCHAR(191) NULL,
    `monthlyIncome` DOUBLE NOT NULL,
    `bankName` VARCHAR(191) NULL,
    `bankAccountNumber` VARCHAR(191) NULL,
    `bankIfsc` VARCHAR(191) NULL,
    `bankBranch` VARCHAR(191) NULL,
    `bankAccountType` VARCHAR(191) NULL,
    `domainId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `kycStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_mobile_key`(`mobile`),
    INDEX `Customer_mobile_idx`(`mobile`),
    INDEX `Customer_email_idx`(`email`),
    INDEX `Customer_state_idx`(`state`),
    INDEX `Customer_city_idx`(`city`),
    INDEX `Customer_kycStatus_idx`(`kycStatus`),
    INDEX `Customer_createdAt_idx`(`createdAt`),
    INDEX `Customer_domainId_idx`(`domainId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoanApplication` (
    `id` VARCHAR(191) NOT NULL,
    `applicationNumber` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NULL,
    `approvalNumber` VARCHAR(191) NULL,
    `loanType` VARCHAR(191) NULL DEFAULT 'Personal Loan',
    `customerId` VARCHAR(191) NOT NULL,
    `requestedAmount` DOUBLE NOT NULL,
    `proposedAmount` DOUBLE NULL,
    `approvedAmount` DOUBLE NULL,
    `acceptedAmount` DOUBLE NULL,
    `interestType` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `interestRate` DOUBLE NOT NULL DEFAULT 12.0,
    `interestCalcMethod` VARCHAR(191) NOT NULL DEFAULT 'REDUCING_BALANCE',
    `processingFeeType` VARCHAR(191) NOT NULL DEFAULT 'PERCENTAGE',
    `processingFeeValue` DOUBLE NOT NULL DEFAULT 2.0,
    `processingFeeAmount` DOUBLE NOT NULL DEFAULT 0,
    `insuranceAmount` DOUBLE NULL DEFAULT 0,
    `totalPayable` DOUBLE NULL,
    `remainingBalance` DOUBLE NULL,
    `tenureMonths` INTEGER NOT NULL,
    `estimatedEmi` DOUBLE NULL DEFAULT 0,
    `finalEmi` DOUBLE NULL,
    `disbursementDate` DATETIME(3) NULL,
    `nextEmiDate` DATETIME(3) NULL,
    `purpose` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUBMITTED',
    `rejectionReason` TEXT NULL,
    `holdReason` TEXT NULL,
    `docRequestReason` TEXT NULL,
    `modifiedOfferAccepted` BOOLEAN NULL,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'NOT_REQUIRED',
    `domainId` VARCHAR(191) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LoanApplication_applicationNumber_key`(`applicationNumber`),
    INDEX `LoanApplication_applicationNumber_idx`(`applicationNumber`),
    INDEX `LoanApplication_accountNumber_idx`(`accountNumber`),
    INDEX `LoanApplication_approvalNumber_idx`(`approvalNumber`),
    INDEX `LoanApplication_customerId_idx`(`customerId`),
    INDEX `LoanApplication_status_idx`(`status`),
    INDEX `LoanApplication_createdAt_idx`(`createdAt`),
    INDEX `LoanApplication_submittedAt_idx`(`submittedAt`),
    INDEX `LoanApplication_domainId_idx`(`domainId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoanDocument` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `originalFileName` VARCHAR(191) NOT NULL DEFAULT '',
    `storageKey` VARCHAR(191) NOT NULL DEFAULT '',
    `filePath` TEXT NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `rejectionReason` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isCurrentVersion` BOOLEAN NOT NULL DEFAULT true,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoanDocument_customerId_idx`(`customerId`),
    INDEX `LoanDocument_loanId_idx`(`loanId`),
    INDEX `LoanDocument_documentType_idx`(`documentType`),
    INDEX `LoanDocument_status_idx`(`status`),
    INDEX `LoanDocument_isCurrentVersion_idx`(`isCurrentVersion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentRequest` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `requestedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DocumentRequest_customerId_idx`(`customerId`),
    INDEX `DocumentRequest_loanId_idx`(`loanId`),
    INDEX `DocumentRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoanAgreement` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `agreementVersion` VARCHAR(191) NOT NULL DEFAULT 'v1.0',
    `agreementContentHtml` LONGTEXT NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `acceptanceStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `LoanAgreement_loanId_key`(`loanId`),
    INDEX `LoanAgreement_loanId_idx`(`loanId`),
    INDEX `LoanAgreement_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Disbursement` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `referenceId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
    `notes` TEXT NULL,
    `disbursedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdByAdminId` VARCHAR(191) NULL,

    INDEX `Disbursement_loanId_idx`(`loanId`),
    INDEX `Disbursement_customerId_idx`(`customerId`),
    INDEX `Disbursement_referenceId_idx`(`referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EMISchedule` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `installmentNumber` INTEGER NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `principalAmount` DOUBLE NOT NULL,
    `interestAmount` DOUBLE NOT NULL,
    `totalAmount` DOUBLE NOT NULL,
    `paidAmount` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'UPCOMING',
    `paidAt` DATETIME(3) NULL,

    INDEX `EMISchedule_loanId_idx`(`loanId`),
    INDEX `EMISchedule_customerId_idx`(`customerId`),
    INDEX `EMISchedule_dueDate_idx`(`dueDate`),
    INDEX `EMISchedule_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `emiScheduleId` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `paymentType` VARCHAR(191) NOT NULL DEFAULT 'PROCESSING_FEE',
    `transactionRef` VARCHAR(191) NOT NULL,
    `receiptNumber` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SUCCESS',
    `verifiedBy` VARCHAR(191) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `notes` TEXT NULL,
    `chargeId` VARCHAR(191) NULL,
    `upiVpa` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Payment_transactionRef_key`(`transactionRef`),
    UNIQUE INDEX `Payment_receiptNumber_key`(`receiptNumber`),
    INDEX `Payment_loanId_idx`(`loanId`),
    INDEX `Payment_customerId_idx`(`customerId`),
    INDEX `Payment_transactionRef_idx`(`transactionRef`),
    INDEX `Payment_receiptNumber_idx`(`receiptNumber`),
    INDEX `Payment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `recipientType` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_recipientType_idx`(`recipientType`),
    INDEX `Notification_customerId_idx`(`customerId`),
    INDEX `Notification_isRead_idx`(`isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorType` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorName` VARCHAR(191) NOT NULL DEFAULT 'System Admin',
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `previousValue` LONGTEXT NULL,
    `newValue` LONGTEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_idx`(`entity`),
    INDEX `AuditLog_entityId_idx`(`entityId`),
    INDEX `AuditLog_timestamp_idx`(`timestamp`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_actorId_idx`(`actorId`),
    INDEX `AuditLog_action_idx`(`action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BrandingSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `companyName` VARCHAR(191) NOT NULL DEFAULT 'Loan Approve Financial Services',
    `appName` VARCHAR(191) NOT NULL DEFAULT 'Loan Approve',
    `logoUrl` VARCHAR(191) NULL,
    `faviconUrl` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#047857',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#0f172a',
    `email` VARCHAR(191) NOT NULL DEFAULT 'support@loanapprove.com',
    `phone` VARCHAR(191) NOT NULL DEFAULT '+91 98765 43210',
    `address` TEXT NULL,
    `website` VARCHAR(191) NOT NULL DEFAULT 'https://loanapprove.com',
    `termsUrl` VARCHAR(191) NOT NULL DEFAULT 'https://loanapprove.com/terms',
    `privacyUrl` VARCHAR(191) NOT NULL DEFAULT 'https://loanapprove.com/privacy',
    `companyLegalName` VARCHAR(191) NOT NULL DEFAULT 'Loan Approve Financial Services Pvt. Ltd.',
    `authorizedSignatoryName` VARCHAR(191) NOT NULL DEFAULT 'Authorized Underwriting Officer',
    `authorizedSignatoryDesignation` VARCHAR(191) NOT NULL DEFAULT 'Credit & Sanction Division',
    `authorizedSignatureUrl` VARCHAR(191) NULL,
    `companyStampUrl` VARCHAR(191) NULL,
    `approvalLetterHeaderUrl` VARCHAR(191) NULL,
    `secondaryLogoUrl` VARCHAR(191) NULL,
    `watermarkLogoUrl` VARCHAR(191) NULL,
    `documentWatermarkEnabled` BOOLEAN NOT NULL DEFAULT true,
    `invoiceWatermarkEnabled` BOOLEAN NOT NULL DEFAULT true,
    `watermarkOpacity` DOUBLE NOT NULL DEFAULT 0.10,
    `watermarkSize` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
    `watermarkPosition` VARCHAR(191) NOT NULL DEFAULT 'CENTER',
    `lenderName` VARCHAR(191) NULL,
    `lenderLegalName` VARCHAR(191) NULL,
    `lenderRegistrationNumber` VARCHAR(191) NULL,
    `lenderType` VARCHAR(191) NULL,
    `lenderAddress` TEXT NULL,
    `lenderWebsite` VARCHAR(191) NULL,
    `isDirectLender` BOOLEAN NOT NULL DEFAULT false,
    `partnerName` VARCHAR(191) NULL,
    `partnerRelationship` VARCHAR(191) NULL,
    `minLoanAmount` DOUBLE NOT NULL DEFAULT 10000,
    `maxLoanAmount` DOUBLE NOT NULL DEFAULT 3000000,
    `minTenureMonths` INTEGER NOT NULL DEFAULT 6,
    `maxTenureMonths` INTEGER NOT NULL DEFAULT 84,
    `minApr` DOUBLE NOT NULL DEFAULT 12.0,
    `maxApr` DOUBLE NOT NULL DEFAULT 36.0,
    `processingFeePolicy` TEXT NULL,
    `otherChargesPolicy` TEXT NULL,
    `minAge` INTEGER NOT NULL DEFAULT 18,
    `maxAge` INTEGER NOT NULL DEFAULT 60,
    `minMonthlyIncome` DOUBLE NOT NULL DEFAULT 15000,
    `creditScoreCriteria` TEXT NULL,
    `bankAccountRequired` BOOLEAN NOT NULL DEFAULT true,
    `employmentCriteria` TEXT NULL,
    `residentialStatusCriteria` TEXT NULL,
    `documentsConfigJson` LONGTEXT NULL,
    `disclaimerText` TEXT NULL,
    `faqsJson` LONGTEXT NULL,
    `appEnabled` BOOLEAN NOT NULL DEFAULT false,
    `appDownloadUrl` VARCHAR(191) NULL,
    `heroHeadline` TEXT NULL,
    `heroSubheadline` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupportTicket` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `adminReply` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `SupportTicket_customerId_idx`(`customerId`),
    INDEX `SupportTicket_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `smtpHost` VARCHAR(191) NOT NULL DEFAULT '',
    `smtpPort` INTEGER NOT NULL DEFAULT 587,
    `smtpUsername` VARCHAR(191) NOT NULL DEFAULT '',
    `smtpPasswordEnc` VARCHAR(191) NOT NULL DEFAULT '',
    `fromName` VARCHAR(191) NOT NULL DEFAULT 'Loan Approve Financial Services',
    `fromEmail` VARCHAR(191) NOT NULL DEFAULT 'notifications@loanapprove.com',
    `replyToEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `encryption` VARCHAR(191) NOT NULL DEFAULT 'STARTTLS',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'NOT_CONFIGURED',
    `lastTestedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `provider` VARCHAR(191) NOT NULL DEFAULT 'WABRIDGE',
    `phoneNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `phoneNumberId` VARCHAR(191) NOT NULL DEFAULT '',
    `businessAccountId` VARCHAR(191) NOT NULL DEFAULT '',
    `apiEndpoint` VARCHAR(191) NOT NULL DEFAULT '',
    `apiBaseUrl` VARCHAR(191) NOT NULL DEFAULT '',
    `sendEndpoint` VARCHAR(191) NOT NULL DEFAULT '',
    `authType` VARCHAR(191) NOT NULL DEFAULT 'BEARER',
    `apiKeyHeaderName` VARCHAR(191) NOT NULL DEFAULT 'x-api-key',
    `authHeaderPrefix` VARCHAR(191) NOT NULL DEFAULT 'Bearer',
    `accessTokenEnc` VARCHAR(191) NOT NULL DEFAULT '',
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'NOT_CONFIGURED',
    `lastTestedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentConfig` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `chargeAmount` DOUBLE NOT NULL DEFAULT 500,
    `chargeType` VARCHAR(191) NOT NULL DEFAULT 'PROCESSING_DEPOSIT',
    `upiId` VARCHAR(191) NOT NULL DEFAULT 'pay@loanapprove',
    `accountNumber` VARCHAR(191) NOT NULL DEFAULT '9876543210123',
    `ifscCode` VARCHAR(191) NOT NULL DEFAULT 'HDFC0001234',
    `accountHolderName` VARCHAR(191) NOT NULL DEFAULT 'Loan Approve Financial Services',
    `instructions` TEXT NULL,
    `defaultInterestRate` DOUBLE NOT NULL DEFAULT 12.0,
    `kycChargeAmount` DOUBLE NOT NULL DEFAULT 499,
    `processingFeeAmount` DOUBLE NOT NULL DEFAULT 1999,
    `loanDocFeeEnabled` BOOLEAN NOT NULL DEFAULT false,
    `loanDocFeeAmount` DOUBLE NOT NULL DEFAULT 999,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Domain` (
    `id` VARCHAR(191) NOT NULL,
    `domainName` VARCHAR(191) NOT NULL,
    `helplineNumber` VARCHAR(191) NULL DEFAULT '+91 8042054797',
    `contactEmail` VARCHAR(191) NULL DEFAULT 'contact@loanapprove.com',
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Domain_domainName_key`(`domainName`),
    INDEX `Domain_domainName_idx`(`domainName`),
    INDEX `Domain_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentLink` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PaymentLink_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Charge` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'FIXED',
    `isMandatory` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `taxPercent` DOUBLE NOT NULL DEFAULT 18.0,
    `customerId` VARCHAR(191) NULL,
    `loanId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `remark` TEXT NULL,
    `dueDate` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,
    `transactionRef` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Charge_customerId_idx`(`customerId`),
    INDEX `Charge_loanId_idx`(`loanId`),
    INDEX `Charge_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UPISettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `upiEnabled` BOOLEAN NOT NULL DEFAULT false,
    `upiId` VARCHAR(191) NOT NULL DEFAULT '',
    `merchantName` VARCHAR(191) NULL DEFAULT '',
    `gpayEnabled` BOOLEAN NOT NULL DEFAULT false,
    `gpayId` VARCHAR(191) NOT NULL DEFAULT '',
    `phonepeEnabled` BOOLEAN NOT NULL DEFAULT false,
    `phonepeId` VARCHAR(191) NOT NULL DEFAULT '',
    `paytmEnabled` BOOLEAN NOT NULL DEFAULT false,
    `paytmId` VARCHAR(191) NOT NULL DEFAULT '',
    `otherUpiEnabled` BOOLEAN NOT NULL DEFAULT false,
    `otherUpiId` VARCHAR(191) NOT NULL DEFAULT '',
    `qrCodeUrl` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BankSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `bankEnabled` BOOLEAN NOT NULL DEFAULT true,
    `accountHolder` VARCHAR(191) NOT NULL DEFAULT 'Loan Approve Financial Services Pvt Ltd',
    `accountNumber` VARCHAR(191) NOT NULL DEFAULT '50200084729104',
    `bankName` VARCHAR(191) NOT NULL DEFAULT 'HDFC Bank',
    `ifsc` VARCHAR(191) NOT NULL DEFAULT 'HDFC0000060',
    `branch` VARCHAR(191) NOT NULL DEFAULT 'Fort, Mumbai',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL DEFAULT 'APPROVAL_LETTER',
    `entityId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `applicationNumber` VARCHAR(191) NOT NULL,
    `loanAccountNumber` VARCHAR(191) NOT NULL,
    `approvalDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'VERIFIED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    INDEX `VerificationToken_token_idx`(`token`),
    INDEX `VerificationToken_entityId_idx`(`entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WhatsAppMessage` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NULL,
    `adminId` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `templateName` VARCHAR(191) NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',
    `sentAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `failedAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WhatsAppMessage_customerId_idx`(`customerId`),
    INDEX `WhatsAppMessage_loanId_idx`(`loanId`),
    INDEX `WhatsAppMessage_status_idx`(`status`),
    INDEX `WhatsAppMessage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailMessage` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NULL,
    `ticketId` VARCHAR(191) NULL,
    `adminId` VARCHAR(191) NULL,
    `recipientEmail` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `templateName` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',
    `providerMessageId` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `failedAt` DATETIME(3) NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EmailMessage_customerId_idx`(`customerId`),
    INDEX `EmailMessage_loanId_idx`(`loanId`),
    INDEX `EmailMessage_ticketId_idx`(`ticketId`),
    INDEX `EmailMessage_status_idx`(`status`),
    INDEX `EmailMessage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunicationSettings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `emailEnabled` BOOLEAN NOT NULL DEFAULT false,
    `whatsAppEnabled` BOOLEAN NOT NULL DEFAULT false,
    `autoEmailOnPaymentVerified` BOOLEAN NOT NULL DEFAULT true,
    `autoEmailOnLoanApproved` BOOLEAN NOT NULL DEFAULT true,
    `autoEmailOnLoanRejected` BOOLEAN NOT NULL DEFAULT true,
    `autoEmailOnKycVerified` BOOLEAN NOT NULL DEFAULT true,
    `autoEmailOnKycRejected` BOOLEAN NOT NULL DEFAULT true,
    `autoEmailOnChargeCreated` BOOLEAN NOT NULL DEFAULT true,
    `autoWhatsAppOnPaymentVerified` BOOLEAN NOT NULL DEFAULT false,
    `autoWhatsAppOnKycPending` BOOLEAN NOT NULL DEFAULT false,
    `autoWhatsAppOnLoanApproved` BOOLEAN NOT NULL DEFAULT false,
    `autoWhatsAppOnLoanRejected` BOOLEAN NOT NULL DEFAULT false,
    `autoWhatsAppOnChargeCreated` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `chargeId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `chargeName` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `taxAmount` DOUBLE NOT NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PAID',
    `storageKey` VARCHAR(191) NOT NULL,
    `filePath` TEXT NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `templateVersion` VARCHAR(191) NOT NULL DEFAULT 'v1.0',
    `brandingVersion` VARCHAR(191) NOT NULL DEFAULT 'v1.0',
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_invoiceNumber_key`(`invoiceNumber`),
    UNIQUE INDEX `Invoice_chargeId_key`(`chargeId`),
    INDEX `Invoice_customerId_idx`(`customerId`),
    INDEX `Invoice_loanId_idx`(`loanId`),
    INDEX `Invoice_chargeId_idx`(`chargeId`),
    INDEX `Invoice_paymentId_idx`(`paymentId`),
    INDEX `Invoice_invoiceNumber_idx`(`invoiceNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_domainId_fkey` FOREIGN KEY (`domainId`) REFERENCES `Domain`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanApplication` ADD CONSTRAINT `LoanApplication_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanApplication` ADD CONSTRAINT `LoanApplication_domainId_fkey` FOREIGN KEY (`domainId`) REFERENCES `Domain`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanDocument` ADD CONSTRAINT `LoanDocument_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanDocument` ADD CONSTRAINT `LoanDocument_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentRequest` ADD CONSTRAINT `DocumentRequest_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentRequest` ADD CONSTRAINT `DocumentRequest_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanAgreement` ADD CONSTRAINT `LoanAgreement_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoanAgreement` ADD CONSTRAINT `LoanAgreement_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Disbursement` ADD CONSTRAINT `Disbursement_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Disbursement` ADD CONSTRAINT `Disbursement_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Disbursement` ADD CONSTRAINT `Disbursement_createdByAdminId_fkey` FOREIGN KEY (`createdByAdminId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EMISchedule` ADD CONSTRAINT `EMISchedule_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EMISchedule` ADD CONSTRAINT `EMISchedule_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_emiScheduleId_fkey` FOREIGN KEY (`emiScheduleId`) REFERENCES `EMISchedule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupportTicket` ADD CONSTRAINT `SupportTicket_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Charge` ADD CONSTRAINT `Charge_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Charge` ADD CONSTRAINT `Charge_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage` ADD CONSTRAINT `WhatsAppMessage_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WhatsAppMessage` ADD CONSTRAINT `WhatsAppMessage_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailMessage` ADD CONSTRAINT `EmailMessage_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `SupportTicket`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `LoanApplication`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

