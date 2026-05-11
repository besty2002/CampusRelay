import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "https://esm.sh/web-push@3.6.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const PUBLIC_VAPID_KEY = Deno.env.get('PUBLIC_VAPID_KEY') || '';
const PRIVATE_VAPID_KEY = Deno.env.get('PRIVATE_VAPID_KEY') || '';

// VAPID 키 설정 (푸시 발송자 증명)
webpush.setVapidDetails(
  'mailto:support@campusrelay.com',
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

serve(async (req) => {
  try {
    const payload = await req.json();
    
    // 환경 변수에서 시스템 어드민 키(Service Role Key)를 사용하여 DB 접근
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const notificationsToSend: { userId: string, title: string, body: string, url: string }[] = [];

    // 트리거 1: 새로운 채팅 메시지 등록 시
    if (payload.table === 'chat_messages' && payload.type === 'INSERT') {
      const msg = payload.record;
      
      const { data: room } = await supabaseClient.from('chat_rooms').select('*').eq('id', msg.room_id).single();
      if (room) {
        const receiverId = msg.sender_id === room.seller_id ? room.buyer_id : room.seller_id;
        
        const { data: sender } = await supabaseClient.from('profiles').select('display_name').eq('id', msg.sender_id).single();
        const senderName = sender?.display_name || "ユーザー";

        notificationsToSend.push({
          userId: receiverId,
          title: `新しいメッセージ - ${senderName}`,
          body: msg.image_url ? '写真を送りました。' : msg.text,
          url: `/chat/${msg.room_id}` // 클릭 시 채팅방으로 이동
        });
      }
    } 
    // 트리거 2: 새로운 포스트 등록 시 (키워드 매칭)
    else if (payload.table === 'posts' && payload.type === 'INSERT') {
      const post = payload.record;
      
      const { data: keywords } = await supabaseClient.from('keyword_alerts').select('*');
      if (keywords) {
        const matchedUserIds = new Set<string>();
        keywords.forEach((k: { keyword: any; user_id: string; }) => {
          if ((post.title && post.title.includes(k.keyword)) || (post.description && post.description.includes(k.keyword))) {
            if (k.user_id !== post.user_id) { // 작성자 본인에게는 알림 제외
              matchedUserIds.add(k.user_id);
            }
          }
        });

        matchedUserIds.forEach(uid => {
          notificationsToSend.push({
            userId: uid,
            title: `関心キーワードの新しい出品！`,
            body: `『${post.title}』アイテムが新しく出品されました。`,
            url: `/post/${post.id}` // 클릭 시 게시글로 이동
          });
        });
      }
    }

    if (notificationsToSend.length === 0) {
      return new Response(JSON.stringify({ success: true, message: '通知対象なし' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // 모아진 알림 대상을 조회하여 Web Push 전송
    let successCount = 0;
    let failCount = 0;

    for (const notif of notificationsToSend) {
      const { data: subs } = await supabaseClient.from('push_subscriptions').select('*').eq('user_id', notif.userId);
      if (!subs || subs.length === 0) continue;

      for (const sub of subs) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, JSON.stringify({
            title: notif.title,
            body: notif.body,
            url: notif.url
          }));
          successCount++;
        } catch (e: any) {
          console.error('Push error:', e.statusCode, e.body);
          failCount++;
          // 만약 구독이 만료되었거나 취소되었다면 (상태 코드 404 혹은 410) DB에서 삭제
          if (e.statusCode === 404 || e.statusCode === 410) {
            await supabaseClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, successCount, failCount }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Error handling webhook:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});
