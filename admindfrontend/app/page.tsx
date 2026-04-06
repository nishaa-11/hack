'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, Download, AlertOctagon, CheckCircle2, Clock, Users, Eye, LayoutDashboard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function SinglePageDashboard() {
  const [stats, setStats] = useState({
    openIssues: 0,
    resolvedToday: 0,
    avgResponseTime: 2.4,
    citizenReports: 0,
  });
  
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        console.log('Fetching dashboard data with Service Role Key...');
        
        // 1. Fetch total count (permisssive)
        const { count: total, error: countErr } = await supabase
          .from('reports')
          .select('id', { count: 'exact', head: true });

        if (countErr) {
          console.error('SUPABASE COUNT ERROR:', countErr);
        }
        console.log('Total reports in DB (fetched from frontend):', total);

        const { count: resCount } = await supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'resolved');

        setStats({
          openIssues: (total || 0) - (resCount || 0),
          resolvedToday: resCount || 0,
          avgResponseTime: 2.4,
          citizenReports: total || 0,
        });

        // 2. Fetch reports for table and chart (using professional join)
        const { data: reports, error: reportsErr } = await supabase
          .from('reports')
          .select(`
            id, title, status, address, category_id, 
            priority, created_at, 
            issue_categories ( name )
          `)
          .order('created_at', { ascending: false });

        if (reportsErr) {
          console.error('SUPABASE REPORTS ERROR:', reportsErr);
        }
        
        if (reports) {
          setRecentReports(reports.slice(0, 8));

          // Group by category name for chart
          const categoryCounts: Record<string, number> = {};
          reports.forEach((r: any) => {
            const cat = Array.isArray(r.issue_categories) ? r.issue_categories[0] : r.issue_categories;
            const catName = cat?.name || 'Uncategorized';
            categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
          });

          const formattedChart = Object.entries(categoryCounts).map(([name, value]) => ({
            name,
            value
          }));
          setChartData(formattedChart);
        }

      } catch (err) {
        console.error('General error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200';
      case 'in_progress': return 'text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200';
      default: return 'text-red-500 bg-red-50 px-2 py-1 rounded border border-red-200';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'high' || s === 'critical') return <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full uppercase">Critical</span>;
    if (s === 'medium') return <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded-full uppercase">Medium</span>;
    return <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full uppercase">Low</span>;
  };

  return (
    <div className="bg-[#f0f9f4] min-h-screen">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-emerald-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-700 p-1.5 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-emerald-900 tracking-tight">CivicPulse <span className="text-emerald-500 text-base font-normal ml-1">Admin Dashboard</span></h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right mr-2 hidden sm:block">
              <div className="text-sm font-bold text-slate-800">Admin User</div>
              <div className="text-xs text-slate-500">Bengaluru Municipal Corp</div>
           </div>
           <div className="w-10 h-10 rounded-full bg-emerald-900 text-white flex items-center justify-center font-bold shadow-inner">
              AB
           </div>
        </div>
      </nav>

      <div className="p-8 max-w-[1600px] mx-auto space-y-8">
        
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-7 shadow-sm border border-emerald-50 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full flex items-center gap-1">+12%</span>
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Open Issues</h3>
              <div className="text-4xl font-black text-slate-900 mt-2">{loading ? '...' : stats.openIssues}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-emerald-50 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">Optimal</span>
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Resolved Today</h3>
              <div className="text-4xl font-black text-slate-900 mt-2">{loading ? '...' : stats.resolvedToday}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-emerald-50 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">-0.4d</span>
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Avg. Response Time</h3>
              <div className="text-4xl font-black text-slate-900 mt-2 flex items-baseline gap-1">
                {stats.avgResponseTime} <span className="text-base font-bold text-slate-400">days</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-7 shadow-sm border border-emerald-50 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">Global</span>
            </div>
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Reports</h3>
              <div className="text-4xl font-black text-slate-900 mt-2">{loading ? '...' : stats.citizenReports}</div>
            </div>
          </div>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Pie Chart Section */}
          <div className="lg:col-span-1 bg-white rounded-3xl p-8 shadow-sm border border-emerald-50 flex flex-col items-center">
            <h2 className="text-xl font-black text-slate-900 mb-6 w-full text-left">Issues by Category</h2>
            <div className="w-full h-80">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-slate-400">Loading chart...</div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart suppressHydrationWarning>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center italic text-2xl font-serif">!</div>
                   <p className="font-medium text-sm">No data available yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Table Section */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-emerald-50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Recent Complaints Queue</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Live feed of active issues from Bengaluru</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors">
                  <Calendar className="w-4 h-4" /> Filter
                </button>
                <button className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-800 transition-colors shadow-sm">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-bold text-slate-400 border-b border-slate-50">
                    <th className="pb-4 uppercase tracking-widest">ID</th>
                    <th className="pb-4 uppercase tracking-widest">Description</th>
                    <th className="pb-4 uppercase tracking-widest">Location</th>
                    <th className="pb-4 uppercase tracking-widest">Priority</th>
                    <th className="pb-4 uppercase tracking-widest">Status</th>
                    <th className="pb-4 uppercase tracking-widest text-right">View</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-50">
                  {recentReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 text-slate-500 font-serif">#{report.id.substring(0, 6)}</td>
                      <td className="py-5">
                        <div className="font-extrabold text-slate-950 truncate max-w-[200px]">{report.title || "No Title"}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {Array.isArray(report.issue_categories) 
                            ? report.issue_categories[0]?.name 
                            : report.issue_categories?.name || 'Inquiry'}
                        </div>
                      </td>
                      <td className="py-5 text-slate-600 max-w-[150px] truncate">{report.address?.split(',')[0] || "City Center"}</td>
                      <td className="py-5">{getSeverityBadge(report.priority)}</td>
                      <td className="py-5">
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${getStatusColor(report.status)}`}>
                          {report.status?.replace('_', ' ') || 'pending'}
                        </span>
                      </td>
                      <td className="py-5 text-right">
                        <button className="p-2.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-2xl transition-all">
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recentReports.length === 0 && !loading && (
                    <tr>
                       <td colSpan={6} className="py-20 text-center flex flex-col items-center justify-center text-slate-400 gap-3">
                          <div className="w-12 h-12 text-slate-200">🔍</div>
                          <p className="font-bold">No issues reported in this region yet.</p>
                       </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
