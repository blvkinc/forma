import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
} from '../lib/notifications';

// ============================================================
// useNotifications — Real-time notification management
// ============================================================
export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const subscriptionRef = useRef(null);

  // Load initial notifications and subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    async function load() {
      setLoading(true);
      try {
        const [notifs, count] = await Promise.all([
          fetchNotifications(userId, { limit: 30 }),
          fetchUnreadCount(userId),
        ]);
        setNotifications(notifs);
        setUnreadCount(count);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    load();

    // Subscribe to real-time notifications
    subscriptionRef.current = subscribeToNotifications(userId, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, [userId]);

  // Mark single notification as read
  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      await markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, [userId]);

  return {
    notifications,
    unreadCount,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    loading,
  };
}
