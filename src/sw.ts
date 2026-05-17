/// <reference lib="webworker" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin.includes('supabase.co') && url.pathname.startsWith('/rest/v1/posts'),
  new StaleWhileRevalidate({
    cacheName: 'supabase-posts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 })],
  })
);

registerRoute(
  ({ url }) =>
    url.origin.includes('supabase.co') &&
    (url.pathname.startsWith('/rest/v1/chat_messages') || url.pathname.startsWith('/rest/v1/chat_rooms')),
  new NetworkFirst({
    cacheName: 'supabase-chat-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100 })],
  })
);

registerRoute(
  ({ url }) => url.origin.includes('supabase.co') && url.pathname.startsWith('/storage/v1/object/public/'),
  new CacheFirst({
    cacheName: 'supabase-images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

self.addEventListener('push', (event: PushEvent) => {
  let data: PushPayload = {};

  if (event.data) {
    try {
      data = event.data.json() as PushPayload;
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'CampusRelay';
  const options = {
    body: data.body || '新しいお知らせがあります。',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(self.clients.openWindow(event.notification.data.url));
  }
});
