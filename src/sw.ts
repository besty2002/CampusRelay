/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

// Vite PWA가 빌드 시점에 에셋 목록을 주입합니다.
precacheAndRoute(self.__WB_MANIFEST);

// 1. Supabase API (Posts, Feeds) -> StaleWhileRevalidate
// 오프라인 상태에서도 기존 피드를 보여주고, 온라인 시 즉시 갱신
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
// 네트워크가 가능하면 최신 메시지를 받고, 실패(오프라인)하면 캐시 사용
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
// 정적 이미지는 한 번 로드되면 7일간 캐시 우선 사용
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

// 푸시 알림 수신 이벤트
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
    body: data.body || '새로운 알림이 도착했습니다.',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 이벤트 (클릭 시 해당 URL로 이동)
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url)
    );
  }
});
