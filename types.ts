import React from 'react';

export type Status = 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'draft';
export type Confidence = 'high' | 'medium' | 'low';
export type MetricType = 'percentage' | 'number' | 'currency' | 'boolean';
export type ViewMode = 'dashboard' | 'okrs' | 'team' | 'reports' | 'settings' | 'admin' | 'profile';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface KeyResult {
  id: string;
  description: string;
  metricType: MetricType;
  startValue: number;
  targetValue: number;
  currentValue: number;
  unit?: string;
  status: Status;
  confidence: Confidence;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  level: 'company' | 'department' | 'team' | 'individual';
  period: string; // e.g. "Q1 2026"
  status: Status;
  progress: number;
  keyResults: KeyResult[];
  dueDate: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon?: React.ReactNode;
  colorClass?: string;
}