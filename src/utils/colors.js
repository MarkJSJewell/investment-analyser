// A consistent palette for the entire app
export const CHART_COLORS = [
  '#1A73E8', // Blue
  '#9333EA', // Purple
  '#F59E0B', // Amber/Orange
  '#10B981', // Emerald/Green
  '#EF4444', // Red
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F97316'  // Orange
];

export const getColor = (index) => CHART_COLORS[index % CHART_COLORS.length];
