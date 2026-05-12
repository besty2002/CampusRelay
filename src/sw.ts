/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

// Vite PWA・ ・誤糖 ・懍川乱 ・川・ ・ｩ・晧揆 ・ｼ・・鮒・壱共.
precacheAndRoute(self.__WB_MANIFEST);

// 1. Supabase API (Posts, Feeds) -> StaleWhileRevalidate
// ・､嵓・攵・ｸ ・・・・川・・・・ｰ・ｴ 嵓ｼ・罹･ｼ ・ｴ・ｬ・ｼ・, ・ｨ・ｼ・ｸ ・・・餓亨 ・ｱ・
registerRoute(
  ({ url }) => url.origin.includes('supabase.co') && url.pathname.startsWith('/rest/v1/posts'),
  new StaleWhileRevalidate({
    cacheName: 'supabase-posts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }) // 1 day
    ]
  })
);

// 2. Chat Data -> NetworkFirst
// ・､孖ｸ・醐〓・ ・・･﨑俯ｩｴ ・懍侠 ・肥亨・・ｼ ・幀ｳ, ・､甯ｨ(・､嵓・攵・ｸ)﨑俯ｩｴ ・川亨 ・ｬ・ｩ
registerRoute(
  ({ url }) => url.origin.includes('supabase.co') && (url.pathname.startsWith('/rest/v1/chat_messages') || url.pathname.startsWith('/rest/v1/chat_rooms')),
  new NetworkFirst({
    cacheName: 'supabase-chat-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100 })
    ]
  })
);

// 3. Supabase Storage (Images) -> CacheFirst
// ・菩・・ｴ・ｸ・・・﨑・・・・罹糖・俯ｩｴ 7・ｼ・・・川亨 ・ｰ・ ・ｬ・ｩ
registerRoute(
  ({ url }) => url.origin.includes('supabase.co') && url.pathname.startsWith('/storage/v1/object/public/'),
  new CacheFirst({
    cacheName: 'supabase-images-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }) // 7 days
    ]
  })
);

// 岺ｸ・・・誤ｦｼ ・們侠 ・ｴ・､孖ｸ
self.addEventListener('push', (event: PushEvent) => {
  let data: any = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'CampusRelay';
  const options = {
    body: data.body || '・壱｡懍垓 ・誤ｦｼ・ｴ ・・ｰｩ嵂溢慣・壱共.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ・誤ｦｼ 增ｴ・ｭ ・ｴ・､孖ｸ (增ｴ・ｭ ・・﨑ｴ・ｹ URL・・・ｴ・・
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url)
    );
  }
});
