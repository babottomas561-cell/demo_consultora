import { useContext } from 'react';
import { CrossFilterContext } from '../components/analytics/CrossFilterProvider';

export const useCrossFilter = () => {
  const ctx = useContext(CrossFilterContext);
  if (!ctx) throw new Error('useCrossFilter must be used inside <CrossFilterProvider>');
  return ctx;
};
