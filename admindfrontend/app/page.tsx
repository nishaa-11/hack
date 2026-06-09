'use client';

import { useEffect, useState } from 'react';
import { AlertOctagon, CheckCircle2, Clock, Eye, LayoutDashboard, Plus, Users, X } from 'lucide-react';
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
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ description: '', location: '', priority: 'High' });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/complaints');
      if (!response.ok) {
        throw new Error('Unable to fetch dashboard data from the backend');
      }

      const data = await response.json();
      const queue = (data.queue || []).filter((item: any) => {
        return selectedPriority === 'all' ? true : item.priority.toLowerCase() === selectedPriority;
      });

      setStats({
        openIssues: data.metrics?.openIssues || 0,
        resolvedToday: data.metrics?.resolvedToday || 0,
        avgResponseTime: 2.4,
        citizenReports: data.metrics?.totalReports || 0,
      });
      setRecentReports(queue);

      const locationCounts: Record<string, number> = {};
      queue.forEach((item: any) => {
        const key = item.location || 'Unknown';
        locationCounts[key] = (locationCounts[key] || 0) + 1;
      });

      setChartData(Object.entries(locationCounts).map(([name, value]) => ({ name, value })));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPriority]);

  const handleSubmitComplaint = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create complaint');
      }

      setFormData({ description: '', location: '', priority: 'High' });
      setIsFormOpen(false);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error creating complaint:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status?.toLowerCase() === 'resolved') {
      return 'text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200';
    }
    return 'text-red-500 bg-red-50 px-2 py-1 rounded border border-red-200';
  };

  const getSeverityBadge = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'high') return <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full uppercase">High</span>;
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
                  <PieChart>
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
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
                >
                  <Plus className="w-4 h-4" />
                  Lodge Complaint
                </button>
                <div className="relative">
                  <select 
                    value={selectedPriority} 
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="appearance-none bg-emerald-50 text-emerald-700 px-4 py-2 pr-10 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors cursor-pointer outline-none border-none shadow-sm"
                  >
                    <option value="all">Any Priority</option>
                    <option value="high">High Only</option>
                    <option value="medium">Medium Only</option>
                    <option value="low">Low Only</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-emerald-600">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
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
                      <td className="py-5 text-slate-500 font-serif">#{String(report.id).slice(0, 6)}</td>
                      <td className="py-5">
                        <div className="font-extrabold text-slate-950 truncate max-w-[240px]">{report.description || 'No description provided'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{new Date(report.created_at).toLocaleString()}</div>
                      </td>
                      <td className="py-5 text-slate-600 max-w-[150px] truncate">{report.location || 'Bengaluru'}</td>
                      <td className="py-5">{getSeverityBadge(report.priority)}</td>
                      <td className="py-5">
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${getStatusColor(report.status)}`}>
                          {report.status || 'Open'}
                        </span>
                      </td>
                      <td className="py-5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedComplaint(report)}
                          className="p-2.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-2xl transition-all"
                          aria-label={`View complaint ${report.id}`}
                        >
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

      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Complaint Details</p>
                <h3 className="text-xl font-black text-slate-900">#{String(selectedComplaint.id).slice(0, 6)}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-700">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Description</p>
                <p className="mt-1 text-base text-slate-900">{selectedComplaint.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Location</p>
                  <p className="mt-1 font-semibold text-slate-900">{selectedComplaint.location || 'Bengaluru'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Priority</p>
                  <p className="mt-1 font-semibold text-slate-900">{selectedComplaint.priority || 'Medium'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Status</p>
                  <p className="mt-1 font-semibold text-slate-900">{selectedComplaint.status || 'Open'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Created</p>
                  <p className="mt-1 font-semibold text-slate-900">{new Date(selectedComplaint.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Lodging a Complaint</h3>
                <p className="text-sm text-slate-500">Submit a new issue and it will appear instantly in the queue.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmitComplaint}>
              <label className="block text-sm font-semibold text-slate-700">
                Description
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
                  placeholder="Describe the issue in a few words"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Location
                <input
                  required
                  type="text"
                  value={formData.location}
                  onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
                  placeholder="e.g. Whitefield"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Priority
                <select
                  value={formData.priority}
                  onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none ring-0"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? 'Submitting...' : 'Submit Complaint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
