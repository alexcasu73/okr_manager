import { Objective, User } from './types';

export const USERS: User[] = [
  {
    id: 'admin-1',
    name: 'Marco Rossi',
    avatar: 'https://i.pravatar.cc/150?u=admin',
    role: 'super-admin'
  },
  {
    id: 'user-1',
    name: 'Laura Bianchi',
    avatar: 'https://i.pravatar.cc/150?u=laura',
    role: 'product-manager'
  },
  {
    id: 'user-2',
    name: 'Alessandro Verdi',
    avatar: 'https://i.pravatar.cc/150?u=alessandro',
    role: 'developer'
  }
];

export const MOCK_OBJECTIVES: Objective[] = [
  {
    id: 'obj-1',
    title: 'Increase Market Share in Europe',
    description: 'Expand our footprint in DACH and Benelux regions.',
    ownerId: 'admin-1',
    level: 'company',
    period: 'Q1 2026',
    status: 'on-track',
    progress: 78,
    dueDate: '2026-03-31',
    keyResults: [
      {
        id: 'kr-1',
        description: 'Achieve $2M ARR from new region',
        metricType: 'currency',
        startValue: 0,
        targetValue: 2000000,
        currentValue: 1560000,
        unit: '$',
        status: 'on-track',
        confidence: 'high'
      },
      {
        id: 'kr-2',
        description: 'Hire 5 sales representatives in Berlin',
        metricType: 'number',
        startValue: 0,
        targetValue: 5,
        currentValue: 3,
        status: 'at-risk',
        confidence: 'medium'
      }
    ]
  },
  {
    id: 'obj-2',
    title: 'Improve Customer Satisfaction',
    description: 'Focus on support response times and product quality.',
    ownerId: 'user-1',
    level: 'department',
    period: 'Q1 2026',
    status: 'at-risk',
    progress: 45,
    dueDate: '2026-03-31',
    keyResults: [
      {
        id: 'kr-3',
        description: 'Reduce average ticket response time to 2h',
        metricType: 'number',
        startValue: 8,
        targetValue: 2,
        currentValue: 5,
        unit: 'h',
        status: 'at-risk',
        confidence: 'medium'
      },
      {
        id: 'kr-4',
        description: 'Increase NPS score to 60',
        metricType: 'number',
        startValue: 40,
        targetValue: 60,
        currentValue: 45,
        status: 'off-track',
        confidence: 'low'
      }
    ]
  },
  {
    id: 'obj-3',
    title: 'Launch Mobile App V2',
    description: 'Complete overhaul of the mobile experience.',
    ownerId: 'user-2',
    level: 'team',
    period: 'Q1 2026',
    status: 'completed',
    progress: 100,
    dueDate: '2026-02-15',
    keyResults: [
      {
        id: 'kr-5',
        description: 'Complete beta testing with 100 users',
        metricType: 'number',
        startValue: 0,
        targetValue: 100,
        currentValue: 100,
        status: 'completed',
        confidence: 'high'
      }
    ]
  },
  {
    id: 'obj-4',
    title: 'Optimize Infrastructure Costs',
    description: 'Reduce monthly AWS spend by 15%.',
    ownerId: 'user-1',
    level: 'department',
    period: 'Q1 2026',
    status: 'on-track',
    progress: 60,
    dueDate: '2026-03-31',
    keyResults: []
  },
  {
    id: 'obj-5',
    title: 'Refactor Legacy Auth Service',
    description: 'Migrate to OAuth2 provider.',
    ownerId: 'user-2',
    level: 'individual',
    period: 'Q1 2026',
    status: 'on-track',
    progress: 30,
    dueDate: '2026-03-15',
    keyResults: []
  }
];

export const CHART_DATA = [
  { name: 'Jan', achieved: 40, target: 60 },
  { name: 'Feb', achieved: 55, target: 70 },
  { name: 'Mar', achieved: 75, target: 80 },
  { name: 'Apr', achieved: 60, target: 75 },
  { name: 'May', achieved: 85, target: 90 },
  { name: 'Jun', achieved: 70, target: 85 },
];

// We will calculate Status Distribution dynamically in the component now
export const STATUS_DISTRIBUTION = [
  { name: 'On Track', value: 14, color: '#10B981' },
  { name: 'At Risk', value: 5, color: '#F59E0B' },
  { name: 'Off Track', value: 3, color: '#EF4444' },
  { name: 'Completed', value: 8, color: '#3B82F6' },
];