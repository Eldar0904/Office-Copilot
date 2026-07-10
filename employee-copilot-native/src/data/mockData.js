// Mock data — mirrors shared/data.js shape
// Will be replaced by Supabase API calls later

export const CURRENT_USER = {
  id: 'u1',
  name: 'Sara Ahmed',
  initials: 'SA',
  role: 'Product Manager',
  dept: 'PMO',
};

export const TASKS = [
  { id: 1,  title: 'Review Q3 KPI report',         dept: 'PMO',       priority: 'high',   due: 'Today',     done: false },
  { id: 2,  title: 'Send budget approval to CFO',   dept: 'Finance',   priority: 'high',   due: 'Today',     done: false },
  { id: 3,  title: 'Update project timeline',       dept: 'PMO',       priority: 'medium', due: 'Tomorrow',  done: false },
  { id: 4,  title: 'Team standup notes',            dept: 'PMO',       priority: 'medium', due: 'Today',     done: true  },
  { id: 5,  title: 'Reply to HR on policy draft',   dept: 'HR',        priority: 'low',    due: 'Fri',       done: false },
  { id: 6,  title: 'Vendor contract review',        dept: 'Legal',     priority: 'high',   due: 'Today',     done: false },
  { id: 7,  title: 'Prepare board slides',          dept: 'PMO',       priority: 'medium', due: 'Mon',       done: false },
  { id: 8,  title: 'Onboarding checklist for Ali',  dept: 'HR',        priority: 'low',    due: 'Next week', done: false },
];

export const CHANNELS = [
  { id: 'c1', name: 'PMO',      initials: 'PM', color: '#0b5389', unread: 3,  lastMsg: 'Sara: Updated timeline attached' },
  { id: 'c2', name: 'Finance',  initials: 'FI', color: '#34c759', unread: 0,  lastMsg: 'Budget approved ✓' },
  { id: 'c3', name: 'HR',       initials: 'HR', color: '#c97559', unread: 1,  lastMsg: 'New policy draft shared' },
  { id: 'c4', name: 'Legal',    initials: 'LE', color: '#6b4fbb', unread: 0,  lastMsg: 'Contract sent for review' },
];

export const DMS = [
  { id: 'd1', name: 'Amir K.',   initials: 'AK', online: true,  unread: 2,  lastMsg: 'Can you check the report?' },
  { id: 'd2', name: 'Lena M.',   initials: 'LM', online: false, unread: 0,  lastMsg: 'Thanks!' },
  { id: 'd3', name: 'Omar R.',   initials: 'OR', online: true,  unread: 0,  lastMsg: 'Meeting at 3pm confirmed' },
];

export const PRIORITY_COLORS = {
  high:   '#ff3b30',
  medium: '#ff9500',
  low:    '#34c759',
};

export const PRIORITY_BG = {
  high:   '#fff0ef',
  medium: '#fff7ed',
  low:    '#edfff2',
};
