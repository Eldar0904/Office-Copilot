/* Employee Copilot — shared mock data & persistence layer.
   Loaded by BOTH the mobile PWA (employee-copilot-pwa/) and the desktop
   web app (employee-copilot-web/) so they read/write the exact same
   localStorage key/schema and never drift apart on task IDs or content.
   Expose everything as window.CopilotData; consumers should not mutate
   the arrays/objects returned here directly. */
(function () {
  'use strict';

  /* ───────────────────────── constants ───────────────────────── */

  var DC = { Finance: '#0b5389', Engineering: '#5856d6', HR: '#c97559', PMO: '#2E8B57', Sales: '#ff9500', Design: '#af52de', IT: '#636366' };
  var PC = { high: '#ef4635', medium: '#ff9500', low: '#34c759' };
  var PL = { high: '#fdecea', medium: '#fff3e0', low: '#e8f8ee' };

  var STORAGE_KEY = 'employeeCopilot.v1';

  /* ───────────────────────── mock data ───────────────────────── */
  /* `day` is relative to the Monday of the current week: 0=Mon ... 6=Sun */

  var TASKS_BASE = [
    { id: 1, title: 'Review Q3 budget report', dept: 'Finance', dueTime: '10:00 AM', priority: 'high', day: 0 },
    { id: 2, title: 'Team standup - Engineering', dept: 'Engineering', dueTime: '11:30 AM', priority: 'medium', day: 0 },
    { id: 3, title: 'Reply to HR onboarding memo', dept: 'HR', dueTime: '2:00 PM', priority: 'medium', day: 0 },
    { id: 4, title: 'Update project timeline slides', dept: 'PMO', dueTime: '4:00 PM', priority: 'low', day: 0 },
    { id: 5, title: 'Client call - Acme Corp', dept: 'Sales', dueTime: '5:00 PM', priority: 'high', day: 0 },
    { id: 6, title: 'Sprint planning session', dept: 'Engineering', dueTime: '9:00 AM', priority: 'high', day: 1 },
    { id: 7, title: 'Design review with UX team', dept: 'Design', dueTime: '2:00 PM', priority: 'medium', day: 1 },
    { id: 8, title: 'Vendor contract approval', dept: 'Finance', dueTime: '11:00 AM', priority: 'high', day: 2 },
    { id: 9, title: 'Monthly all-hands prep', dept: 'PMO', dueTime: '3:00 PM', priority: 'medium', day: 2 },
    { id: 10, title: 'Performance review kick-off', dept: 'HR', dueTime: '10:00 AM', priority: 'high', day: 3 },
    { id: 11, title: 'Product roadmap presentation', dept: 'PMO', dueTime: '1:00 PM', priority: 'high', day: 4 },
    { id: 12, title: 'IT security training', dept: 'IT', dueTime: '9:00 AM', priority: 'low', day: 5 }
  ];

  var CHANNELS = [
    { id: 'ch1', name: '#general', emoji: '📢', bgColor: '#e2f6fd', lastMsg: 'All-hands this Friday at 3pm - mark your calendars!', time: '9:14', unread: 3 },
    { id: 'ch2', name: '#engineering', emoji: '⚙', bgColor: '#ede9ff', lastMsg: 'PR review needed on the auth module today', time: '9:45', unread: 5 },
    { id: 'ch3', name: '#finance', emoji: '📊', bgColor: '#e6f0ff', lastMsg: 'Q3 budget reports due by EOD today', time: '8:30', unread: 1 },
    { id: 'ch4', name: '#hr', emoji: '👥', bgColor: '#fef0ec', lastMsg: 'New onboarding materials are ready for review', time: 'Tue', unread: 0 },
    { id: 'ch5', name: '#pmo', emoji: '📋', bgColor: '#e8f8ee', lastMsg: 'Project status update posted to the shared drive', time: 'Tue', unread: 0 }
  ];

  var DMS = [
    { id: 'dm1', name: 'Khalid Al-Rashid', initials: 'KA', avatarBg: '#0b5389', lastMsg: 'Did you review the Q3 deck?', time: '10:02', unread: 2, online: true, role: 'Engineering Manager' },
    { id: 'dm2', name: 'Layla Hassan', initials: 'LH', avatarBg: '#af52de', lastMsg: 'Can you join the design call at 2pm?', time: '9:55', unread: 1, online: true, role: 'UX Designer' },
    { id: 'dm3', name: 'Omar Yousef', initials: 'OY', avatarBg: '#c97559', lastMsg: 'Thanks for the quick reply!', time: '9:20', unread: 0, online: false, role: 'Finance Lead' },
    { id: 'dm4', name: 'Rania Saleh', initials: 'RS', avatarBg: '#5856d6', lastMsg: 'The vendor proposal looks good.', time: 'Tue', unread: 0, online: false, role: 'HR Business Partner' }
  ];

  var CHAT = {
    ch1: [
      { id: 1, sender: 'Tariq Musa', initials: 'TM', avatarBg: '#34c759', text: 'Good morning! All-hands Friday 3pm.', mine: false, time: '9:14 AM' },
      { id: 2, sender: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', text: 'Added! Will there be a recording?', mine: true, time: '9:18 AM' },
      { id: 3, sender: 'Tariq Musa', initials: 'TM', avatarBg: '#34c759', text: 'Yes, posted to the drive after.', mine: false, time: '9:22 AM' }
    ],
    ch2: [
      { id: 1, sender: 'Jad Malik', initials: 'JM', avatarBg: '#5856d6', text: 'PR review needed - auth module.', mine: false, time: '9:14 AM' },
      { id: 2, sender: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', text: 'On it after standup!', mine: true, time: '9:32 AM' },
      { id: 3, sender: 'Nour Kassab', initials: 'NK', avatarBg: '#ff9500', text: 'Left comments already, Jad.', mine: false, time: '9:45 AM' },
      { id: 4, sender: 'Jad Malik', initials: 'JM', avatarBg: '#5856d6', text: 'Thanks both! Addressing by noon.', mine: false, time: '10:01 AM' },
      { id: 5, sender: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', text: 'Changes look great - approved!', mine: true, time: '11:48 AM' }
    ],
    ch3: [
      { id: 1, sender: 'Omar Yousef', initials: 'OY', avatarBg: '#c97559', text: 'Q3 budget reports due EOD today.', mine: false, time: '8:30 AM' },
      { id: 2, sender: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', text: 'PMO report submitted.', mine: true, time: '8:45 AM' }
    ],
    ch4: [
      { id: 1, sender: 'Rania Saleh', initials: 'RS', avatarBg: '#5856d6', text: 'New onboarding materials ready. Feedback due Thursday.', mine: false, time: 'Tue' }
    ],
    ch5: [
      { id: 1, sender: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', text: 'Status update posted. All milestones on track.', mine: true, time: 'Tue' },
      { id: 2, sender: 'Khalid Al-Rashid', initials: 'KA', avatarBg: '#0b5389', text: 'Great work! Sprint ahead of schedule.', mine: false, time: 'Tue' }
    ],
    dm1: [
      { id: 1, sender: 'Khalid Al-Rashid', initials: 'KA', avatarBg: '#0b5389', text: 'Morning! Quick sprint timeline update?', mine: false, time: '8:45 AM' },
      { id: 2, sender: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', text: 'On track. Deck ready by EOD.', mine: true, time: '9:01 AM' },
      { id: 3, sender: 'Khalid Al-Rashid', initials: 'KA', avatarBg: '#0b5389', text: 'Did you review the Q3 deck?', mine: false, time: '10:02 AM' }
    ],
    dm2: [
      { id: 1, sender: 'Layla Hassan', initials: 'LH', avatarBg: '#af52de', text: 'Sharing new onboarding flow for review.', mine: false, time: '9:30 AM' },
      { id: 2, sender: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', text: 'Love the new navigation! Much cleaner.', mine: true, time: '9:38 AM' },
      { id: 3, sender: 'Layla Hassan', initials: 'LH', avatarBg: '#af52de', text: 'Can you join the design call at 2pm?', mine: false, time: '9:55 AM' }
    ],
    dm3: [
      { id: 1, sender: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', text: 'Budget submitted. Let me know if needed.', mine: true, time: '9:15 AM' },
      { id: 2, sender: 'Omar Yousef', initials: 'OY', avatarBg: '#c97559', text: 'Thanks for the quick reply!', mine: false, time: '9:20 AM' }
    ],
    dm4: [
      { id: 1, sender: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', text: 'Reviewed the vendor proposal - looks solid.', mine: true, time: 'Tue' },
      { id: 2, sender: 'Rania Saleh', initials: 'RS', avatarBg: '#5856d6', text: 'The vendor proposal looks good.', mine: false, time: 'Tue' }
    ]
  };

  /* Pre-seeded thread replies. Key = chatId + ':' + msgId */
  var THREADS_BASE = {
    'ch1:1': [
      { id: 101, sender: 'Layla Hassan',     initials: 'LH', avatarBg: '#af52de', text: 'Will there be a dial-in link for remote folks?',        mine: false, time: '9:16 AM' },
      { id: 102, sender: 'Tariq Musa',       initials: 'TM', avatarBg: '#34c759', text: 'Yes — Zoom link going out in 15 min.',                    mine: false, time: '9:19 AM' },
      { id: 103, sender: 'Sara Ahmed',       initials: 'SA', avatarBg: '#c97559', text: 'Perfect, thanks Tariq!',                                  mine: true,  time: '9:21 AM' }
    ],
    'ch2:1': [
      { id: 201, sender: 'Nour Kassab',      initials: 'NK', avatarBg: '#ff9500', text: 'Which branch should I pull from?',                        mine: false, time: '9:15 AM' },
      { id: 202, sender: 'Jad Malik',        initials: 'JM', avatarBg: '#5856d6', text: 'feature/auth-refactor — has all the latest commits.',     mine: false, time: '9:17 AM' }
    ],
    'ch5:1': [
      { id: 501, sender: 'Khalid Al-Rashid', initials: 'KA', avatarBg: '#0b5389', text: 'Which milestone is at risk?',                             mine: false, time: 'Tue'    },
      { id: 502, sender: 'Sara Ahmed',       initials: 'SA', avatarBg: '#c97559', text: "None currently — we're 2 days ahead on Phase 2.",         mine: true,  time: 'Tue'    }
    ]
  };

  var PSETTINGS = [
    { icon: '🔔', label: 'Notifications', iconBg: '#e2f6fd' },
    { icon: '🔐', label: 'Privacy & Security', iconBg: '#fef0ec' },
    { icon: '🎨', label: 'Appearance', iconBg: '#ede9ff' },
    { icon: '❓', label: 'Help & Support', iconBg: '#e8f8ee' }
  ];

  /* current signed-in demo persona — shared so both UIs agree */
  var ME = { name: 'Sara Ahmed', initials: 'SA', avatarBg: '#c97559', role: 'Product Manager', dept: 'PMO', status: 'Available' };

  /* ───────────────────────── dynamic week / dates ───────────────────────── */

  function startOfWeek(d) {
    var date = new Date(d);
    var diff = (date.getDay() + 6) % 7; // Mon=0 ... Sun=6
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  var TODAY = new Date();
  var WEEK_START = startOfWeek(TODAY);
  var TODAY_INDEX = (TODAY.getDay() + 6) % 7;

  var DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  var WEEKDAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var WDAYS = [];
  for (var i = 0; i < 7; i++) {
    var d = new Date(WEEK_START);
    d.setDate(d.getDate() + i);
    WDAYS.push({
      day: i,
      label: DAY_LETTERS[i],
      num: String(d.getDate()),
      fullLabel: WEEKDAY_FULL[i] + ', ' + MONTH_FULL[d.getMonth()] + ' ' + d.getDate(),
      shortLabel: WEEKDAY_FULL[i].slice(0, 3) + ' ' + d.getDate()
    });
  }

  function fmtRange() {
    var end = new Date(WEEK_START);
    end.setDate(end.getDate() + 6);
    var sameMonth = end.getMonth() === WEEK_START.getMonth();
    var startStr = MONTH_FULL[WEEK_START.getMonth()].slice(0, 3) + ' ' + WEEK_START.getDate();
    var endStr = (sameMonth ? '' : MONTH_FULL[end.getMonth()].slice(0, 3) + ' ') + end.getDate();
    return startStr + ' – ' + endStr;
  }

  /* ───────────────────────── helpers ───────────────────────── */

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Pure: derives display fields for a task given the shared completedTasks map. */
  function enrichTask(t, completedTasks) {
    var done = !!(completedTasks || {})[t.id];
    return Object.assign({}, t, {
      completed: done,
      priorityColor: done ? '#e0e4e8' : (PC[t.priority] || '#dedede'),
      titleColor: done ? '#b0bcc2' : '#223035',
      deptColor: DC[t.dept] || '#4f5158',
      isAIPriority: t.id === 1 && !done
    });
  }

  /* ───────────────────────── shared persistence ─────────────────────────
     Both apps read/write the exact same localStorage key & shape:
     { completedTasks, extraTasks, nextId, activeTab } */

  function loadPersisted() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') return saved;
    } catch (e) { /* ignore corrupt storage */ }
    return null;
  }

  function persist(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* storage may be unavailable (private mode, quota) */ }
  }

  /* ───────────────────────── export ───────────────────────── */

  window.CopilotData = {
    DC: DC, PC: PC, PL: PL,
    STORAGE_KEY: STORAGE_KEY,
    TASKS_BASE: TASKS_BASE, CHANNELS: CHANNELS, DMS: DMS, CHAT: CHAT, THREADS_BASE: THREADS_BASE, PSETTINGS: PSETTINGS,
    ME: ME,
    TODAY: TODAY, WEEK_START: WEEK_START, TODAY_INDEX: TODAY_INDEX,
    DAY_LETTERS: DAY_LETTERS, WEEKDAY_FULL: WEEKDAY_FULL, MONTH_FULL: MONTH_FULL, WDAYS: WDAYS,
    fmtRange: fmtRange,
    esc: esc,
    enrichTask: enrichTask,
    loadPersisted: loadPersisted,
    persist: persist
  };
})();
