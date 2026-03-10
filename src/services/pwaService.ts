/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const pwaService = {
  async requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  async registerBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
    const registration = await navigator.serviceWorker.ready;
    try {
      await (registration as any).sync.register('sync-income');
    } catch (err) {
      console.error('Background sync registration failed:', err);
    }
  },

  async showLocalNotification(title: string, body: string) {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      }
    });
  }
};
