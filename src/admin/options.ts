/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import { AdminJSOptions } from 'adminjs';
import { v4 as uuidv4 } from 'uuid';

import cloudinaryUploadFeature from '../features/cloudinary-upload.feature.js';
import { db } from '../db/index.js';

import { processAttributes } from './utils/helper.js';
import { dashboardHandler } from './utils/dashboard-handler.js';
import { componentLoader, Components } from './component-loader.js';

// Add this helper function to generate UUIDs
function generateUUID() {
  return uuidv4();
}
const table = (tableName: string) => db.table(tableName);

// Helper function to update user balance
async function updateUserBalance(userId: string, amount: number, operation: 'add' | 'subtract') {
  const user = await db.table('profiles').knex('profiles').where({ id: userId }).first();
  if (!user) throw new Error('User not found');

  const currentBalance = parseFloat(user.walletBalance) || 0;
  const newBalance = operation === 'add' ? currentBalance + amount : currentBalance - amount;

  if (newBalance < 0) {
    throw new Error('Insufficient balance');
  }

  await db.table('profiles').knex('profiles').where({ id: userId }).update({ walletBalance: newBalance });

  return newBalance;
}

const options: AdminJSOptions = {
  componentLoader,
  rootPath: '/admin',
  dashboard: {
    component: Components.Dashboard,
    handler: dashboardHandler,
  },

  resources: [
    {
      resource: table('user_notification_settings'),
      options: {
        listProperties: ['id', 'userId', 'emailNotifications', 'pushNotifications'],
        actions: {
          new: {
            before: async (request) => {
              if (request.method === 'post') {
                request.payload = {
                  ...request.payload,
                  id: generateUUID(),
                };
              }
              return request;
            },
          },
        },
      },
    },

    // NFT & Collection resources
    {
      resource: table('collections'),
      options: {
        listProperties: [
          'id',
          'name',
          'contractAddress',
          'creatorId',
          'verified',
          'floorPrice',
          'totalVolume',
          'image',
        ],
        properties: {
          image: {
            type: 'string',
            isVisible: {
              list: true,
              show: true,
              edit: true,
              filter: false,
            },
            components: {
              show: Components.CloudinaryImage,
              edit: Components.CloudinaryUpload,
              list: Components.CloudinaryImage,
            },
          },
          createdAt: { isVisible: { list: false, show: true, edit: false } },
          updatedAt: { isVisible: { list: false, show: true, edit: false } },
          verified: {
            availableValues: [
              { label: 'Verified', value: true },
              { label: 'Not Verified', value: false },
            ],
          },
        },
      },
      features: [
        cloudinaryUploadFeature({
          properties: {
            key: 'image',
            bucket: 'folder',
          },
          validation: {
            mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          },
          uploadPath: (record, filename) => {
            const collectionId = record.params?.id || 'new';
            return `collections/${collectionId}/${Date.now()}-${filename}`;
          },
        }),
      ],
    },

    {
      resource: table('nft_items'),
      options: {
        listProperties: ['id', 'name', 'collectionId', 'ownerId', 'isListed', 'listPrice', 'rarity', 'views'],
        properties: {
          createdAt: { isVisible: { list: false, show: true, edit: false } },
          updatedAt: { isVisible: { list: false, show: true, edit: false } },
          rarity: {
            availableValues: [
              { label: 'Common', value: 'Common' },
              { label: 'Rare', value: 'Rare' },
              { label: 'Epic', value: 'Epic' },
              { label: 'Legendary', value: 'Legendary' },
            ],
          },
          image: {
            type: 'string',
            isVisible: {
              list: true,
              show: true,
              edit: true,
              filter: false,
            },
            components: {
              show: Components.CloudinaryImage,
              edit: Components.CloudinaryUpload,
              list: Components.CloudinaryImage,
            },
          },
          attributes: {
            type: 'mixed',
            isVisible: {
              list: false,
              show: true,
              edit: true,
              filter: false,
            },
            components: {
              edit: Components.JsonEditor,
              show: Components.JsonEditor,
            },
          },
        },
        actions: {
          edit: {
            before: async (request) => {
              const { payload } = request;
              await processAttributes(payload);
              return request;
            },
          },
          new: {
            before: async (request) => {
              const { payload } = request;
              await processAttributes(payload);
              // Generate UUID for new records
              if (request.method === 'post') {
                request.payload = {
                  ...request.payload,
                  id: generateUUID(),
                };
              }
              return request;
            },
          },
        },
      },
      features: [
        cloudinaryUploadFeature({
          properties: {
            key: 'image',
            bucket: 'folder',
          },
          validation: {
            mimeTypes: [
              'image/png',
              'image/jpeg',
              'image/gif',
              'image/webp',
              'video/mp4',
              'video/quicktime',
              'audio/mpeg',
            ],
          },
          uploadPath: (record, filename) => {
            const nftId = record.params?.id || 'new';
            const collectionId = record.params?.collectionId || 'unknown';
            return `nfts/${collectionId}/${nftId}/${Date.now()}-${filename}`;
          },
        }),
      ],
    },

    // Transaction resources
    {
      resource: db.table('transactions'),
      options: {
        listProperties: ['id', 'transactionHash', 'transactionType', 'price', 'status', 'createdAt'],
        filterProperties: ['transactionHash', 'transactionType', 'createdAt', 'nftItemId', 'fromUserId', 'toUserId'],
        properties: {
          price: {
            type: 'number',
            props: {
              nullable: true,
            },
          },
          gasFee: {
            type: 'number',
            props: {
              nullable: true,
            },
          },
          platformFee: {
            type: 'number',
            props: {
              nullable: true,
            },
          },
          royaltyFee: {
            type: 'number',
            props: {
              nullable: true,
            },
          },
          transactionType: {
            availableValues: [
              { label: 'Mint', value: 'mint' },
              { label: 'Sale', value: 'sale' },
              { label: 'Transfer', value: 'transfer' },
              { label: 'Deposit', value: 'deposit' },
              { label: 'Withdrawal', value: 'withdrawal' },
              { label: 'Purchase', value: 'purchase' },
            ],
          },
          status: {
            availableValues: [
              { label: 'Pending', value: 'pending' },
              { label: 'Confirmed', value: 'confirmed' },
              { label: 'Failed', value: 'failed' },
              { label: 'Completed', value: 'completed' },
            ],
            isVisible: {
              list: true,
              show: true,
              edit: true,
              filter: true,
            },
          },
          createdAt: {
            isVisible: {
              list: true,
              show: true,
              edit: false,
              filter: true,
            },
          },
          confirmedAt: {
            isVisible: {
              list: false,
              show: true,
              edit: false,
              filter: false,
            },
          },
        },
        actions: {
          edit: {
            before: async (request) => {
              if (request.payload) {
                ['price', 'gasFee', 'platformFee', 'royaltyFee'].forEach((field) => {
                  if (request.payload[field] === '' || request.payload[field] === undefined) {
                    request.payload[field] = null;
                  }
                });
              }
              return request;
            },
          },
          new: {
            before: async (request) => {
              if (request.payload) {
                request.payload = {
                  ...request.payload,
                  id: generateUUID(),
                };
                ['price', 'gasFee', 'platformFee', 'royaltyFee'].forEach((field) => {
                  if (request.payload[field] === '' || request.payload[field] === undefined) {
                    request.payload[field] = null;
                  }
                });
              }
              return request;
            },
          },
        },
      },
    },

    // Auction resources
    {
      resource: table('auctions'),
      options: {
        listProperties: ['id', 'nftItemId', 'type', 'status', 'startingPrice', 'startTime', 'endTime'],
        properties: {
          type: {
            availableValues: [
              { label: 'Standard', value: 'STANDARD' },
              { label: 'Reserve', value: 'RESERVE' },
              { label: 'Timed', value: 'TIMED' },
              { label: 'Dutch', value: 'DUTCH' },
              { label: 'Blind', value: 'BLIND' },
              { label: 'Lottery', value: 'LOTTERY' },
              { label: 'Buy Now', value: 'BUY_NOW' },
              { label: 'Multi Token', value: 'MULTI_TOKEN' },
            ],
          },
          status: {
            availableValues: [
              { label: 'Live', value: 'live' },
              { label: 'Upcoming', value: 'upcoming' },
              { label: 'Ended', value: 'ended' },
              { label: 'Cancelled', value: 'cancelled' },
            ],
          },
        },
        actions: {
          new: {
            before: async (request) => {
              if (request.method === 'post') {
                request.payload = {
                  ...request.payload,
                  id: generateUUID(),
                };
              }
              return request;
            },
          },
        },
      },
    },

    // For bids
    {
      resource: table('bids'),
      options: {
        listProperties: ['id', 'auctionId', 'bidderId', 'amount', 'createdAt'],
        actions: {
          new: {
            before: async (request) => {
              if (request.method === 'post') {
                request.payload = {
                  ...request.payload,
                  id: generateUUID(),
                };
              }
              return request;
            },
          },
        },
      },
    },

    // Exhibition resources
    // For exhibitions
    {
      resource: table('exhibitions'),
      options: {
        listProperties: ['id', 'title', 'status', 'startDate', 'endDate', 'featured', 'views'],
        properties: {
          status: {
            availableValues: [
              { label: 'Draft', value: 'draft' },
              { label: 'Upcoming', value: 'upcoming' },
              { label: 'Active', value: 'active' },
              { label: 'Ended', value: 'ended' },
              { label: 'Cancelled', value: 'cancelled' },
            ],
          },
          locationType: {
            availableValues: [
              { label: 'Virtual', value: 'virtual' },
              { label: 'Physical', value: 'physical' },
              { label: 'Hybrid', value: 'hybrid' },
            ],
          },
          image: {
            type: 'string',
            isVisible: {
              list: true,
              show: true,
              edit: true,
              filter: false,
            },
            components: {
              show: Components.CloudinaryImage,
              edit: Components.CloudinaryUpload,
              list: Components.CloudinaryImage,
            },
          },
        },
        actions: {
          new: {
            before: async (request) => {
              if (request.method === 'post') {
                request.payload = {
                  ...request.payload,
                  id: generateUUID(),
                };
              }
              return request;
            },
          },
        },
      },
      features: [
        cloudinaryUploadFeature({
          properties: {
            key: 'image',
            bucket: 'folder',
          },
          validation: {
            mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          },
          uploadPath: (record, filename) => {
            const exhibitionId = record.params?.id || 'new';
            return `exhibitions/${exhibitionId}/main/${Date.now()}-${filename}`;
          },
        }),
      ],
    },

    // Financial resources with balance management
    {
      resource: table('withdrawal_requests'),
      options: {
        listProperties: ['id', 'userId', 'status', 'destinationAddress', 'createdAt'],
        properties: {
          status: {
            availableValues: [
              { label: 'Pending', value: 'pending' },
              { label: 'Verified', value: 'verified' },
              { label: 'Processing', value: 'processing' },
              { label: 'Completed', value: 'completed' },
              { label: 'Failed', value: 'failed' },
            ],
          },
        },
        actions: {
          new: {
            before: async (request) => {
              // Generate UUID for new records
              if (request.method === 'post') {
                request.payload = {
                  ...request.payload,
                  id: generateUUID(),
                };
              }
              return request;
            },
          },
          edit: {
            before: async (request) => {
              const recordId = request.params?.recordId;
              if (!recordId) return request;

              // Get the old record
              const oldRecord = await db
                .table('withdrawal_requests')
                .knex('withdrawal_requests')
                .where({ id: recordId })
                .first();

              // Store old status for comparison
              request.context = { oldStatus: oldRecord?.status };
              return request;
            },
            after: async (response: any, request: any) => {
              const newStatus = request.payload?.status;
              const oldStatus = request.context?.oldStatus;
              const recordId = request.params?.recordId;

              // Only process if status changed to 'completed'
              if (newStatus === 'completed' && oldStatus !== 'completed' && recordId) {
                try {
                  const withdrawal = await db
                    .table('withdrawal_requests')
                    .knex('withdrawal_requests')
                    .where({ id: recordId })
                    .first();

                  if (withdrawal && withdrawal.userId) {
                    // Get NFT item if exists
                    let amount = 0;
                    if (withdrawal.nftItemId) {
                      const nft = await db
                        .table('nft_items')
                        .knex('nft_items')
                        .where({ id: withdrawal.nftItemId })
                        .first();
                      amount = nft?.listPrice || 0;
                    }

                    // Subtract withdrawal fee if exists
                    const withdrawalFee = parseFloat(withdrawal.withdrawalFee) || 0;
                    const totalDeduction = amount + withdrawalFee;

                    if (totalDeduction > 0) {
                      await updateUserBalance(withdrawal.userId, totalDeduction, 'subtract');

                      // Update completedAt timestamp
                      await db
                        .table('withdrawal_requests')
                        .knex('withdrawal_requests')
                        .where({ id: recordId })
                        .update({ completedAt: new Date() });

                      response.notice = {
                        message: `Withdrawal completed. User balance deducted by ${totalDeduction}`,
                        type: 'success',
                      };
                    }
                  }
                } catch (error: any) {
                  response.notice = {
                    message: `Error updating balance: ${error.message}`,
                    type: 'error',
                  };
                }
              }

              return response;
            },
          },
        },
      },
    },
    {
      resource: table('deposit_requests'),
      options: {
        listProperties: ['id', 'userId', 'amount', 'status', 'createdAt'],
        properties: {
          status: {
            availableValues: [
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' },
              { label: 'Completed', value: 'completed' },
            ],
          },
        },
        actions: {
          new: {
            before: async (request) => {
              // Generate UUID for new records
              if (request.method === 'post') {
                request.payload = {
                  ...request.payload,
                  id: generateUUID(),
                };
              }
              return request;
            },
          },
          edit: {
            before: async (request) => {
              const recordId = request.params?.recordId;
              if (!recordId) return request;

              const oldRecord = await db
                .table('deposit_requests')
                .knex('deposit_requests')
                .where({ id: recordId })
                .first();

              request.context = { oldStatus: oldRecord?.status };
              return request;
            },
            after: async (response, request) => {
              const newStatus = request.payload?.status;
              const oldStatus = request.context?.oldStatus;
              const recordId = request.params?.recordId;

              // Process when status changes to 'completed'
              if (newStatus === 'completed' && oldStatus !== 'completed' && recordId) {
                try {
                  const deposit = await db
                    .table('deposit_requests')
                    .knex('deposit_requests')
                    .where({ id: recordId })
                    .first();

                  if (deposit && deposit.userId) {
                    const amount = parseFloat(deposit.amount) || 0;

                    if (amount > 0) {
                      await updateUserBalance(deposit.userId, amount, 'add');

                      // Update timestamps
                      await db
                        .table('deposit_requests')
                        .knex('deposit_requests')
                        .where({ id: recordId })
                        .update({
                          processedAt: new Date(),
                          approvedAt: deposit.approvedAt || new Date(),
                        });

                      response.notice = {
                        message: `Deposit completed. User balance credited with ${amount}`,
                        type: 'success',
                      };
                    }
                  }
                } catch (error: any) {
                  response.notice = {
                    message: `Error updating balance: ${error.message}`,
                    type: 'error',
                  };
                }
              }

              return response;
            },
          },
        },
      },
    },

    // Platform wallets
    {
      resource: table('platform_wallets'),
      options: {
        listProperties: ['id', 'address', 'index', 'status', 'assignedAt'],
        properties: {
          status: {
            availableValues: [
              { label: 'Available', value: 'available' },
              { label: 'Assigned', value: 'assigned' },
              { label: 'Maintenance', value: 'maintenance' },
              { label: 'Disabled', value: 'disabled' },
            ],
          },
        },
        actions: {
          new: {
            before: async (request) => {
              if (request.method === 'post') {
                request.payload = {
                  ...request.payload,
                  id: generateUUID(),
                };
              }
              return request;
            },
          },
        },
      },
    },

    // Additional resources
    {
      resource: table('escrow_transactions'),
      options: {
        listProperties: ['id', 'nftItemId', 'buyerId', 'sellerId', 'amount', 'status', 'createdAt'],
      },
    },
    {
      resource: table('whitelisted_addresses'),
      options: {
        listProperties: ['id', 'userId', 'address', 'label', 'addedAt'],
      },
    },
    {
      resource: table('purchase_sessions'),
      options: {
        listProperties: ['id', 'userId', 'nftItemId', 'amount', 'status', 'expiresAt'],
      },
    },

    // User related resources
    {
      resource: table('profiles'),
      options: {
        listProperties: ['id', 'email', 'username', 'role', 'kycStatus', 'walletBalance', 'createdAt'],
        filterProperties: ['email', 'username', 'role', 'kycStatus', 'emailVerified'],
        properties: {
          password: { isVisible: false },
          // Show assigned wallet address instead of ID
          assignedWallet: {
            type: 'string',
            isVisible: {
              list: true,
              show: true,
              edit: true,
              filter: true,
            },
            components: {
              list: Components.WalletAddress,
              show: Components.WalletAddress,
            },
          },
          // Make external wallet seed visible but secure
          externalWalletSeed: {
            type: 'textarea',
            isVisible: {
              list: false,
              show: true,
              edit: true,
              filter: false,
            },
            props: {
              rows: 3,
            },
            custom: {
              sensitive: true, // Mark as sensitive
            },
          },
          externalWalletConfigured: {
            isVisible: {
              list: false,
              show: true,
              edit: true,
              filter: true,
            },
          },
          seedPhraseConfiguredAt: {
            isVisible: {
              list: false,
              show: true,
              edit: false,
              filter: false,
            },
          },
          walletBalance: {
            type: 'number',
            isVisible: {
              list: true,
              show: true,
              edit: true,
              filter: true,
            },
          },
          createdAt: { isVisible: { list: true, show: true, edit: false } },
          updatedAt: { isVisible: { list: false, show: true, edit: false } },
          role: {
            availableValues: [
              { label: 'Super Admin', value: 'SUPERADMIN' },
              { label: 'Admin', value: 'ADMIN' },
              { label: 'User', value: 'USER' },
            ],
          },
          kycStatus: {
            availableValues: [
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' },
            ],
          },
        },
        actions: {
          show: {
            after: async (response) => {
              // Fetch wallet address if assignedWallet exists
              if (response.record?.params?.assignedWallet) {
                const wallet = await db
                  .table('platform_wallets')
                  .knex('platform_wallets')
                  .where({ address: response.record.params.assignedWallet })
                  .first();

                if (wallet) {
                  response.record.params.walletAddress = wallet.address;
                  response.record.params.walletStatus = wallet.status;
                }
              }
              return response;
            },
          },
          list: {
            after: async (response) => {
              // Enrich list records with wallet addresses
              if (response.records) {
                for (const record of response.records) {
                  if (record.params?.assignedWallet) {
                    const wallet = await db
                      .table('platform_wallets')
                      .knex('platform_wallets')
                      .where({ address: record.params.assignedWallet })
                      .first();

                    if (wallet) {
                      record.params.walletAddress = wallet.address;
                      record.params.walletStatus = wallet.status;
                    }
                  }
                }
              }
              return response;
            },
          },
        },
      },
    },
  ],
  branding: {
    companyName: 'Vaultorx NFT Marketplace Admin',
    logo: false,
  },
};

export default options;
