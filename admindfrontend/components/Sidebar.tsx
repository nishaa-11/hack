import { LayoutDashboard, AlertCircle, Map, PieChart, Building2, Settings } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-[#E5FDF1] border-r border-[#C6F6D5] flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-teal-900 flex items-center gap-2">
          CivicPulse
        </h1>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 bg-white text-teal-800 rounded-xl font-medium shadow-sm">
          <LayoutDashboard className="w-5 h-5 text-teal-600" />
          Overview
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 text-teal-700 hover:bg-white/50 rounded-xl font-medium transition-colors">
          <AlertCircle className="w-5 h-5" />
          Complaints
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 text-teal-700 hover:bg-white/50 rounded-xl font-medium transition-colors">
          <Map className="w-5 h-5" />
          Heatmap
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 text-teal-700 hover:bg-white/50 rounded-xl font-medium transition-colors">
          <PieChart className="w-5 h-5" />
          Analytics
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 text-teal-700 hover:bg-white/50 rounded-xl font-medium transition-colors">
          <Building2 className="w-5 h-5" />
          Departments
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 text-teal-700 hover:bg-white/50 rounded-xl font-medium transition-colors mt-8">
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </nav>

      <div className="p-4 mb-4 mx-4 bg-[#BCEFD9] rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-teal-900 text-white rounded-full flex items-center justify-center font-bold text-sm">
          AB
        </div>
        <div>
          <div className="text-sm font-bold text-teal-950">Admin User</div>
          <div className="text-xs text-teal-800">BBMP Authority</div>
        </div>
      </div>
    </div>
  );
}
