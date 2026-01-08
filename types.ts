
export enum AccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  LOAN = 'LOAN',
  EMI = 'EMI'
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER'
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null; // null for parent categories
  type: TransactionType;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number; // Derived field but stored for efficiency
  status: 'ACTIVE' | 'INACTIVE';
  dueDate?: string; // For Credit Cards, Loans, EMIs
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  fromAccountId: string;
  toAccountId?: string; // Only for Transfers
  categoryId?: string;
  subCategoryId?: string;
  notes: string;
}

export interface DueAlert {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  type: 'LOAN' | 'EMI' | 'CREDIT_CARD' | 'SUBSCRIPTION';
  isPaid: boolean;
  sources?: { title: string; uri: string }[]; // Added for Search Grounding compliance
  isMarketData?: boolean; // Tag for identifying AI-generated content
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: 'MONTHLY';
}

export interface AIInsight {
  id: string;
  text: string;
  sources: { title: string; uri: string }[];
  timestamp: string;
}
