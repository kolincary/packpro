import { AnomalyNotification } from '../types';

/**
 * Request browser push notification permissions
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support desktop notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Trigger system push notification if enabled and allowed
 */
export function sendPushNotification(notification: AnomalyNotification) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const icon = notification.severity === 'critical' ? '🚨' : '⚠️';
      const title = `${icon} PackGuard: ${notification.title}`;
      
      const n = new Notification(title, {
        body: `${notification.message} (Order: ${notification.orderNumber})`,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.severity === 'critical',
      });

      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (err) {
      console.warn('Failed to dispatch native browser notification:', err);
    }
  }
}
