type TransactionRecord = {
  id: string;
  timestamp: string;
  request: { amount: number; currency: string; source: string; email: string };
  riskScore: number;
  reasons: Array<{ rule: string; impact: number; detail?: string }>;
  status: 'blocked' | 'success';
  provider: 'stripe' | 'paypal' | null | undefined;
  explanation: string;
};

class TransactionsStore {
  private records: TransactionRecord[] = [];

  add(record: TransactionRecord) {
    this.records.unshift(record);
    if (this.records.length > 1000) this.records.pop();
  }

  getAll() {
    return this.records;
  }
}

export const transactionsStore = new TransactionsStore();


