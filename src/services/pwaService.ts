export const pwaService = {
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications.');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  async registerBackgroundSync(tag: string) {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
      console.log('Background Sync is not supported.');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(tag);
      console.log(`Background sync registered for tag: ${tag}`);
      return true;
    } catch (err) {
      console.error('Background sync registration failed:', err);
      return false;
    }
  },

  async showLocalNotification(title: string, body: string) {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
    } as any);
  }
};
