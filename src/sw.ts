/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

// Vite PWA가 빌드 시점에 에셋 목록을 주입합니다.
precacheAndRoute(self.__WB_MANIFEST);

// 푸시 알림 수신 이벤트
self.addEventListener('push', (event) => {
  let data = {};
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
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
