export type TabKey =
  | 'dashboard'
  | 'registration'
  | 'management'
  | 'issues'
  | 'forecast'
  | 'sample'
  | 'part'
  | 'mold'
  | 'shipment'
  | 'users'
  | 'settings';

export const TAB_KEYS: TabKey[] = [
  'dashboard',
  'registration',
  'management',
  'issues',
  'forecast',
  'sample',
  'part',
  'mold',
  'shipment',
  'users',
  'settings'
];

const BASE_TABS: TabKey[] = [
  'dashboard',
  'registration',
  'management',
  'issues',
  'forecast',
  'sample',
  'part',
  'mold',
  'shipment'
];

export const getDefaultTabPermissions = (user: { role: string; id?: string }) => {
  const isManager = user.role === 'MANAGER' || user.role?.includes('총괄');
  if (isManager) return [...BASE_TABS, 'users', 'settings'];
  if (user.id === 'dv linh') return [...BASE_TABS, 'users'];
  return [...BASE_TABS];
};

export const getTabDefinitions = (t: any) => [
  { key: 'dashboard' as TabKey, label: t.app.sidebar.dashboard },
  { key: 'registration' as TabKey, label: t.app.sidebar.newProject },
  { key: 'management' as TabKey, label: t.app.sidebar.gateManagement },
  { key: 'issues' as TabKey, label: t.app.sidebar.issueTracker },
  { key: 'forecast' as TabKey, label: t.app.sidebar.forecast },
  { key: 'sample' as TabKey, label: t.app.sidebar.sample },
  { key: 'part' as TabKey, label: t.app.sidebar.part },
  { key: 'mold' as TabKey, label: t.app.sidebar.mold },
  { key: 'shipment' as TabKey, label: t.app.sidebar.shipment },
  { key: 'users' as TabKey, label: t.app.sidebar.userManagement },
  { key: 'settings' as TabKey, label: t.app.sidebar.settings }
];

export const getTabLabel = (t: any, key: TabKey): string => {
  switch (key) {
    case 'dashboard':
      return t.app.sidebar.dashboard;
    case 'registration':
      return t.app.sidebar.newProject;
    case 'management':
      return t.app.sidebar.gateManagement;
    case 'issues':
      return t.app.sidebar.issueTracker;
    case 'forecast':
      return t.app.sidebar.forecast;
    case 'sample':
      return t.app.sidebar.sample;
    case 'part':
      return t.app.sidebar.part;
    case 'mold':
      return t.app.sidebar.mold;
    case 'shipment':
      return t.app.sidebar.shipment;
    case 'users':
      return t.app.sidebar.userManagement;
    case 'settings':
      return t.app.sidebar.settings;
    default:
      return String(key);
  }
};

