// Web Push 인증을 위한 VAPID 공개키
export const PUBLIC_VAPID_KEY = 'BGKPPYNvbaFAi0DoL9sgU5oklY8XhfkS8F6cQ38vfJC4lRHyWbLJffWY5Sb6bQN6m4e7i8lUq37T4tJrCMNvgu4';

// Base64Url 디코딩 유틸리티 함수
export function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
