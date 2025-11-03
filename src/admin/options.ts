import { AdminJSOptions } from 'adminjs';

import cloudinaryUploadFeature from '../features/cloudinary-upload.feature.js';
import { db } from '../db/index.js';

import { processAttributes } from './utils/helper.js';
import { dashboardHandler } from './utils/dashboard-handler.js';
import { componentLoader, Components } from './component-loader.js';

const table = (tableName: string) => db.table(tableName);

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
      },
    },

    // NFT & Collection resources
    // Collections with Cloudinary upload
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
              show: Components.CloudinaryImage, // Use the Components object
              edit: Components.CloudinaryUpload, // Use the Components object
              list: Components.CloudinaryImage, // Use the Components object
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
              show: Components.CloudinaryImage, // Use the Components object
              edit: Components.CloudinaryUpload, // Use the Components object
              list: Components.CloudinaryImage, // Use the Components object
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
        properties: {
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
      },
    },
    {
      resource: table('bids'),
      options: {
        listProperties: ['id', 'auctionId', 'bidderId', 'amount', 'createdAt'],
      },
    },

    // Exhibition resources
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
              show: Components.CloudinaryImage, // Use the Components object
              edit: Components.CloudinaryUpload, // Use the Components object
              list: Components.CloudinaryImage, // Use the Components object
            },
          },
        },
      },
      features: [
        // Main image upload
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
        // Banner image upload (you can add another feature for bannerImage)
      ],
    },

    // Financial resources
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
      resource: table('users'),
      options: {
        listProperties: ['id', 'email', 'username', 'role', 'kycStatus', 'walletBalance', 'createdAt'],
        filterProperties: ['email', 'username', 'role', 'kycStatus', 'emailVerified'],
        properties: {
          password: { isVisible: false },
          externalWalletSeed: { isVisible: false },
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
      },
    },
  ],
  databases: [db],
  branding: {
    companyName: 'Vaultorx NFT Marketplace Admin',
    logo: false,
  },
};

export default options;
