export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN',
}

export enum SubscriptionStatus {
  INACTIVE = 'INACTIVE',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  APPROVED_WAITING_CODE = 'APPROVED_WAITING_CODE',
  ACTIVE = 'ACTIVE',
}

export enum ProgrammingLanguage {
  JAVASCRIPT = 'JavaScript',
  PYTHON = 'Python',
  HTML_CSS = 'HTML/CSS',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  paymentProof?: string; // URL or base64 of receipt
  transactionId?: string;
  confirmationCode?: string; // The code assigned to them
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  language?: ProgrammingLanguage;
}

export interface PaymentRequest {
  userId: string;
  userEmail: string;
  transactionId: string;
  timestamp: number;
}