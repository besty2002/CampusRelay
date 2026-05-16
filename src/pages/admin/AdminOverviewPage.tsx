import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { StatCard } from './components/StatCard';
import {
  Users,
  UserPlus,
  Package,
  AlertTriangle,
  MessageCircle,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

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

const CATEGORY_LABELS: Record<string, string> = {
  Uniform: '制服',
  Textbook: '教科書',
  Digital: 'デジタル',
  Life: '生活用品',
  ArtSport: '体育/美術',
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
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Parallel fetch all stats
      const [
        usersRes,
        newUsersRes,
        postsRes,
        reportsRes,
        messagesRes,
        verifiedRes,
        bannedRes,
      ] = await Promise.all([
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

      // Fetch daily posts for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: recentPosts } = await supabase
        .from('posts')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Group by date
      const dailyMap: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        dailyMap[key] = 0;
      }
      recentPosts?.forEach(p => {
        const d = new Date(p.created_at);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        if (key in dailyMap) dailyMap[key]++;
      });

      setDailyPosts(Object.entries(dailyMap).map(([date, count]) => ({ date, count })));

      // Fetch category distribution
      const { data: catPosts } = await supabase
        .from('posts')
        .select('category')
        .neq('status', 'Hidden');

      const catMap: Record<string, number> = {};
      catPosts?.forEach(p => {
        const label = CATEGORY_LABELS[p.category] || p.category;
        catMap[label] = (catMap[label] || 0) + 1;
      });

      setCategoryDist(Object.entries(catMap).map(([name, value]) => ({ name, value })));
    } catch (err) {
      console.error('Stats fetch error:', err);
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
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users size={18} />} label="総ユーザー" value={stats.totalUsers} color="sky" />
        <StatCard icon={<UserPlus size={18} />} label="本日の新規" value={stats.newUsersToday} color="lime" />
        <StatCard icon={<Package size={18} />} label="出品中" value={stats.activePosts} color="purple" />
        <StatCard icon={<AlertTriangle size={18} />} label="処理待ち通報" value={stats.pendingReports} color={stats.pendingReports > 0 ? 'red' : 'slate'} />
        <StatCard icon={<MessageCircle size={18} />} label="本日のメッセージ" value={stats.messagesToday} color="amber" />
        <StatCard icon={<ShieldCheck size={18} />} label="認証済み" value={stats.verifiedUsers} color="lime" />
        <StatCard icon={<Users size={18} />} label="BAN中" value={stats.bannedUsers} color="red" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Posts Bar Chart */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-6">直近7日間の新規投稿</h3>
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

        {/* Category Pie Chart */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-slate-800 mb-6">カテゴリ分布</h3>
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
                    {categoryDist.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => <span className="text-xs font-bold text-slate-600">{value}</span>}
                  />
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
              <div className="h-full flex items-center justify-center text-slate-300 font-bold">
                データがありません
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Info */}
      {role === 'school_admin' && (
        <div className="mt-8 bg-sky-50 rounded-[2rem] p-6 border border-sky-100">
          <p className="text-sm font-bold text-sky-700">
            💡 School Admin として、所属学校のデータのみ管理できます。全体管理が必要な場合は Super Admin にお問い合わせください。
          </p>
        </div>
      )}
    </div>
  );
};
