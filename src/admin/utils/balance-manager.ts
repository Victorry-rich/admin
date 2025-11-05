// admin/utils/balance-manager.ts
import { db } from '../../db/index.js';

/**
 * Update user balance with transaction logging
 */
export async function updateUserBalance(
  userId: string,
  amount: number,
  operation: 'add' | 'subtract',
  reason?: string,
) {
  const user = await db.table('profiles').knex('profiles').where({ id: userId }).first();

  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const currentBalance = parseFloat(user.walletBalance) || 0;
  const newBalance = operation === 'add' ? currentBalance + amount : currentBalance - amount;

  if (newBalance < 0) {
    throw new Error(`Insufficient balance. Current: ${currentBalance}, Requested: ${amount}`);
  }

  await db.table('profiles').knex('profiles').where({ id: userId }).update({
    walletBalance: newBalance,
    updatedAt: new Date(),
  });

  // Log the transaction for audit trail
  console.log(`Balance ${operation}: User ${userId} | ${currentBalance} -> ${newBalance} | Reason: ${reason || 'N/A'}`);

  return {
    previousBalance: currentBalance,
    newBalance,
    operation,
    amount,
  };
}

/**
 * Process withdrawal request and update balance
 */
export async function processWithdrawal(withdrawalId: string) {
  const withdrawal = await db
    .table('withdrawal_requests')
    .knex('withdrawal_requests')
    .where({ id: withdrawalId })
    .first();

  if (!withdrawal) {
    throw new Error('Withdrawal request not found');
  }

  if (withdrawal.status === 'completed') {
    throw new Error('Withdrawal already completed');
  }

  // Get NFT value if exists
  let amount = 0;
  if (withdrawal.nftItemId) {
    const nft = await db.table('nft_items').knex('nft_items').where({ id: withdrawal.nftItemId }).first();
    amount = parseFloat(nft?.listPrice) || 0;
  }

  const withdrawalFee = parseFloat(withdrawal.withdrawalFee) || 0;
  const totalDeduction = amount + withdrawalFee;

  if (totalDeduction <= 0) {
    throw new Error('Invalid withdrawal amount');
  }

  // Update balance
  await updateUserBalance(withdrawal.userId, totalDeduction, 'subtract', `Withdrawal #${withdrawalId}`);

  // Update withdrawal status
  await db.table('withdrawal_requests').knex('withdrawal_requests').where({ id: withdrawalId }).update({
    status: 'completed',
    completedAt: new Date(),
  });

  return { totalDeduction, withdrawalId };
}

/**
 * Process deposit request and update balance
 */
export async function processDeposit(depositId: string) {
  const deposit = await db.table('deposit_requests').knex('deposit_requests').where({ id: depositId }).first();

  if (!deposit) {
    throw new Error('Deposit request not found');
  }

  if (deposit.status === 'completed') {
    throw new Error('Deposit already completed');
  }

  const amount = parseFloat(deposit.amount) || 0;

  if (amount <= 0) {
    throw new Error('Invalid deposit amount');
  }

  // Update balance
  await updateUserBalance(deposit.userId, amount, 'add', `Deposit #${depositId}`);

  // Update deposit status
  await db
    .table('deposit_requests')
    .knex('deposit_requests')
    .where({ id: depositId })
    .update({
      status: 'completed',
      processedAt: new Date(),
      approvedAt: deposit.approvedAt || new Date(),
    });

  return { amount, depositId };
}

/**
 * Get user balance history (from transactions)
 */
export async function getUserBalanceHistory(userId: string) {
  const deposits = await db
    .table('deposit_requests')
    .knex('deposit_requests')
    .where({ userId, status: 'completed' })
    .select('amount', 'createdAt', 'processedAt')
    .orderBy('processedAt', 'desc');

  const withdrawals = await db
    .table('withdrawal_requests')
    .knex('withdrawal_requests')
    .where({ userId, status: 'completed' })
    .select('withdrawalFee', 'createdAt', 'completedAt')
    .orderBy('completedAt', 'desc');

  return {
    deposits: deposits.map((d) => ({
      amount: parseFloat(d.amount),
      date: d.processedAt || d.createdAt,
      type: 'deposit',
    })),
    withdrawals: withdrawals.map((w) => ({
      amount: parseFloat(w.withdrawalFee) || 0,
      date: w.completedAt || w.createdAt,
      type: 'withdrawal',
    })),
  };
}
