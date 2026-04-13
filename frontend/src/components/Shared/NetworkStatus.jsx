/**
 * NetworkStatus.jsx - Display network connection status
 */

import { useEffect, useState } from 'react';
import useGame from '../../hooks/useGame';

export default function NetworkStatus() {
  const { connected } = useGame();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="network-status offline">
        <p>📡 No internet connection</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="network-status reconnecting">
        <p>🔄 Reconnecting to server...</p>
      </div>
    );
  }

  return null;
}
