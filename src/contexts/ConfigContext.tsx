"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAppConfig,
  invalidateConfigCache,
  type AppConfig,
} from "@/lib/config";

interface ConfigContextValue extends AppConfig {
  loading: boolean;
  refetch: () => Promise<void>;
}

const defaultValue: ConfigContextValue = {
  enable_ad_pricing: false,
  price_featured_ad: 0,
  price_verification_fee: 0,
  loading: false,
  refetch: async () => {},
};

const ConfigContext = createContext<ConfigContextValue>(defaultValue);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>({
    enable_ad_pricing: false,
    price_featured_ad: 0,
    price_verification_fee: 0,
  });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAppConfig();
      setConfig(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer config fetch so auth/sign-in get priority; avoids blocking initial load
    const t = setTimeout(() => load(), 100);
    return () => clearTimeout(t);
  }, [load]);

  const refetch = useCallback(async () => {
    invalidateConfigCache();
    await load();
  }, [load]);

  const value: ConfigContextValue = {
    ...config,
    loading,
    refetch,
  };

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used within ConfigProvider");
  }
  return ctx;
}
