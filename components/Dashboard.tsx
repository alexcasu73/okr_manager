import React, { useMemo } from 'react';
import { Card, ProgressBar } from './UIComponents';
import { ICONS, STATUS_COLORS } from '../constants';
import { MOCK_OBJECTIVES, CHART_DATA } from '../mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { User, Objective } from '../types';

interface DashboardProps {
  currentUser: User;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  // Filter objectives based on role
  const visibleObjectives = useMemo(() => {
    if (currentUser.role === 'super-admin') {
      return MOCK_OBJECTIVES;
    }
    return MOCK_OBJECTIVES.filter(obj => obj.ownerId === currentUser.id);
  }, [currentUser]);

  const totalOKRs = visibleObjectives.length;
  
  // Guard against division by zero
  const avgProgress = totalOKRs > 0 
    ? Math.round(visibleObjectives.reduce((acc, curr) => acc + curr.progress, 0) / totalOKRs) 
    : 0;
    
  const atRisk = visibleObjectives.filter(o => o.status === 'at-risk' || o.status === 'off-track').length;
  const completed = visibleObjectives.filter(o => o.status === 'completed').length;

  // Calculate status distribution dynamically
  const statusCounts = visibleObjectives.reduce((acc, obj) => {
    acc[obj.status] = (acc[obj.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dynamicDistribution = [
    { name: 'On Track', value: statusCounts['on-track'] || 0, color: '#10B981' },
    { name: 'At Risk', value: statusCounts['at-risk'] || 0, color: '#F59E0B' },
    { name: 'Off Track', value: statusCounts['off-track'] || 0, color: '#EF4444' },
    { name: 'Completed', value: statusCounts['completed'] || 0, color: '#3B82F6' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          {currentUser.role === 'super-admin' ? 'Company Overview' : 'My Progress Overview'}
        </h2>
        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
          Viewing {totalOKRs} Objectives
        </span>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">Total Objectives</p>
            <h3 className="text-3xl font-bold text-gray-900">{totalOKRs}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-md text-xs font-semibold">
              <span className="text-gray-400 font-normal">Active Cycle</span>
            </span>
            <div className="h-10 w-2 bg-blue-500 rounded-full opacity-80 h-16 mb-[-1.5rem]"></div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">Avg Progress</p>
            <h3 className="text-3xl font-bold text-gray-900">{avgProgress}%</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
             <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md text-xs font-semibold">
              <span className="text-gray-400 font-normal">Target: 80%</span>
            </span>
            <div className="h-10 w-2 bg-green-500 rounded-full opacity-80 h-16 mb-[-1.5rem]"></div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">At Risk / Off Track</p>
            <h3 className="text-3xl font-bold text-gray-900">{atRisk}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
             <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-md text-xs font-semibold">
              <span className="text-gray-400 font-normal">Needs Attention</span>
            </span>
             <div className="h-10 w-2 bg-purple-500 rounded-full opacity-80 h-16 mb-[-1.5rem]"></div>
          </div>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-1">Completed OKRs</p>
            <h3 className="text-3xl font-bold text-gray-900">{completed}</h3>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md text-xs font-semibold">
              <span className="text-gray-400 font-normal">Q1 Goals</span>
            </span>
            <div className="h-10 w-2 bg-amber-400 rounded-full opacity-80 h-16 mb-[-1.5rem]"></div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart */}
        <div className="lg:col-span-2">
          <Card title="Objective Progress" className="h-full">
            <div className="flex items-center gap-4 mb-6 text-sm">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-100"></span>
                    <span className="text-gray-500">Target</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-gray-500">Achieved</span>
                </div>
                 <select className="ml-auto bg-gray-50 border-none text-xs rounded-lg px-2 py-1 text-gray-500 focus:outline-none">
                  <option>Yearly</option>
                  <option>Quarterly</option>
                </select>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CHART_DATA} barSize={45} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="target" stackId="a" fill="#EBF5FF" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="achieved" stackId="b" fill="#3B82F6" radius={[10, 10, 10, 10]}>
                    {CHART_DATA.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={index === 2 || index === 3 ? '#3B82F6' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Donut Chart */}
        <div className="lg:col-span-1">
          <Card title="Status Distribution" className="h-full">
             <div className="flex justify-end mb-4">
               <select className="bg-gray-50 border-none text-xs rounded-lg px-2 py-1 text-gray-500 focus:outline-none">
                  <option>This week</option>
                </select>
             </div>
             {totalOKRs === 0 ? (
               <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
             ) : (
              <>
                <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dynamicDistribution}
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                      >
                        {dynamicDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-gray-400 text-xs">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{totalOKRs}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                    {dynamicDistribution.map((status) => (
                        <div key={status.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{backgroundColor: status.color}}></span>
                                <span className="text-gray-500">{status.name}</span>
                            </div>
                            <span className="font-medium">{Math.round((status.value / totalOKRs) * 100)}%</span>
                        </div>
                    ))}
                </div>
              </>
             )}
          </Card>
        </div>
      </div>

      {/* Bottom Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Updates" className="h-full">
             <div className="space-y-6">
                 {[1,2,3].map((_, i) => (
                     <div key={i} className="flex items-center gap-4">
                         <div className={`p-3 rounded-2xl ${i===0 ? 'bg-blue-100 text-blue-500' : i===1 ? 'bg-amber-100 text-amber-500' : 'bg-green-100 text-green-500'}`}>
                             {i===0 ? ICONS.Target : i===1 ? ICONS.TrendingUp : ICONS.Check}
                         </div>
                         <div className="flex-1">
                             <h4 className="text-sm font-bold text-gray-900">
                                 {i===0 ? "Q1 Sales Target Updated" : i===1 ? "User Growth Metric" : "Beta Launch Complete"}
                             </h4>
                             <p className="text-xs text-gray-400 mt-0.5">15 minutes ago</p>
                         </div>
                         <div className="text-right">
                             <p className="text-sm font-bold text-gray-900">${240 + i*150}</p>
                         </div>
                     </div>
                 ))}
             </div>
        </Card>

        <Card title="Team Performance" className="h-full">
             <div className="space-y-6">
                  {['Sales Team', 'Product Team', 'Engineering'].map((team, i) => (
                     <div key={i} className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg">
                            {i === 0 ? '🚀' : i === 1 ? '🎨' : '💻'}
                         </div>
                         <div className="flex-1">
                             <h4 className="text-sm font-bold text-gray-900">{team}</h4>
                             <p className="text-xs text-gray-400 mt-0.5">{8 - i} active objectives</p>
                         </div>
                         <div className="w-24">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Progress</span>
                                <span className="font-bold">{90 - i*15}%</span>
                            </div>
                            <ProgressBar value={90 - i*15} height="h-1.5" color={i===0 ? 'bg-green-500' : i===1 ? 'bg-blue-500' : 'bg-amber-400'} />
                         </div>
                     </div>
                  ))}
             </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;