-- 1. push_subscriptions 테이블 생성 (푸시 알림 수신 동의 정보 저장)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, endpoint)
);

-- RLS 설정
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    USING (auth.uid() = user_id);

-- 2. keyword_alerts 테이블 생성 (관심 키워드 등록 정보 저장)
CREATE TABLE IF NOT EXISTS public.keyword_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    keyword text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, keyword)
);

-- RLS 설정
ALTER TABLE public.keyword_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own keyword alerts"
    ON public.keyword_alerts
    FOR ALL
    USING (auth.uid() = user_id);
