
import { AccountType, TransactionType, Account, Category, Transaction, DueAlert, Budget } from './types';

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc_1', name: 'Main Savings', type: AccountType.SAVINGS, openingBalance: 5000, currentBalance: 5000, status: 'ACTIVE' },
  { id: 'acc_2', name: 'Wallet', type: AccountType.CASH, openingBalance: 200, currentBalance: 200, status: 'ACTIVE' },
  { id: 'acc_3', name: 'Premium Visa', type: AccountType.CREDIT_CARD, openingBalance: 0, currentBalance: 0, status: 'ACTIVE', dueDate: '2024-06-15' },
  { id: 'acc_4', name: 'Home Loan', type: AccountType.LOAN, openingBalance: -250000, currentBalance: -250000, status: 'ACTIVE', dueDate: '2024-06-05' }
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Food & Dining', parentId: null, type: TransactionType.EXPENSE },
  { id: 'cat_2', name: 'Groceries', parentId: 'cat_1', type: TransactionType.EXPENSE },
  { id: 'cat_3', name: 'Restaurants', parentId: 'cat_1', type: TransactionType.EXPENSE },
  { id: 'cat_4', name: 'Salary', parentId: null, type: TransactionType.INCOME },
  { id: 'cat_5', name: 'Primary Job', parentId: 'cat_4', type: TransactionType.INCOME },
  { id: 'cat_6', name: 'Housing', parentId: null, type: TransactionType.EXPENSE },
  { id: 'cat_7', name: 'Rent', parentId: 'cat_6', type: TransactionType.EXPENSE },
  { id: 'cat_8', name: 'Utilities', parentId: 'cat_6', type: TransactionType.EXPENSE }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx_1', date: '2024-05-01', amount: 3000, type: TransactionType.INCOME, fromAccountId: 'acc_1', categoryId: 'cat_4', subCategoryId: 'cat_5', notes: 'Monthly Salary' },
  { id: 'tx_2', date: '2024-05-02', amount: 500, type: TransactionType.EXPENSE, fromAccountId: 'acc_3', categoryId: 'cat_1', subCategoryId: 'cat_3', notes: 'Dinner with family' },
  { id: 'tx_3', date: '2024-05-05', amount: 1000, type: TransactionType.TRANSFER, fromAccountId: 'acc_1', toAccountId: 'acc_3', notes: 'Credit Card Payment' }
];

export const INITIAL_ALERTS: DueAlert[] = [
  { id: 'al_1', title: 'Home Loan EMI', amount: 1200, dueDate: '2024-06-05', type: 'EMI', isPaid: false },
  { id: 'al_2', title: 'Visa Statement', amount: 500, dueDate: '2024-06-15', type: 'CREDIT_CARD', isPaid: false },
  { id: 'al_3', title: 'Netflix', amount: 15.99, dueDate: '2024-06-20', type: 'SUBSCRIPTION', isPaid: false }
];

export const INITIAL_BUDGETS: Budget[] = [
  { id: 'b_1', categoryId: 'cat_1', amount: 600, period: 'MONTHLY' },
  { id: 'b_2', categoryId: 'cat_6', amount: 2000, period: 'MONTHLY' }
];
