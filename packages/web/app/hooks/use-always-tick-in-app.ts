import { useState, useEffect, useCallback } from 'react';
import { getAlwaysTickInApp, setAlwaysTickInApp } from '@/app/lib/user-preferences-db';

export function useAlwaysTickInApp() {
  const [alwaysUseApp, setAlwaysUseApp] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAlwaysTickInApp().then((value) => {
      setAlwaysUseApp(value);
      setLoaded(true);
    });
  }, []);

  const enableAlwaysUseApp = useCallback(async () => {
    await setAlwaysTickInApp(true);
    setAlwaysUseApp(true);
  }, []);

  return { alwaysUseApp, loaded, enableAlwaysUseApp };
}
