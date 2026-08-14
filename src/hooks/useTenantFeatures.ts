import useSWR, { mutate as mutateGlobal } from 'swr';
import apiClient from '../api/axiosConfig';

export type FeatureKey = 'POS_BARCODE' | 'WHATSAPP_BOT' | 'CUSTOMER_CATALOG' | 'PAYMENT_LINKS';

type TenantFeatures = Record<FeatureKey, boolean>;

const fetcher = (url: string) => apiClient.get<TenantFeatures>(url).then((res) => res.data);

export const useTenantFeatures = () => {
  const token = localStorage.getItem('token');
  const tenant = localStorage.getItem('tenant');

  const { data, error, isLoading, mutate } = useSWR<TenantFeatures>(
    token ? [`/features/me`, tenant] : null,
    ([url]) => fetcher(url),
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
    },
  );

  const isFeatureEnabled = (featureKey: FeatureKey): boolean => Boolean(data?.[featureKey]);

  return {
    features: data,
    error,
    isLoading,
    isFeatureEnabled,
    refresh: mutate,
  };
};

export const clearTenantFeaturesCache = () => {
  mutateGlobal(
    (key) => Array.isArray(key) && key[0] === '/features/me',
    undefined,
    { revalidate: false },
  );
};
