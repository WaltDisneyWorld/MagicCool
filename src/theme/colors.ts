export const colors = {
  bg: '#0B1026',
  bgElevated: '#141A33',
  card: '#1B2244',
  cardBorder: '#2A3461',
  primary: '#6C8CFF',
  primaryDark: '#4B6BE0',
  accent: '#FFC857',
  success: '#3DD68C',
  danger: '#FF6B6B',
  warning: '#FFB13C',
  text: '#F5F7FF',
  textMuted: '#9AA4C7',
  textFaint: '#5E6890',
  overlay: 'rgba(5, 8, 20, 0.7)',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export type StatusTone = 'success' | 'danger' | 'warning' | 'muted' | 'primary';

export const toneColor: Record<StatusTone, string> = {
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
  muted: colors.textMuted,
  primary: colors.primary,
};
