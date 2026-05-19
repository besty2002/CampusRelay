import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  Loader2,
  MessageCircle,
  Package,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { StatCard } from './components/StatCard';
import { logger } from '../../lib/logger';

interface AdminContext {
  role: 'school_admin' | 'super_admin';
  adminSchoolIds: string[];
}

interface DailyCount {
  date: string;
  count: number;
}

interface CategoryCount {
  name: string;
  value: number;
}

interface CreatedAtRow {
  created_at: string;
}

interface CategoryRow {
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  Uniform: '制服',
  Textbook: '教科書',
  Digital: 'デジタル',
  Life: '生活用品',
  ArtSport: '文化・スポーツ',
  Other: 'その他',
};

const PIE_COLORS = ['#84cc16', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#64748b'];

export const AdminOverviewPage = () => {
  const { role } = useOutletContext<AdminContext>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsersToday: 0,
    activePosts: 0,
    pendingReports: 0,
    messagesToday: 0,
    verifiedUsers: 0,
    bannedUsers: 0,
  });
  const [dailyPosts, setDailyPosts] = useState<DailyCount[]>([]);
  const [categoryDist, setCategoryDist] = useState<CategoryCount[]>([]);

  useEffect(() => {
    void fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [usersRes, newUsersRes, postsRes, reportsRes, messagesRes, verifiedRes, bannedRes] =
        await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
          supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'Available'),
          supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
          supabase.from('chat_messages').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('email_verified', true),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
        ]);

      setStats({
        totalUsers: usersRes.count || 0,
        newUsersToday: newUsersRes.count || 0,
        activePosts: postsRes.count || 0,
        pendingReports: reportsRes.count || 0,
        messagesToday: messagesRes.count || 0,
        verifiedUsers: verifiedRes.count || 0,
        bannedUsers: bannedRes.count || 0,
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: recentPosts } = await supabase
        .from('posts')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .returns<CreatedAtRow[]>();

      const dailyMap: Record<string, number> = {};
      for (let index = 0; index < 7; index += 1) {
        const day = new Date(sevenDaysAgo);
        day.setDate(day.getDate() + index);
        const key = `${day.getMonth() + 1}/${day.getDate()}`;
        dailyMap[key] = 0;
      }

      recentPosts?.forEach((post) => {
        const day = new Date(post.created_at);
        const key = `${day.getMonth() + 1}/${day.getDate()}`;
        if (key in dailyMap) dailyMap[key] += 1;
      });

      setDailyPosts(Object.entries(dailyMap).map(([date, count]) => ({ date, count })));

      const { data: categoryPosts } = await supabase
        .from('posts')
        .select('category')
        .neq('status', 'Hidden')
        .returns<CategoryRow[]>();

      const categoryMap: Record<string, number> = {};
      categoryPosts?.forEach((post) => {
        const label = CATEGORY_LABELS[post.category] || post.category;
        categoryMap[label] = (categoryMap[label] || 0) + 1;
      });

      setCategoryDist(Object.entries(categoryMap).map(([name, value]) => ({ name, value })));
    } catch (error) {
      logger.error('Stats fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-lime-500" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Users size={18} />} label="総ユーザー" value={stats.totalUsers} color="sky" />
        <StatCard icon={<UserPlus size={18} />} label="本日の新規登録" value={stats.newUsersToday} color="lime" />
        <StatCard icon={<Package size={18} />} label="出品中" value={stats.activePosts} color="purple" />
        <StatCard
          icon={<AlertTriangle size={18} />}
          label="対応待ち通報"
          value={stats.pendingReports}
          color={stats.pendingReports > 0 ? 'red' : 'slate'}
        />
        <StatCard icon={<MessageCircle size={18} />} label="本日のメッセージ" value={stats.messagesToday} color="amber" />
        <StatCard icon={<ShieldCheck size={18} />} label="認証済み" value={stats.verifiedUsers} color="lime" />
        <StatCard icon={<Users size={18} />} label="BAN中" value={stats.bannedUsers} color="red" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
          <h3 className="mb-6 text-lg font-black text-slate-800">直近7日間の新規出品</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPosts} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 700 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '1rem',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                  formatter={(value) => [`${value} 件`, '投稿数']}
                />
                <Bar dataKey="count" fill="#84cc16" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
          <h3 className="mb-6 text-lg font-black text-slate-800">カテゴリ分布</h3>
          <div className="h-64">
            {categoryDist.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryDist.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend formatter={(value) => <span className="text-xs font-bold text-slate-600">{value}</span>} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1rem',
                      border: '1px solid #e2e8f0',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                    formatter={(value) => [`${value} 件`, '投稿数']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center font-bold text-slate-300">
                データがありません
              </div>
            )}
          </div>
        </div>
      </div>

      {role === 'school_admin' && (
        <div className="mt-8 rounded-[2rem] border border-sky-100 bg-sky-50 p-6">
          <p className="text-sm font-bold text-sky-700">
            School Admin は担当学校のデータのみ管理できます。全体管理が必要な場合は Super Admin にお問い合わせください。
          </p>
        </div>
      )}
    </div>
  );
};
