export interface SkillAreaPerformance {
  skillArea: string;
  score: number;
  basis: string;
}

export interface ImprovementArea {
  title: string;
  reason: string;
}

export interface ActivityHistoryItem {
  id: string;
  title: string;
  category: string;
  completedAt: string;
}

export interface TrendPoint {
  label: string;
  value: number;
}

export interface StudentProgressData {
  readiness: { score: number; basis: string } | null;
  skillAreas: SkillAreaPerformance[];
  activityHistory: ActivityHistoryItem[];
  improvementAreas: ImprovementArea[];
  trend: TrendPoint[] | null;
}
