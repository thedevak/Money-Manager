
import { Account, AccountType, Transaction, TransactionType, Category } from '../types';

/**
 * Recalculates all account balances based on opening balance and transaction history.
 */
export const recalculateBalances = (accounts: Account[], transactions: Transaction[]): Account[] => {
  return accounts.map(account => {
    let balance = account.openingBalance;

    const relevantTxs = transactions.filter(tx => 
      tx.fromAccountId === account.id || tx.toAccountId === account.id
    );

    const sortedTxs = [...relevantTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTxs.forEach(tx => {
      if (tx.type === TransactionType.INCOME) {
        if (account.type === AccountType.CREDIT_CARD) {
          balance = Math.min(balance + tx.amount, 0);
        } else {
          balance += tx.amount;
        }
      } else if (tx.type === TransactionType.EXPENSE) {
        balance -= tx.amount;
      } else if (tx.type === TransactionType.TRANSFER) {
        if (tx.fromAccountId === account.id) {
          balance -= tx.amount;
        } else if (tx.toAccountId === account.id) {
          if (account.type === AccountType.CREDIT_CARD) {
            balance = Math.min(balance + tx.amount, 0);
          } else {
            balance += tx.amount;
          }
        }
      }
    });

    return { ...account, currentBalance: balance };
  });
};

/**
 * Calculates total spent for a category (and its subcategories) in a specific month/year.
 */
export const calculateSpentForCategory = (
  transactions: Transaction[], 
  categoryId: string, 
  categories: Category[],
  month: number, // 0-11
  year: number
): number => {
  // Find all category IDs to include (the parent + any children)
  const childIds = categories.filter(c => c.parentId === categoryId).map(c => c.id);
  const targetIds = [categoryId, ...childIds];

  return transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      const m = txDate.getMonth();
      const y = txDate.getFullYear();
      
      return (
        tx.type === TransactionType.EXPENSE &&
        targetIds.includes(tx.categoryId || '') &&
        m === month &&
        y === year
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
};

export const formatCurrency = (amount: number, currencyCode: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const getStatusColor = (type: TransactionType) => {
  switch (type) {
    case TransactionType.INCOME: return 'text-emerald-600';
    case TransactionType.EXPENSE: return 'text-rose-600';
    case TransactionType.TRANSFER: return 'text-blue-600';
    default: return 'text-gray-600';
  }
};
