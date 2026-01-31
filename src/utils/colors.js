// src/utils/colors.js
export const CHART_COLORS = ['#1A73E8', '#9333EA', '#F59E0B', '#10B981', '#EF4444', '#6366F1', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316'];
export const getColor = (index) => CHART_COLORS[index % CHART_COLORS.length];
