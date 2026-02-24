import { useCallback, useEffect, useState } from "react";
import type { ImageStatusResponse } from "@/lib/api";
import { getImageStatus } from "@/lib/api";

export function useImageStatus(id: string | null) {
  const [data, setData] = useState<ImageStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await getImageStatus(id);
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) refresh();
  }, [id, refresh]);

  return {
    updateAvailable: data?.updateAvailable ?? false,
    loading,
    refresh,
  };
}
