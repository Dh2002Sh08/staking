'use client';

import dynamic from 'next/dynamic';

const StakeComponent = dynamic(() => import('./stake').then(mod => mod.StakeComponent), {
  ssr: false
});

export const ClientStakeWrapper = () => {
  return <StakeComponent />;
}; 