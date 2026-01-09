import React from 'react';

export type Status = 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'draft' | 'approved';
export type Confidence = 'high' | 'medium' | 'low';
export type MetricType = 'percentage' | 'number' | 'currency' | 'boolean';
export type ViewMode = 'dashboard' | 'okrs' | 'team' | 'reports' | 'settings' | 'admin' | 'superadmin' | 'profile' | 'billing';
export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'active';
export type OKRLevel = 'company' | 'department' | 'team' | 'individual';

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
  ownerName?: string;
  level: OKRLevel;
  period: string; // e.g. "Q1 2026"
  status: Status;
  progress: number;
  keyResults: KeyResult[];
  dueDate: string;
  createdAt?: string;
  updatedAt?: string;
  // Hierarchy fields
  parentObjectiveId?: string | null;
  parentObjectiveTitle?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  childrenCount?: number;
  children?: Objective[];
  ancestors?: { id: string; title: string; level: OKRLevel }[];
  // Approval workflow
  approvalStatus?: ApprovalStatus;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
}

export interface ParentObjective {
  id: string;
  title: string;
  level: OKRLevel;
  period: string;
  status: Status;
  progress: number;
  ownerName: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon?: React.ReactNode;
  colorClass?: string;
}