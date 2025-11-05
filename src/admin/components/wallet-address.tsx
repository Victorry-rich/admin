import React from 'react';
import { Box, Badge, Text } from '@adminjs/design-system';
import { ShowPropertyProps } from 'adminjs';

const WalletAddress: React.FC<ShowPropertyProps> = (props) => {
  const { record } = props;

  // Get wallet address from params
  const walletAddress = record.params.walletAddress || record.params.assignedWallet;
  const { walletStatus } = record.params;

  if (!walletAddress) {
    return (
      <Box>
        <Badge variant="default" size="sm">
          No Wallet Assigned
        </Badge>
      </Box>
    );
  }

  // Truncate address for display
  const displayAddress = walletAddress.length > 20 ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : walletAddress;

  const statusColors: Record<string, string> = {
    available: 'default',
    assigned: 'success',
    maintenance: 'warning',
    disabled: 'danger',
  };

  return (
    <Box display="flex" alignItems="center" gap="sm">
      <Text fontFamily="mono" fontSize="sm">
        {displayAddress}
      </Text>
      {walletStatus && (
        <Badge variant={statusColors[walletStatus] || 'default'} size="sm">
          {walletStatus}
        </Badge>
      )}
    </Box>
  );
};

export default WalletAddress;
