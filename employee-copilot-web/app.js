(function () {
  'use strict';

  /* ───────────────────────── shared data module ─────────────────────────
     Mock data, color maps, date helpers and persistence all live in
     ../shared/data.js so this web app and the mobile PWA never drift
     apart on task IDs/content and always read/write the same
     localStorage key (CopilotData.STORAGE_KEY = 'employeeCopilot.v1'). */

  var CD = window.CopilotData;
  var CI = window.CopilotI18n;

  /* register re-render hook for lang switcher */
  window.copilotRerender = function () { render(); };

  var DC = CD.DC, PC = CD.PC, PL = CD.PL;
  var TASKS_BASE = CD.TASKS_BASE, CHANNELS = CD.CHANNELS, DMS = CD.DMS, CHAT = CD.CHAT, THREADS_BASE = CD.THREADS_BASE, PSETTINGS = CD.PSETTINGS;
  var TODAY = CD.TODAY, TODAY_INDEX = CD.TODAY_INDEX, WDAYS = CD.WDAYS;
  var WEEKDAY_FULL = CD.WEEKDAY_FULL, MONTH_FULL = CD.MONTH_FULL;
  var fmtRange = CD.fmtRange;
  var esc = CD.esc;
  var ME = CD.ME;

  /* ───────────────────────── state ───────────────────────── */

  var state = {
    activeView: 'today',       // 'today' | 'week'
    activeChat: null,
    activeTask: null,
    completedTasks: {},
    extraTasks: [],
    nextId: 13,
    showQuickAdd: false,
    chatMessages: {},          // keyed by chat id, overlays on top of CHAT base data
    threadMessages: {},        // keyed by chatId:msgId, array of thread replies
    activeThread: null,        // { key, chatId, msgId, msg } | null
    filterPriority: {},        // set of active priorities: { high: true, medium: true, low: true }
    filterDept: null,          // dept string | null
    isRecording: false,
    recSeconds: 0,
    showAIPanel: false,

    stagedFiles: [],   // [{name,size,type,dataUrl}]

    aiDraftText: '',
    extraChannels: [],        // user-created channels
    editingMsg: null,         // { chatId, msgId } | null
    showCreateChannel: false,
    notifications: []         // [{id, title, body, chatId, time}]
  };

  /* ───────────────────────── voice recording ───────────────────────── */

  var recInterval = null;

  function startRecording() {
    state.isRecording = true;
    state.recSeconds  = 0;
    updateVoiceUI();
    recInterval = setInterval(function () {
      state.recSeconds++;
      var t = document.getElementById('recTimer');
      if (t) t.textContent = Math.floor(state.recSeconds / 60) + ':' + ('0' + (state.recSeconds % 60)).slice(-2);
      animateWave();
    }, 1000);
  }

  function stopRecording(send) {
    clearInterval(recInterval);
    recInterval = null;
    var dur = state.recSeconds;
    state.isRecording = false;
    state.recSeconds  = 0;
    updateVoiceUI();
    if (send && state.activeChat && dur > 0) {
      var voiceMsg = {
        id: Date.now(),
        sender: ME.name,
        initials: ME.initials,
        avatarBg: ME.avatarBg,
        text: '',
        isVoice: true,
        voiceDuration: dur,
        mine: true,
        time: nowTime()
      };
      var existing = (state.chatMessages[state.activeChat.id] || []).slice();
      existing.push(voiceMsg);
      var updated = Object.assign({}, state.chatMessages);
      updated[state.activeChat.id] = existing;
      state.chatMessages = updated;
      refreshChatMessages(state.activeChat.id);
    }
  }

  function updateVoiceUI() {
    var composer = document.getElementById('chatComposer');
    var voiceBar = document.getElementById('voiceBar');
    var micBtn   = document.getElementById('micBtn');
    if (!composer || !voiceBar) return;
    if (state.isRecording) {
      composer.classList.add('recording');
      voiceBar.classList.remove('hidden');
      if (micBtn) micBtn.classList.add('active');
    } else {
      composer.classList.remove('recording');
      voiceBar.classList.add('hidden');
      if (micBtn) micBtn.classList.remove('active');
      var t = document.getElementById('recTimer');
      if (t) t.textContent = '0:00';
    }
  }

  function animateWave() {
    var bars = document.querySelectorAll('.wave-bar');
    bars.forEach(function (b) {
      b.style.height = (Math.floor(Math.random() * 14) + 4) + 'px';
    });
  }

  function fmtVoiceDur(s) {
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function loadPersisted() {
    var saved = CD.loadPersisted();
    if (saved) {
      state.completedTasks = saved.completedTasks || {};
      state.extraTasks = saved.extraTasks || [];
      state.nextId = saved.nextId || 13;
      state.extraChannels = saved.extraChannels || [];
      if (saved.editedMessages) state.chatMessages = Object.assign({}, state.chatMessages, saved.editedMessages);
      if (saved.activeTab === 'today' || saved.activeTab === 'week') {
        state.activeView = saved.activeTab;
      }
    }
  }

  function persist() {
    CD.persist({
      completedTasks: state.completedTasks,
      extraTasks: state.extraTasks,
      nextId: state.nextId,
      activeTab: state.activeView,
      extraChannels: state.extraChannels,
      editedMessages: state.chatMessages
    });
  }

  function setState(patch) {
    Object.assign(state, patch);
    persist();
    render();
  }

  /* ───────────────────────── helpers ───────────────────────── */

  function allTasks() {
    return TASKS_BASE.concat(state.extraTasks);
  }

  function translateTask(t) {
    return Object.assign({}, t, { title: CI.taskTitle(t) });
  }

  function enrichTask(t) {
    return CD.enrichTask(t, state.completedTasks);
  }

  function toggleTask(id) {
    var ct = Object.assign({}, state.completedTasks);
    ct[id] = !ct[id];
    setState({ completedTasks: ct });
  }

  function addTaskFromInput() {
    var input = document.getElementById('quickAddInput');
    if (!input) return;
    var title = (input.value || '').trim();
    if (!title) return;
    var t = { id: state.nextId, title: title, dept: 'PMO', dueTime: 'Today', priority: 'medium', day: TODAY_INDEX };
    setState({
      extraTasks: state.extraTasks.concat([t]),
      nextId: state.nextId + 1,
      showQuickAdd: false
    });
  }

  /* ───────────────────────── markup builders ───────────────────────── */

  function checkHTML(completed) {
    return '<div class="task-check' + (completed ? ' done' : '') + '" data-action="toggleTask" data-id="ID_PLACEHOLDER">' +
      (completed ? '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5.5 10L11 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') +
      '</div>';
  }

  function taskRowHTML(t, opts) {
    var showPriorityBadge = opts && opts.showPriorityBadge;
    return (
      '<div class="task-row" data-action="openTaskDetail" data-id="' + t.id + '">' +
        '<div class="task-row-stripe" style="background:' + t.priorityColor + ';"></div>' +
        '<div class="task-check' + (t.completed ? ' done' : '') + '" data-action="toggleTask" data-id="' + t.id + '">' +
          (t.completed ? '<svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5.5 10L11 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') +
        '</div>' +
        '<div class="task-main">' +
          '<div class="task-title' + (t.completed ? ' done' : '') + '">' + esc(t.title) + '</div>' +
          '<div class="task-meta">' +
            '<div class="task-dept" style="background:' + t.deptColor + ';">' + esc(CI.dept(t.dept)) + '</div>' +
            '<div class="task-due">' + esc(t.dueTime) + '</div>' +
            (showPriorityBadge && t.isAIPriority ? '<div class="task-priority-badge">✦ Priority</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function weekChipHTML(t) {
    return (
      '<div class="week-task-chip" style="border-left-color:' + t.priorityColor + ';" data-action="openTaskDetail" data-id="' + t.id + '">' +
        '<div class="task-check' + (t.completed ? ' done' : '') + '" data-action="toggleTask" data-id="' + t.id + '">' +
          (t.completed ? '<svg width="9" height="9" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5.5 10L11 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '') +
        '</div>' +
        '<div class="chip-body">' +
          '<div class="chip-title' + (t.completed ? ' done' : '') + '">' + esc(t.title) + '</div>' +
          '<div class="chip-meta">' +
            '<div class="chip-dept" style="background:' + t.deptColor + ';">' + esc(CI.dept(t.dept)) + '</div>' +
            '<div class="chip-due">' + esc(t.dueTime) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ───────────────────────── sidebar ───────────────────────── */

  function renderSidebarNav() {
    var ct = state.completedTasks;
    var todayRaw = allTasks().filter(function (t) { return t.day === TODAY_INDEX; });
    var pending = todayRaw.filter(function (t) { return !ct[t.id]; }).length;

    var inChat = !!state.activeChat;
    ['today', 'week'].forEach(function (view) {
      var el = document.querySelector('.nav-item[data-view="' + view + '"]');
      el.classList.toggle('active', !inChat && state.activeView === view);
    });
    var badge = document.getElementById('todayNavBadge');
    badge.textContent = pending > 0 ? pending : '';
    badge.classList.toggle('hidden', pending === 0);
  }



  /* ─── Message edit / delete ─── */

  function editMessage(chatId, msgId, newText) {
    newText = (newText || '').trim();
    if (!newText) return;
    var msgs = getChatMsgs(chatId).map(function(m) {
      return m.id === msgId ? Object.assign({}, m, { text: newText, edited: true }) : m;
    });
    var updated = Object.assign({}, state.chatMessages);
    updated[chatId] = msgs;
    state.chatMessages = updated;
    state.editingMsg = null;
    persist();
    refreshChatMessages(chatId);
  }

  function deleteMessage(chatId, msgId) {
    var msgs = getChatMsgs(chatId).filter(function(m) { return m.id !== msgId; });
    var updated = Object.assign({}, state.chatMessages);
    updated[chatId] = msgs;
    state.chatMessages = updated;
    persist();
    refreshChatMessages(chatId);
  }

  /* ─── Notifications ─── */

  function initNotifications() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function pushNotification(title, body, chatId) {
    // In-app badge
    var note = { id: Date.now(), title: title, body: body, chatId: chatId, time: nowTime() };
    state.notifications.unshift(note);
    if (state.notifications.length > 20) state.notifications = state.notifications.slice(0, 20);
    updateNotifBadge();

    // Browser push
    if (window.Notification && Notification.permission === 'granted') {
      var n = new Notification(title, { body: body, icon: '../employee-copilot-pwa/icons/icon-192.png', tag: chatId });
      n.onclick = function() {
        window.focus();
        var ch = allChannels().filter(function(c){ return c.id === chatId; })[0];
        if (ch) setState({ activeChat: { id: ch.id, name: ch.name, sub: CI.t('dept_channel'), color: ch.bgColor, icon: ch.emoji, iconSize: '15px', radius: '9px', isChannel: true } });
        n.close();
      };
    }
  }

  function updateNotifBadge() {
    var badge = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = state.notifications.length;
      badge.classList.toggle('hidden', state.notifications.length === 0);
    }
  }

  function renderNotifPanel() {
    var panel = document.getElementById('notifPanel');
    if (!panel) return;
    var headerHTML = '<div class="notif-panel-head">' +
      '<span class="notif-panel-title">Notifications</span>' +
      (state.notifications.length ? '<button class="notif-clear-btn" data-action="clearNotifs">Clear all</button>' : '') +
    '</div>';
    if (!state.notifications.length) {
      panel.innerHTML = headerHTML + '<div class="notif-empty">No notifications yet</div>';
      return;
    }
    panel.innerHTML = headerHTML + state.notifications.map(function(n) {
      return '<div class="notif-item" data-action="goNotif" data-chat-id="' + n.chatId + '">' +
        '<div class="notif-title">' + esc(n.title) + '</div>' +
        '<div class="notif-body">' + esc(n.body) + '</div>' +
        '<div class="notif-time">' + esc(n.time) + '</div>' +
      '</div>';
    }).join('');
  }

  /* ─── Channel management ─── */

  function allChannels() {
    return CHANNELS.concat(state.extraChannels);
  }

  function createChannel(name, emoji) {
    name = (name || '').trim();
    if (!name) return;
    if (name[0] !== '#') name = '#' + name;
    var id = 'ch_' + Date.now();
    var colors = ['#e2f6fd','#ede9ff','#e6f0ff','#fef0ec','#e8f8ee','#fff3e0','#fdecea'];
    var bgColor = colors[state.extraChannels.length % colors.length];
    var ch = { id: id, name: name, emoji: emoji || '💬', bgColor: bgColor, lastMsg: '', time: '', unread: 0 };
    state.extraChannels = state.extraChannels.concat([ch]);
    state.showCreateChannel = false;
    persist();
    renderSidebarChannels();
    // Auto-open the new channel
    setState({ activeChat: { id: ch.id, name: ch.name, sub: CI.t('dept_channel'), color: ch.bgColor, icon: ch.emoji, iconSize: '15px', radius: '9px', isChannel: true } });
  }

  function renderSidebarChannels() {
    var allCh = CHANNELS.concat(state.extraChannels);
    document.getElementById('sidebarChannels').innerHTML =
      allCh.map(function (ch) {
        var active = state.activeChat && state.activeChat.id === ch.id;
        var unread = ch.unread || 0;
        return '<div class="channel-row' + (active ? ' active' : '') + '" data-action="openChat" data-chat-type="channel" data-chat-id="' + ch.id + '">' +
          '<span class="channel-emoji">' + (ch.emoji || '💬') + '</span>' +
          '<span class="row-label">' + esc(ch.name) + '</span>' +
          (unread > 0 ? '<span class="unread-pill">' + unread + '</span>' : '') +
        '</div>';
      }).join('') +
      '<div class="new-channel-btn" data-action="openCreateChannel">' +
        '<span style="font-size:16px;line-height:1;">+</span>' +
        '<span class="row-label" style="color:var(--text-muted)">Add channel</span>' +
      '</div>';
  }

  function renderSidebarDMs() {
    document.getElementById('sidebarDMs').innerHTML = DMS.map(function (dm) {
      var active = state.activeChat && state.activeChat.id === dm.id;
      return '<div class="dm-row' + (active ? ' active' : '') + '" data-action="openChat" data-chat-type="dm" data-chat-id="' + dm.id + '" data-unread="' + (dm.unread > 0) + '">' +
        '<span class="dm-avatar-mini" style="background:' + dm.avatarBg + ';">' + esc(dm.initials) +
          (dm.online ? '<span class="online-dot-mini"></span>' : '') +
        '</span>' +
        '<span class="row-label">' + esc(dm.name) + '</span>' +
        (dm.unread > 0 ? '<span class="unread-pill">' + dm.unread + '</span>' : '') +
      '</div>';
    }).join('');
  }

  function renderProfile() {
    var ct = state.completedTasks;
    var tasks = allTasks();
    var todayRaw = tasks.filter(function (t) { return t.day === TODAY_INDEX; });
    var doneToday = todayRaw.filter(function (t) { return ct[t.id]; }).length;
    var pendingToday = todayRaw.length - doneToday;
    var doneWeek = Object.keys(ct).filter(function (k) { return ct[k]; }).length;

    document.getElementById('profileAvatar').innerHTML = '<span class="status-dot"></span>' + esc(ME.initials);
    document.getElementById('profileAvatar').style.background = ME.avatarBg;
    document.getElementById('profileName').textContent = ME.name;
    document.getElementById('profileRole').textContent = ME.role + ' · ' + ME.dept;
    document.getElementById('statDone').textContent = doneToday;
    document.getElementById('statPending').textContent = pendingToday;
    document.getElementById('statWeek').textContent = doneWeek;

    document.getElementById('profileSettings').innerHTML = PSETTINGS.map(function (s) {
      return '<div class="profile-settings-icon" title="' + esc(s.label) + '">' + s.icon + '</div>';
    }).join('');
  }

  /* ───────────────────────── main content: today ───────────────────────── */

  function renderTodayContent() {
    var ct = state.completedTasks;
    var tasks = allTasks();
    var todayRaw = tasks.filter(function (t) { return t.day === TODAY_INDEX; });
    var completedCount = todayRaw.filter(function (t) { return ct[t.id]; }).length;
    var totalCount = todayRaw.length;
    var pendingCount = totalCount - completedCount;

    // Collect unique depts for filter chips
    var depts = [];
    todayRaw.forEach(function (t) { if (depts.indexOf(t.dept) === -1) depts.push(t.dept); });
    depts.sort();

    // Apply filters
    var fp = state.filterPriority, fd = state.filterDept;
    var anyPriority = Object.keys(fp).some(function (k) { return fp[k]; });
    var filtered = todayRaw.filter(function (t) {
      if (anyPriority && !fp[t.priority]) return false;
      if (fd && t.dept !== fd) return false;
      return true;
    });

    var incomplete = filtered.filter(function (t) { return !ct[t.id]; }).sort(function (a, b) {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return a.id - b.id;
    });
    var done = filtered.filter(function (t) { return ct[t.id]; });
    var todayTasks = incomplete.concat(done).map(function(t){ return enrichTask(translateTask(t)); });

    var nudgeText = pendingCount === 0
      ? 'All tasks done for today — great work!'
      : pendingCount + ' task' + (pendingCount === 1 ? '' : 's') + ' remaining. Start with the Finance report — highest impact first.';

    var hasFilter = anyPriority || fd;

    // Priority chips
    var priorityChips = [
      { key: 'high',   label: '🔴 High',   color: '#ef4635', bg: '#fdecea' },
      { key: 'medium', label: '🟠 Medium', color: '#ff9500', bg: '#fff3e0' },
      { key: 'low',    label: '🟢 Low',    color: '#34c759', bg: '#e8f8ee' }
    ].map(function (p) {
      var active = !!fp[p.key];
      return '<button class="filter-chip' + (active ? ' active' : '') + '" data-action="filterPriority" data-value="' + p.key + '" style="' + (active ? 'background:' + p.bg + ';color:' + p.color + ';border-color:' + p.color + ';' : '') + '">' + p.label + '</button>';
    }).join('');

    // Dept chips
    var deptChips = depts.map(function (d) {
      var active = fd === d;
      var col = CD.DC[d] || '#4f5158';
      return '<button class="filter-chip' + (active ? ' active' : '') + '" data-action="filterDept" data-value="' + esc(d) + '" style="' + (active ? 'background:' + col + ';color:#fff;border-color:' + col + ';' : '') + '">' + esc(d) + '</button>';
    }).join('');

    var clearChip = hasFilter ? '<button class="filter-chip filter-chip-clear" data-action="filterClear">✕ Clear</button>' : '';

    var filterBar = '<div class="filter-bar">' + priorityChips + '<div class="filter-divider"></div>' + deptChips + clearChip + '</div>';

    var emptyFiltered = todayTasks.length === 0 && hasFilter
      ? '<div class="filter-empty">No tasks match this filter.</div>'
      : '';

    var quickAddHTML = state.showQuickAdd
      ? '<div class="quick-add-form" data-stop>' +
          '<input id="quickAddInput" class="quick-add-input" placeholder="What needs to be done?" autocomplete="off">' +
          '<button class="quick-add-btn" data-action="addTask">Add</button>' +
          '<button class="quick-add-cancel" data-action="closeQuickAdd">Cancel</button>' +
        '</div>'
      : '<div class="quick-add-row" data-action="openQuickAdd">' +
          '<div class="quick-add-icon"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 1V11M1 6H11" stroke="#0b5389" stroke-width="2.5" stroke-linecap="round"/></svg></div>' +
          '<span>Add a task</span>' +
        '</div>';

    return (
      '<div class="today-head">' +
        '<div class="date-label">' + WEEKDAY_FULL[TODAY_INDEX] + ', ' + MONTH_FULL[TODAY.getMonth()] + ' ' + TODAY.getDate() + '</div>' +
        '<div class="greeting">Good morning, ' + esc(ME.name.split(' ')[0]) + ' 👋</div>' +
        '<div class="ai-nudge">' +
          '<div class="ai-nudge-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"/></svg></div>' +
          '<div class="ai-nudge-body"><div class="ai-nudge-label">Copilot</div><div class="ai-nudge-text">' + nudgeText + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="section-row">' +
        '<div class="section-title">Today\'s Tasks</div>' +
        '<div class="section-pill">' + (hasFilter ? todayTasks.length + ' shown · ' : '') + completedCount + '/' + totalCount + '</div>' +
      '</div>' +
      filterBar +
      '<div class="task-list">' + todayTasks.map(function (t) { return taskRowHTML(t, { showPriorityBadge: true }); }).join('') + emptyFiltered + '</div>' +
      '<div class="quick-add">' + quickAddHTML + '</div>'
    );
  }

  /* ───────────────────────── main content: week ───────────────────────── */

  function renderWeekContent() {
    var ct = state.completedTasks;
    var tasks = allTasks();

    var totalDone = 0, totalAll = 0;

    var cols = WDAYS.map(function (d) {
      var dayTasks = tasks.filter(function (t) { return t.day === d.day; });
      var doneCount = dayTasks.filter(function (t) { return ct[t.id]; }).length;
      totalDone += doneCount;
      totalAll += dayTasks.length;
      var pct = dayTasks.length === 0 ? 0 : Math.round(doneCount / dayTasks.length * 100);
      var isToday = d.day === TODAY_INDEX;
      var enriched = dayTasks.map(enrichTask);

      return (
        '<div class="week-day-col' + (isToday ? ' is-today' : '') + '">' +
          '<div class="week-day-col-head">' +
            '<div class="week-day-name">' + d.label + (isToday ? ' · Today' : '') + '</div>' +
            '<div class="week-day-date">' + d.shortLabel + '</div>' +
          '</div>' +
          '<div class="week-day-progress-track"><div class="week-day-progress-fill" style="width:' + pct + '%;"></div></div>' +
          (enriched.length === 0
            ? '<div class="week-day-empty">No tasks ✓</div>'
            : enriched.map(weekChipHTML).join('')) +
        '</div>'
      );
    }).join('');

    var overallPct = totalAll === 0 ? 0 : Math.round(totalDone / totalAll * 100);

    return (
      '<div class="week-head">' +
        '<div>' +
          '<div class="week-head-title">This Week</div>' +
          '<div class="week-head-range">' + fmtRange() + '</div>' +
        '</div>' +
        '<div class="week-overall">' +
          '<div class="week-overall-row"><span>Week progress</span><strong>' + totalDone + '/' + totalAll + ' done</strong></div>' +
          '<div class="week-overall-track"><div class="week-overall-fill" style="width:' + overallPct + '%;"></div></div>' +
        '</div>' +
      '</div>' +
      '<div class="week-board">' + cols + '</div>'
    );
  }

  /* ───────────────────────── chat helpers ───────────────────────── */

  function nowTime() {
    var d = new Date();
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  function getChatMsgs(chatId) {
    var base = (CHAT[chatId] || []).slice();
    var extra = state.chatMessages[chatId] || [];
    return base.concat(extra);
  }

  /* ─────────── File sharing helpers ─────────── */

  function fileIcon(type) {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📋';
    if (type.includes('word') || type.includes('document')) return '📄';
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return '📈';
    if (type.includes('zip') || type.includes('rar') || type.includes('compressed')) return '🗂️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎧';
    return '📁';
  }

  function fmtFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function stageFiles(fileList) {
    var arr = Array.prototype.slice.call(fileList);
    arr.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function (e) {
        var staged = state.stagedFiles.slice();
        staged.push({ name: file.name, size: file.size, type: file.type, dataUrl: e.target.result });
        state.stagedFiles = staged;
        renderFileStrip();
      };
      reader.readAsDataURL(file);
    });
  }

  function renderFileStrip() {
    var composer = document.getElementById('chatComposer');
    if (!composer) return;
    var existing = document.getElementById('filePreviewStrip');
    if (existing) existing.remove();
    if (!state.stagedFiles.length) return;
    var html = '<div class="file-preview-strip" id="filePreviewStrip">';
    state.stagedFiles.forEach(function (f, idx) {
      if (f.type.startsWith('image/')) {
        html += '<div class="file-preview-chip chip-image">' +
          '<img class="chip-thumb" src="' + f.dataUrl + '" alt="' + esc(f.name) + '">' +
          '<span class="chip-name">' + esc(f.name) + '</span>' +
          '<span class="chip-remove" data-action="removeStagedFile" data-idx="' + idx + '">×</span>' +
        '</div>';
      } else {
        html += '<div class="file-preview-chip">' +
          '<span class="chip-icon">' + fileIcon(f.type) + '</span>' +
          '<span class="chip-name">' + esc(f.name) + '</span>' +
          '<span class="chip-remove" data-action="removeStagedFile" data-idx="' + idx + '">×</span>' +
        '</div>';
      }
    });
    html += '</div>';
    composer.insertAdjacentHTML('beforebegin', html);
  }

  function sendStagedFiles(chatId) {
    if (!state.stagedFiles.length) return;
    var files = state.stagedFiles.slice();
    state.stagedFiles = [];
    files.forEach(function (f) {
      var msg = {
        id: Date.now() + Math.random(),
        sender: ME.name, initials: ME.initials, avatarBg: ME.avatarBg,
        mine: true, time: nowTime(),
        text: '', isFile: true,
        file: { name: f.name, size: f.size, type: f.type, dataUrl: f.dataUrl }
      };
      var existing = (state.chatMessages[chatId] || []).slice();
      existing.push(msg);
      var updated = Object.assign({}, state.chatMessages);
      updated[chatId] = existing;
      state.chatMessages = updated;
    });
    refreshChatMessages(chatId);
    renderFileStrip();
  }

  function openLightbox(src) {
    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = '<img src="' + src + '">';
    overlay.addEventListener('click', function () { overlay.remove(); });
    document.body.appendChild(overlay);
  }


  function sendMessage(chatId, text) {
    text = (text || '').trim();
    if (!text) return;
    var newMsg = {
      id: Date.now(),
      sender: ME.name,
      initials: ME.initials,
      avatarBg: ME.avatarBg,
      text: text,
      mine: true,
      time: nowTime()
    };
    var existing = (state.chatMessages[chatId] || []).slice();
    existing.push(newMsg);
    var updated = Object.assign({}, state.chatMessages);
    updated[chatId] = existing;
    // Don't call setState (avoids full re-render losing composer focus).
    // Update state directly, then re-render only the chat area.
    state.chatMessages = updated;
    refreshChatMessages(chatId);
    // Simulate a reply notification (from a teammate) after a short delay
    var isChannel = allChannels().filter(function(c){ return c.id === chatId; })[0];
    if (isChannel) {
      var notifDelay = 3000 + Math.random() * 4000;
      setTimeout(function() {
        var replies = ['Got it, thanks!', 'Noted 👍', 'On it!', 'Will do!', 'Thanks for the update!'];
        var names = ['Khalid Al-Rashid', 'Layla Hassan', 'Omar Yousef', 'Rania Saleh'];
        var rName = names[Math.floor(Math.random() * names.length)];
        var rText = replies[Math.floor(Math.random() * replies.length)];
        var botMsg = { id: Date.now(), sender: rName, initials: rName.split(' ').map(function(w){ return w[0]; }).join('').slice(0,2), avatarBg: '#6b7de3', text: rText, mine: false, time: nowTime() };
        var msgs2 = (state.chatMessages[chatId] || []).concat([botMsg]);
        var upd2 = Object.assign({}, state.chatMessages);
        upd2[chatId] = msgs2;
        state.chatMessages = upd2;
        refreshChatMessages(chatId);
        pushNotification(rName + ' replied in #' + (isChannel.name || chatId), rText, chatId);
      }, notifDelay);
    }
  }

  function getThreadMsgs(key) {
    var base = (THREADS_BASE[key] || []).slice();
    var extra = state.threadMessages[key] || [];
    return base.concat(extra);
  }

  function sendThreadReply(key, text) {
    text = (text || '').trim();
    if (!text) return;
    var newMsg = {
      id: Date.now(),
      sender: ME.name,
      initials: ME.initials,
      avatarBg: ME.avatarBg,
      text: text,
      mine: true,
      time: nowTime()
    };
    var existing = (state.threadMessages[key] || []).slice();
    existing.push(newMsg);
    var updated = Object.assign({}, state.threadMessages);
    updated[key] = existing;
    state.threadMessages = updated;
    renderThreadPanel();
    if (state.activeChat) refreshChatMessages(state.activeChat.id);
  }

  function refreshChatMessages(chatId) {
    var container = document.getElementById('chatMessages');
    if (!container) return;
    var msgs = getChatMsgs(chatId);
    container.innerHTML = msgs.map(function (msg) {
      var tMsg = Object.assign({}, msg, { text: CI.msgText(chatId, msg) });
      return msgRowHTML(tMsg, { chatId: chatId, showReply: true, threadCount: getThreadMsgs(chatId + ':' + msg.id).length });
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  function msgRowHTML(msg, opts) {
    // opts: { chatId, showReply, threadCount }
    var chatId      = opts && opts.chatId;
    var showReply   = opts && opts.showReply;
    var threadCount = (opts && opts.threadCount) || 0;

    var actionsHTML = showReply
      ? '<div class="msg-actions">' +
          '<button class="msg-action-btn" data-action="openThread" data-chat-id="' + esc(chatId) + '" data-msg-id="' + msg.id + '">↩ Reply</button>' +
          (msg.mine && !msg.isVoice && !msg.isFile
            ? '<button class="msg-action-btn" data-action="startEditMsg" data-chat-id="' + esc(chatId) + '" data-msg-id="' + msg.id + '" title="Edit">✏️</button>' +
              '<button class="msg-action-btn msg-del-btn" data-action="deleteMsg" data-chat-id="' + esc(chatId) + '" data-msg-id="' + msg.id + '" title="Delete">🗑️</button>'
            : '') +
        '</div>'
      : '';

    var threadHTML = '';
    if (showReply && threadCount > 0) {
      var threadMsgs = getThreadMsgs(chatId + ':' + msg.id);
      var avatarsHTML = threadMsgs.slice(0, 3).map(function (m) {
        return '<div class="thread-avatar-mini" style="background:' + m.avatarBg + ';">' + esc(m.initials) + '</div>';
      }).join('');
      threadHTML = '<div class="msg-thread-indicator" data-action="openThread" data-chat-id="' + esc(chatId) + '" data-msg-id="' + msg.id + '">' +
        '<div class="thread-avatars">' + avatarsHTML + '</div>' +
        '<span class="thread-indicator-txt">' + threadCount + ' ' + (threadCount === 1 ? CI.t('reply_one') : CI.t('reply_many')) + '</span>' +
      '</div>';
    }

    var bodyHTML;
    if (msg.isVoice) {
      bodyHTML = '<div class="voice-note-card">' +
        '<button class="voice-play-btn" title="Play">' +
          '<svg width="10" height="12" viewBox="0 0 10 12" fill="none"><path d="M1 1L9 6L1 11V1Z" fill="currentColor"/></svg>' +
        '</button>' +
        '<div class="voice-note-wave">' +
          [2,4,6,5,3,7,4,6,2,5,7,3,4,6,5,2].map(function(h){ return '<div class="vnw-bar" style="height:' + (h*2+2) + 'px"></div>'; }).join('') +
        '</div>' +
        '<span class="voice-note-dur">' + fmtVoiceDur(msg.voiceDuration || 0) + '</span>' +
      '</div>';
    } else if (msg.isFile && msg.file) {
      var f = msg.file;
      if (f.type.startsWith('image/')) {
        bodyHTML = '<div class="msg-attachment"><img class="attach-image" src="' + f.dataUrl + '" alt="' + esc(f.name) + '" data-action="viewImage" data-src="' + f.dataUrl + '"></div>';
      } else {
        bodyHTML = '<div class="msg-attachment">' +
          '<a class="attach-file-card" href="' + f.dataUrl + '" download="' + esc(f.name) + '" target="_blank" data-stop="1">' +
            '<div class="attach-file-icon">' + fileIcon(f.type) + '</div>' +
            '<div class="attach-file-meta">' +
              '<div class="attach-file-name">' + esc(f.name) + '</div>' +
              '<div class="attach-file-size">' + fmtFileSize(f.size) + '</div>' +
            '</div>' +
            '<svg class="attach-file-dl" width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3v10M10 13l-4-4M10 13l4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 17h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</a>' +
        '</div>';
      }
    } else {
      bodyHTML = '<div class="msg-text">' + esc(msg.text) + (msg.edited ? ' <span class="msg-edited">(edited)</span>' : '') + '</div>';
    }

    return (
      '<div class="msg-row' + (msg.mine ? ' msg-mine' : '') + '" data-msg-id="' + msg.id + '">' +
        '<div class="msg-avatar" style="background:' + msg.avatarBg + ';">' + esc(msg.initials) + '</div>' +
        '<div class="msg-body">' +
          '<div class="msg-head">' +
            '<span class="msg-sender' + (msg.mine ? ' mine' : '') + '">' + esc(msg.sender) + '</span>' +
            '<span class="msg-time">' + esc(msg.time) + '</span>' +
          '</div>' +
          bodyHTML +
        '</div>' +
        actionsHTML +
      '</div>' +
      threadHTML
    );
  }

  /* ───────────────────────── main content: chat ───────────────────────── */

  function renderChatContent() {
    var chat = state.activeChat;
    var msgs = getChatMsgs(chat.id);

    var chatId = chat.id;
    var messagesHTML = msgs.map(function (msg) {
      var tMsg = Object.assign({}, msg, { text: CI.msgText(chatId, msg) });
      return msgRowHTML(tMsg, { chatId: chatId, showReply: true, threadCount: getThreadMsgs(chatId + ':' + msg.id).length });
    }).join('');

    return (
      '<div class="chat-messages" id="chatMessages">' + messagesHTML + '</div>' +
      '<input type="file" id="fileInput" multiple style="display:none" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv,.mp4,.mp3">' +
      '<div class="chat-composer" id="chatComposer">' +
        '<button class="composer-attach-btn" id="attachBtn" data-action="triggerFileInput" ' + 'title="' + CI.t('attach_file') + '"' + '>' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</button>' +
        '<button class="composer-mic-btn" id="micBtn" data-action="toggleRecording" ' + 'title="' + CI.t('voice_title') + '"' + '>' +
          '<svg class="mic-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" stroke-width="2"/><path d="M5 10a7 7 0 0014 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>' +
        '<textarea id="chatInput" class="chat-input" placeholder="' + CI.t('message_placeholder') + ' ' + esc(chat.name) + '…" rows="1"></textarea>' +
        '<button class="chat-composer-send" data-action="sendChatMsg" title="Send (Enter)">' +
          '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 8H14M14 8L9 3M14 8L9 13" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="voice-recording-bar hidden" id="voiceBar">' +
        '<div class="voice-bar-left">' +
          '<div class="rec-dot"></div>' +
          '<span class="rec-label">' + CI.t('recording') + '</span>' +
          '<span class="rec-timer" id="recTimer">0:00</span>' +
        '</div>' +
        '<div class="voice-waveform" id="voiceWaveform">' +
          [1,3,5,4,2,6,3,5,2,4,6,3,1,4,5,2].map(function(h){ return '<div class="wave-bar" style="height:' + (h*3+4) + 'px"></div>'; }).join('') +
        '</div>' +
        '<div class="voice-bar-right">' +
          '<button class="voice-cancel-btn" data-action="cancelRecording" title="Cancel">✕</button>' +
          '<button class="voice-send-btn" data-action="sendVoiceMsg" title="Send voice note">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 8H14M14 8L9 3M14 8L9 13" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ───────────────────────── topbar + main content dispatch ───────────────────────── */

  function renderTopbarAndContent() {
    var content = document.getElementById('mainContent');
    var icon = document.getElementById('topbarIcon');

    if (state.activeChat) {
      var chat = state.activeChat;
      icon.style.background = chat.color;
      icon.style.borderRadius = chat.radius;
      icon.style.fontSize = chat.iconSize;
      icon.textContent = chat.icon;
      document.getElementById('topbarTitle').textContent = chat.name;
      document.getElementById('topbarSub').textContent = chat.sub;

      content.className = 'main-content chat-mode';
      content.innerHTML = renderChatContent();
      setTimeout(function () {
        var scroller = document.getElementById('chatMessages');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
        var input = document.getElementById('chatInput');
        if (input) input.focus();
      }, 30);
      return;
    }

    icon.style.borderRadius = '9px';
    icon.style.fontSize = '15px';
    icon.style.background = 'var(--blue)';
    content.className = 'main-content padded';

    if (state.activeView === 'week') {
      icon.innerHTML = '<svg width="15" height="15" viewBox="0 0 22 22" fill="none"><rect x="2" y="3" width="18" height="16" rx="3" stroke="white" stroke-width="1.9"/><path d="M7 1.5V4.5M15 1.5V4.5" stroke="white" stroke-width="1.9" stroke-linecap="round"/><path d="M6 10H16M6 14H12" stroke="white" stroke-width="1.9" stroke-linecap="round"/></svg>';
      document.getElementById('topbarTitle').textContent = CI.t('topbar_week');
      document.getElementById('topbarSub').textContent = fmtRange();
      content.innerHTML = renderWeekContent();
    } else {
      icon.innerHTML = '<svg width="15" height="15" viewBox="0 0 22 22" fill="none"><rect x="2" y="3" width="18" height="16" rx="3" stroke="white" stroke-width="1.9"/><path d="M7 1.5V4.5M15 1.5V4.5" stroke="white" stroke-width="1.9" stroke-linecap="round"/><path d="M6 11H11M6 15H9" stroke="white" stroke-width="1.9" stroke-linecap="round"/></svg>';
      document.getElementById('topbarTitle').textContent = CI.t('topbar_today');
      document.getElementById('topbarSub').textContent = WEEKDAY_FULL[TODAY_INDEX] + ', ' + MONTH_FULL[TODAY.getMonth()] + ' ' + TODAY.getDate();
      content.innerHTML = renderTodayContent();
      if (state.showQuickAdd) {
        setTimeout(function () {
          var input = document.getElementById('quickAddInput');
          if (input) input.focus();
        }, 30);
      }
    }
  }

  /* ───────────────────────── task detail panel ───────────────────────── */

  function renderDetailPanel() {
    var panel = document.getElementById('detailPanel');
    var at = state.activeTask;
    panel.classList.toggle('hidden', !at);
    if (!at) return;

    var ct = state.completedTasks;
    var isDone = !!ct[at.id];

    document.getElementById('td-priorityBar').style.background = PC[at.priority] || '#dedede';
    document.getElementById('td-title').textContent = at.title;
    document.getElementById('td-dept').textContent = at.dept;
    document.getElementById('td-dept').style.background = DC[at.dept] || '#4f5158';
    document.getElementById('td-due').textContent = CI.t('due_prefix') + ' ' + at.dueTime;
    document.getElementById('td-priority').textContent = at.priority + ' ' + CI.t('priority_suffix');
    document.getElementById('td-priority').style.background = PL[at.priority] || '#f6f7f9';
    document.getElementById('td-priority').style.color = PC[at.priority] || '#4f5158';
    document.getElementById('td-toggleBtn').textContent = isDone ? CI.t('mark_pending') : CI.t('mark_done');
    document.getElementById('td-toggleBtn').style.background = isDone ? '#34c759' : '#0b5389';
  }

  /* ───────────────────────── thread panel ───────────────────────── */

  /* ───────────────────────── AI panel ───────────────────────── */

  var AI_DRAFTS = {
    'budget':   'Hi team, just a heads-up — the PMO budget report has been submitted. Please review and let me know if you need any clarifications before the end of day.',
    'standup':  'Good morning everyone! Quick standup summary: on track for all milestones, no blockers. Main focus today is the Q3 review and the vendor contract sign-off.',
    'deadline': 'Friendly reminder that the deadline for submitting your department reports is today at 5pm. Please reach out if you need an extension.',
    'meeting':  'Just a reminder that our weekly sync is scheduled for today at 3pm. Agenda has been shared in the drive — please review beforehand.',
    'default':  'Hi team, wanted to share a quick update on our current priorities. Things are progressing well — I\'ll share a full status update by end of week.'
  };

  function generateDraft(prompt) {
    var p = (prompt || '').toLowerCase();
    if (p.includes('budget') || p.includes('finance') || p.includes('report')) return AI_DRAFTS.budget;
    if (p.includes('standup') || p.includes('update') || p.includes('status')) return AI_DRAFTS.standup;
    if (p.includes('deadline') || p.includes('due') || p.includes('reminder')) return AI_DRAFTS.deadline;
    if (p.includes('meeting') || p.includes('call') || p.includes('sync')) return AI_DRAFTS.meeting;
    return AI_DRAFTS.default;
  }


  /* ═══════════════════════════════════════════════════════════════
     VOICE AGENT
  ═══════════════════════════════════════════════════════════════ */

  var AGENT_SERVER = 'http://localhost:3001';
  var agentSessionId = 'session_' + Date.now();

  // Add to state
  state.agentTab = 'assistant';   // 'assistant' | 'agent'
  state.agentMessages = [
    { role: 'agent', text: 'Hi Sara! Hold the mic button and speak, or type below. I can create tasks, send messages, set reminders and more.' }
  ];
  state.agentListening  = false;
  state.agentThinking   = false;
  state.agentSpeaking   = false;

  /* ── Speech Recognition ── */
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognition = SpeechRecognition ? new SpeechRecognition() : null;
  if (recognition) {
    recognition.continuous = true;   // stay open — don't drop on silence
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function (e) {
      // grab the latest final result
      var transcript = e.results[e.results.length - 1][0].transcript.trim();
      if (!transcript) return;
      // stop listening while agent thinks / speaks
      recognition.stop();
      state.agentListening = false;
      updateOrbUI();
      sendAgentMessage(transcript, true);  // voice in → speak back
    };
    recognition.onerror = function (e) {
      if (e.error === 'no-speech') {
        // browser timed out with no speech — restart if still meant to listen
        if (state.agentListening) { try { recognition.start(); } catch(_){} }
        return;
      }
      state.agentListening = false;
      updateOrbUI();
    };
    recognition.onend = function () {
      // only update UI if we didn't intentionally stop
      if (!state.agentListening) updateOrbUI();
    };
  }

  /* ── Text-to-Speech — ElevenLabs via agent server ── */
  var _currentAudio = null;

  function speak(text) {
    if (!text) return;
    // Stop any currently playing audio
    if (_currentAudio) {
      _currentAudio.pause();
      _currentAudio = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    state.agentSpeaking = true;
    updateOrbUI();

    fetch(AGENT_SERVER + '/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text })
    })
    .then(function(res) {
      if (!res.ok) throw new Error('TTS ' + res.status);
      return res.blob();
    })
    .then(function(blob) {
      var url = URL.createObjectURL(blob);
      var audio = new Audio(url);
      _currentAudio = audio;
      audio.onended = function() {
        state.agentSpeaking = false;
        updateOrbUI();
        URL.revokeObjectURL(url);
        _currentAudio = null;
      };
      audio.onerror = function() {
        state.agentSpeaking = false;
        updateOrbUI();
        _currentAudio = null;
      };
      audio.play();
    })
    .catch(function(err) {
      console.warn('ElevenLabs TTS failed, falling back to Web Speech:', err.message);
      // Fallback to Web Speech API
      if (window.speechSynthesis) {
        var utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.onstart = function() { state.agentSpeaking = true; updateOrbUI(); };
        utterance.onend   = function() { state.agentSpeaking = false; updateOrbUI(); };
        utterance.onerror = function() { state.agentSpeaking = false; updateOrbUI(); };
        window.speechSynthesis.speak(utterance);
      } else {
        state.agentSpeaking = false;
        updateOrbUI();
      }
    });
  }

  /* ── Send message to Gemini agent ── */
  function sendAgentMessage(text, speakResponse) {
    if (!text || !text.trim()) return;

    // Add user bubble
    state.agentMessages.push({ role: 'user', text: text });
    state.agentThinking = true;
    updateOrbUI();
    renderAgentMessages();

    // Build context snapshot
    var tasks = allTasks().map(function(t) {
      return { id: t.id, title: CI.taskTitle(t), priority: t.priority, done: !!state.completedTasks[t.id] };
    });
    var context = { tasks: tasks, today: new Date().toDateString() };

    fetch(AGENT_SERVER + '/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: agentSessionId, context: context })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      state.agentThinking = false;
      if (data.error) {
        state.agentMessages.push({ role: 'error', text: 'Error: ' + data.error });
      } else {
        state.agentMessages.push({ role: 'agent', text: data.text, action: data.action });
        // Execute action in the app
        if (data.action) executeAgentAction(data.action);
        if (speakResponse) speak(data.text);
      }
      updateOrbUI();
      renderAgentMessages();
    })
    .catch(function (err) {
      state.agentThinking = false;
      state.agentMessages.push({ role: 'error', text: 'Could not reach agent server. Make sure it is running on localhost:3001.' });
      updateOrbUI();
      renderAgentMessages();
    });
  }

  /* ── Execute agent actions in the app ── */
  function executeAgentAction(action) {
    var args = action.args || {};
    switch (action.type) {
      case 'create_task': {
        var newTask = {
          id: state.nextId,
          title: args.title || 'New task',
          dept: args.dept || 'PMO',
          dueTime: args.due_time || 'Today',
          priority: args.priority || 'medium',
          day: TODAY_INDEX
        };
        state.extraTasks = state.extraTasks.concat([newTask]);
        state.nextId = state.nextId + 1;
        persist();
        if (state.activeView === 'today' || state.activeView === 'week') render();
        break;
      }
      case 'complete_task': {
        var titleLower = (args.task_title || '').toLowerCase();
        var match = allTasks().filter(function(t) {
          return t.title.toLowerCase().indexOf(titleLower) !== -1;
        })[0];
        if (match) {
          var ct = Object.assign({}, state.completedTasks);
          ct[match.id] = true;
          state.completedTasks = ct;
          persist();
          if (state.activeView === 'today' || state.activeView === 'week') render();
        }
        break;
      }
      case 'send_message': {
        var to = (args.to || '').toLowerCase().replace('#','');
        var ch = CHANNELS.filter(function(c) { return c.name.toLowerCase().includes(to); })[0];
        if (ch) {
          sendMessage(ch.id, args.message || '');
          setState({ activeChat: { id: ch.id, name: ch.name, sub: CI.t('dept_channel'), color: ch.bgColor, icon: ch.emoji, iconSize: '15px', radius: '9px', isChannel: true } });
        }
        break;
      }
      case 'get_tasks': {
        setState({ showAIPanel: true, activeView: args.filter === 'week' ? 'week' : 'today', activeChat: null });
        break;
      }
      case 'summarise_day': {
        setState({ showAIPanel: true, activeChat: null });
        break;
      }
      case 'schedule_meeting': {
        // Create as a task until calendar integration is live
        var meetTask = {
          id: state.nextId,
          title: args.title + (args.attendees ? ' with ' + args.attendees : ''),
          dept: 'PMO',
          dueTime: args.time || 'TBD',
          priority: 'high',
          day: TODAY_INDEX
        };
        state.extraTasks = state.extraTasks.concat([meetTask]);
        state.nextId = state.nextId + 1;
        persist();
        if (state.activeView === 'today' || state.activeView === 'week') render();
        break;
      }
      case 'set_reminder': {
        // Show as a browser notification or console log until push is wired
        if (window.Notification && Notification.permission === 'granted') {
          setTimeout(function () {
            new Notification('Copilot Reminder', { body: args.text, icon: '../employee-copilot-pwa/icons/icon-192.png' });
          }, 5000); // simplified: 5 sec delay for demo
        }
        break;
      }
    }
  }

  /* ── Render agent messages ── */
  function renderAgentMessages() {
    var el = document.getElementById('agentMessages');
    if (!el) return;
    el.innerHTML = state.agentMessages.map(function(m) {
      var cls = m.role === 'user' ? 'user' : m.role === 'error' ? 'error' : m.action ? 'action' : 'agent';
      var actionChip = m.action ? '<div class="agent-action-chip">⚡ ' + m.action.type.replace(/_/g,' ') + '</div>' : '';
      return '<div class="agent-bubble ' + cls + '">' + esc(m.text) + actionChip + '</div>';
    }).join('');
    el.scrollTop = el.scrollHeight;

    // Show thinking dot
    var thinkEl = document.getElementById('agentThinking');
    if (thinkEl) thinkEl.classList.toggle('hidden', !state.agentThinking);
  }

  /* ── Update orb state ── */
  function updateOrbUI() {
    var orb = document.getElementById('agentOrb');
    var status = document.getElementById('agentStatus');
    if (!orb || !status) return;
    orb.className = 'agent-orb';
    if (state.agentListening) { orb.classList.add('listening'); status.textContent = CI.t('agent_listening'); status.className = 'agent-status active'; }
    else if (state.agentThinking) { orb.classList.add('thinking'); status.textContent = CI.t('agent_thinking'); status.className = 'agent-status active'; }
    else if (state.agentSpeaking) { orb.classList.add('speaking'); status.textContent = CI.t('agent_speaking'); status.className = 'agent-status active'; }
    else { status.textContent = recognition ? 'Tap to speak' : 'Type below'; status.className = 'agent-status'; }
  }

  /* ── Toggle orb mic ── */
  function toggleAgentMic() {
    if (!recognition) { document.getElementById('agentTextInput') && document.getElementById('agentTextInput').focus(); return; }
    if (state.agentListening) {
      recognition.stop();
      state.agentListening = false;
    } else {
      window.speechSynthesis && window.speechSynthesis.cancel();
      if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
      state.agentSpeaking = false;
      recognition.lang = CI.getLang() === 'ru' ? 'ru-RU' : CI.getLang() === 'kk' ? 'kk-KZ' : 'en-US';
      recognition.start();
      state.agentListening = true;
    }
    updateOrbUI();
  }


  var AI_ACTIONS = [
    { icon: '📋', label: 'Summarise today', sub: 'Tasks & progress',   action: 'aiSummariseToday' },
    { icon: '🔴', label: 'Show urgent',      sub: 'High priority only', action: 'aiShowUrgent'     },
    { icon: '💬', label: 'Draft update',     sub: 'To your team',       action: 'aiQuickDraft'     },
    { icon: '📅', label: 'Week overview',    sub: 'All 5 days',         action: 'aiWeekOverview'   }
  ];

  function renderAIPanel() {
    var panel = document.getElementById('aiPanel');
    var app   = document.getElementById('webApp');
    var btn   = document.getElementById('aiTopbarBtn');

    if (!state.showAIPanel) {
      panel.classList.add('hidden');
      app.classList.remove('ai-open');
      if (btn) btn.classList.remove('active');
      return;
    }

    panel.classList.remove('hidden');
    app.classList.add('ai-open');
    if (btn) btn.classList.add('active');

    var ct      = state.completedTasks;
    var tasks   = allTasks();
    var today   = tasks.filter(function (t) { return t.day === TODAY_INDEX; });
    var done    = today.filter(function (t) { return ct[t.id]; }).length;
    var pending = today.length - done;
    var urgent  = today.filter(function (t) { return !ct[t.id] && t.priority === 'high'; }).length;
    var pct     = today.length ? Math.round(done / today.length * 100) : 0;

    var greet = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
    var nudge = urgent > 0
      ? urgent + ' urgent task' + (urgent > 1 ? 's' : '') + ' need' + (urgent === 1 ? 's' : '') + ' your attention first.'
      : pending === 0 ? 'All done for today — great work! 🎉' : 'You\'re making good progress. Keep it up!';

    document.getElementById('aiBriefing').innerHTML =
      '<strong>Good ' + greet + ', ' + esc(ME.name.split(' ')[0]) + '.</strong> ' + nudge +
      '<div class="ai-briefing-stat-row">' +
        '<div class="ai-briefing-stat"><div class="ai-briefing-stat-val">' + done + '</div><div class="ai-briefing-stat-lbl">Done</div></div>' +
        '<div class="ai-briefing-stat"><div class="ai-briefing-stat-val" style="color:var(--warning)">' + pending + '</div><div class="ai-briefing-stat-lbl">Pending</div></div>' +
        '<div class="ai-briefing-stat"><div class="ai-briefing-stat-val" style="color:var(--danger)">' + urgent + '</div><div class="ai-briefing-stat-lbl">Urgent</div></div>' +
        '<div class="ai-briefing-stat"><div class="ai-briefing-stat-val" style="color:var(--success)">' + pct + '%</div><div class="ai-briefing-stat-lbl">Done</div></div>' +
      '</div>';

    var suggestions = today
      .filter(function (t) { return !ct[t.id]; })
      .sort(function (a, b) {
        var po = { high: 0, medium: 1, low: 2 };
        return (po[a.priority] || 1) - (po[b.priority] || 1);
      })
      .slice(0, 3);

    var reasons = {
      high:   'High priority — tackle this first.',
      medium: 'Due today — don\'t let it slip.',
      low:    'Quick win to clear your list.'
    };

    document.getElementById('aiSuggestions').innerHTML = suggestions.length === 0
      ? '<div style="font-size:13px;color:var(--text-faint);padding:8px 0;">Nothing left to focus on — you\'re done! 🎉</div>'
      : suggestions.map(function (t) {
          var e = enrichTask(t);
          return '<div class="ai-suggestion" data-action="aiGoTask" data-id="' + t.id + '">' +
            '<div class="ai-suggestion-dot" style="background:' + e.priorityColor + ';"></div>' +
            '<div class="ai-suggestion-body">' +
              '<div class="ai-suggestion-title">' + esc(t.title) + '</div>' +
              '<div class="ai-suggestion-reason">' + (reasons[t.priority] || '') + '</div>' +
            '</div>' +
            '<div class="ai-suggestion-action">→ Open</div>' +
          '</div>';
        }).join('');

    document.getElementById('aiActionsGrid').innerHTML = AI_ACTIONS.map(function (a) {
      return '<div class="ai-action-card" data-action="' + a.action + '">' +
        '<div class="ai-action-icon">' + a.icon + '</div>' +
        '<div class="ai-action-label">' + CI.t(a.labelKey) + '</div>' +
        '<div class="ai-action-sub">' + a.sub + '</div>' +
      '</div>';
    }).join('');
  }

  function renderThreadPanel() {
    var panel = document.getElementById('threadPanel');
    var app   = document.getElementById('webApp');
    var at    = state.activeThread;

    if (!at) {
      panel.classList.add('hidden');
      app.classList.remove('thread-open');
      return;
    }

    panel.classList.remove('hidden');
    app.classList.add('thread-open');

    var msgs = getThreadMsgs(at.key);

    var origMsg = Object.assign({}, at.msg, { text: CI.msgText(at.chatId, at.msg) });
    document.getElementById('threadOriginalMsg').innerHTML = msgRowHTML(origMsg, { showReply: false });

    var countEl = document.getElementById('threadReplyCount');
    countEl.textContent = msgs.length === 0 ? 'No replies yet' : msgs.length + (msgs.length === 1 ? ' reply' : ' replies');

    var threadMsgsEl = document.getElementById('threadMessages');
    threadMsgsEl.innerHTML = msgs.length === 0
      ? '<div class="thread-empty">No replies yet — be the first!</div>'
      : msgs.map(function (m) { var tm = Object.assign({}, m, { text: CI.threadMsgText(state.activeThread.key, m) }); return msgRowHTML(tm, { showReply: false }); }).join('');
    threadMsgsEl.scrollTop = threadMsgsEl.scrollHeight;
  }

  /* ───────────────────────── render ───────────────────────── */

  function render() {
    renderSidebarNav();
    renderSidebarChannels();
    renderSidebarDMs();
    renderProfile();
    renderTopbarAndContent();
    renderDetailPanel();
    renderThreadPanel();
    renderAIPanel();
    var ls = document.getElementById('langSwitcher');
    if (ls) ls.innerHTML = CI.langSwitcherHTML();
    CI.applyI18n();
  }

  /* ───────────────────────── search ───────────────────────── */

  function highlight(text, query) {
    if (!query) return esc(text);
    var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return esc(text).replace(re, '<mark>$1</mark>');
  }

  function runSearch(query) {
    var q = (query || '').trim().toLowerCase();
    var dropdown = document.getElementById('searchDropdown');
    if (!q || q.length < 2) { dropdown.classList.add('hidden'); return; }

    var tasks = allTasks().filter(function (t) {
      return t.title.toLowerCase().includes(q) || t.dept.toLowerCase().includes(q);
    }).slice(0, 5);

    var msgResults = [];
    var allChats = CHANNELS.map(function (c) { return { id: c.id, name: c.name, type: 'channel' }; })
      .concat(DMS.map(function (d) { return { id: d.id, name: d.name, type: 'dm' }; }));
    allChats.forEach(function (chat) {
      var msgs = getChatMsgs(chat.id);
      msgs.forEach(function (m) {
        if (m.text.toLowerCase().includes(q)) {
          msgResults.push({ chat: chat, msg: m });
        }
      });
    });
    msgResults = msgResults.slice(0, 4);

    if (tasks.length === 0 && msgResults.length === 0) {
      dropdown.innerHTML = '<div class="search-empty">No results for "<strong>' + esc(query) + '</strong>"</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    var html = '';
    if (tasks.length > 0) {
      html += '<div class="search-section-label">Tasks</div>';
      html += tasks.map(function (t) {
        var e = enrichTask(t);
        return '<div class="search-result" data-action="searchGoTask" data-id="' + t.id + '">' +
          '<div class="sr-dot" style="background:' + e.priorityColor + ';"></div>' +
          '<div class="sr-body">' +
            '<div class="sr-title">' + highlight(t.title, query) + '</div>' +
            '<div class="sr-sub"><span class="sr-dept" style="background:' + e.deptColor + ';">' + esc(CI.dept(t.dept)) + '</span> ' + esc(t.dueTime) + '</div>' +
          '</div>' +
          (e.completed ? '<div class="sr-done">✓</div>' : '') +
        '</div>';
      }).join('');
    }

    if (msgResults.length > 0) {
      html += '<div class="search-section-label">Messages</div>';
      html += msgResults.map(function (r) {
        return '<div class="search-result" data-action="searchGoChat" data-chat-id="' + r.chat.id + '" data-chat-type="' + r.chat.type + '">' +
          '<div class="sr-chat-icon">' + (r.chat.type === 'channel' ? '#' : '✉') + '</div>' +
          '<div class="sr-body">' +
            '<div class="sr-title">' + highlight(r.msg.text, query) + '</div>' +
            '<div class="sr-sub">' + esc(r.chat.name) + ' · ' + esc(r.msg.sender) + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    dropdown.innerHTML = html;
    dropdown.classList.remove('hidden');
  }

  function closeSearch() {
    var dropdown = document.getElementById('searchDropdown');
    var input = document.getElementById('searchInput');
    if (dropdown) dropdown.classList.add('hidden');
    if (input) input.value = '';
  }

  /* ───────────────────────── event delegation ───────────────────────── */

  document.addEventListener('click', function (e) {
    var stopEl = e.target.closest('[data-stop]');
    var actionEl = e.target.closest('[data-action]');

    if (!actionEl) return;
    if (stopEl && actionEl !== stopEl && !stopEl.contains(actionEl)) return;

    var action = actionEl.dataset.action;

    switch (action) {
      case 'selectView':
        setState({ activeView: actionEl.dataset.view, activeChat: null });
        break;
      case 'toggleTask':
        e.stopPropagation();
        toggleTask(Number(actionEl.dataset.id));
        break;
      case 'openTaskDetail': {
        var id = Number(actionEl.dataset.id);
        var t = allTasks().filter(function (x) { return x.id === id; })[0];
        if (t) setState({ activeTask: t });
        break;
      }
      case 'closeTaskDetail':
        setState({ activeTask: null });
        break;
      case 'toggleActiveTask': {
        var at = state.activeTask;
        if (!at) break;
        var ct = Object.assign({}, state.completedTasks);
        ct[at.id] = !ct[at.id];
        setState({ completedTasks: ct, activeTask: null });
        break;
      }

      case 'openChat': {
        var type = actionEl.dataset.chatType;
        if (type === 'channel') {
          var ch = CHANNELS.filter(function (c) { return c.id === actionEl.dataset.chatId; })[0];
          if (ch) setState({ activeChat: { id: ch.id, name: ch.name, sub: CI.t('dept_channel'), color: ch.bgColor, icon: ch.emoji, iconSize: '15px', radius: '9px', isChannel: true }, activeThread: null });
        } else {
          var dm = DMS.filter(function (d) { return d.id === actionEl.dataset.chatId; })[0];
          if (dm) setState({ activeChat: { id: dm.id, name: dm.name, sub: dm.role + (dm.online ? ' · ' + CI.t('online') : ''), color: dm.avatarBg, icon: dm.initials, iconSize: '12px', radius: '50%', isChannel: false }, activeThread: null });
        }
        break;
      }
      case 'openThread': {
        var chatId = actionEl.dataset.chatId;
        var msgId  = Number(actionEl.dataset.msgId);
        var allMsgs = getChatMsgs(chatId);
        var msg = allMsgs.filter(function (m) { return m.id === msgId; })[0];
        if (msg) setState({ activeThread: { key: chatId + ':' + msgId, chatId: chatId, msgId: msgId, msg: msg } });
        break;
      }
      case 'closeThread':
        setState({ activeThread: null });
        break;
      case 'sendThreadMsg': {
        var input = document.getElementById('threadInput');
        if (input && state.activeThread) {
          sendThreadReply(state.activeThread.key, input.value);
          input.value = '';
          input.style.height = '';
          input.focus();
        }
        break;
      }
      case 'switchAITab': {
        var tab = actionEl.dataset.tab;
        state.agentTab = tab;
        document.querySelectorAll('.ai-panel-tab').forEach(function(b) {
          b.classList.toggle('active', b.dataset.tab === tab);
        });
        var agentPane = document.getElementById('agentPane');
        var assistantBody = document.getElementById('aiPanelBody');
        if (agentPane) agentPane.classList.toggle('hidden', tab !== 'agent');
        if (assistantBody) assistantBody.classList.toggle('hidden', tab === 'agent');
        if (tab === 'agent') { renderAgentMessages(); updateOrbUI(); }
        break;
      }
      case 'toggleAgentMic':
        toggleAgentMic();
        break;
      case 'sendAgentText': {
        var inp = document.getElementById('agentTextInput');
        if (inp && inp.value.trim()) {
          sendAgentMessage(inp.value.trim(), false);  // text in → silent
          inp.value = '';
        }
        break;
      }
      case 'toggleAIPanel':
        setState({ showAIPanel: !state.showAIPanel, activeThread: null, activeTask: null });
        break;
      case 'closeAIPanel':
        setState({ showAIPanel: false });
        break;
      case 'aiGoTask': {
        var id = Number(actionEl.dataset.id);
        var t = allTasks().filter(function (x) { return x.id === id; })[0];
        if (t) setState({ showAIPanel: false, activeChat: null, activeView: t.day === TODAY_INDEX ? 'today' : 'week', activeTask: t });
        break;
      }
      case 'aiDraft': {
        var inp = document.getElementById('aiDraftInput');
        var prompt = inp ? inp.value : '';
        var resultEl = document.getElementById('aiDraftResult');
        var textEl = document.getElementById('aiDraftText');
        if (!resultEl || !textEl) break;
        var draftBtn = actionEl;
        draftBtn.classList.add('loading');
        draftBtn.textContent = CI.t('ai_generating');
        setTimeout(function () {
          var draft = generateDraft(prompt);
          textEl.textContent = draft;
          state.aiDraftText = draft;
          resultEl.classList.remove('hidden');
          draftBtn.classList.remove('loading');
          draftBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"/></svg> Generate';
        }, 900);
        break;
      }
      case 'aiDraftCopy': {
        if (state.aiDraftText) {
          navigator.clipboard && navigator.clipboard.writeText(state.aiDraftText);
          actionEl.textContent = CI.t('ai_copied');
          setTimeout(function () { actionEl.textContent = CI.t('ai_copy'); }, 1500);
        }
        break;
      }
      case 'aiDraftSend': {
        if (state.aiDraftText && state.activeChat) {
          sendMessage(state.activeChat.id, state.aiDraftText);
          setState({ showAIPanel: false });
        } else if (state.aiDraftText) {
          var firstCh = CHANNELS[0];
          var chatObj = { id: firstCh.id, name: firstCh.name, sub: CI.t('dept_channel'), color: firstCh.bgColor, icon: firstCh.emoji, iconSize: '15px', radius: '9px', isChannel: true };
          setState({ showAIPanel: false, activeChat: chatObj });
          setTimeout(function () { sendMessage(firstCh.id, state.aiDraftText); refreshChatMessages(firstCh.id); }, 100);
        }
        break;
      }
      case 'aiSummariseToday': {
        var ct2 = state.completedTasks;
        var today2 = allTasks().filter(function (t) { return t.day === TODAY_INDEX; });
        var done2 = today2.filter(function (t) { return ct2[t.id]; }).length;
        alert('Today: ' + done2 + ' done, ' + (today2.length - done2) + ' pending out of ' + today2.length + ' total tasks.');
        break;
      }
      case 'aiShowUrgent':
        setState({ showAIPanel: false, activeChat: null, activeView: 'today', filterPriority: { high: true }, filterDept: null });
        break;
      case 'aiQuickDraft': {
        var di = document.getElementById('aiDraftInput');
        if (di) { di.value = 'team status update'; di.focus(); }
        break;
      }
      case 'aiWeekOverview':
        setState({ showAIPanel: false, activeChat: null, activeView: 'week' });
        break;
      case 'toggleRecording':
        if (state.isRecording) { stopRecording(false); } else { startRecording(); }
        break;
      case 'cancelRecording':
        stopRecording(false);
        break;
      case 'sendVoiceMsg':
        stopRecording(true);
        break;

      case 'triggerFileInput': {
        var fi = document.getElementById('fileInput');
        if (fi) fi.click();
        break;
      }
      case 'removeStagedFile': {
        var idx = Number(actionEl.dataset.idx);
        var staged = state.stagedFiles.slice();
        staged.splice(idx, 1);
        state.stagedFiles = staged;
        renderFileStrip();
        break;
      }
      case 'viewImage': {
        var src = actionEl.dataset.src;
        if (src) openLightbox(src);
        break;
      }

      case 'sendChatMsg': {
        var input = document.getElementById('chatInput');
        if (input && state.activeChat) {
          if (input.value.trim()) sendMessage(state.activeChat.id, input.value);
          if (state.stagedFiles.length) sendStagedFiles(state.activeChat.id);
          input.value = '';
          input.style.height = '';
          input.focus();
        }
        break;
      }
      case 'setLang':
        CI.setLang(actionEl.dataset.lang);
        break;
      case 'filterPriority': {
        var val = actionEl.dataset.value;
        var fp2 = Object.assign({}, state.filterPriority);
        fp2[val] = !fp2[val];
        setState({ filterPriority: fp2 });
        break;
      }
      case 'filterDept': {
        var val = actionEl.dataset.value;
        setState({ filterDept: state.filterDept === val ? null : val });
        break;
      }
      case 'filterClear':
        setState({ filterPriority: {}, filterDept: null });
        break;
      case 'searchGoTask': {
        var id = Number(actionEl.dataset.id);
        var t = allTasks().filter(function (x) { return x.id === id; })[0];
        closeSearch();
        if (t) setState({ activeChat: null, activeView: t.day === TODAY_INDEX ? 'today' : 'week', activeTask: t });
        break;
      }
      case 'searchGoChat': {
        var cid = actionEl.dataset.chatId;
        var ctype = actionEl.dataset.chatType;
        closeSearch();
        if (ctype === 'channel') {
          var ch = CHANNELS.filter(function (c) { return c.id === cid; })[0];
          if (ch) setState({ activeChat: { id: ch.id, name: ch.name, sub: CI.t('dept_channel'), color: ch.bgColor, icon: ch.emoji, iconSize: '15px', radius: '9px', isChannel: true } });
        } else {
          var dm = DMS.filter(function (d) { return d.id === cid; })[0];
          if (dm) setState({ activeChat: { id: dm.id, name: dm.name, sub: dm.role + (dm.online ? ' · ' + CI.t('online') : ''), color: dm.avatarBg, icon: dm.initials, iconSize: '12px', radius: '50%', isChannel: false } });
        }
        break;
      }
      case 'openCreateChannel':
        document.getElementById('createChannelModal').classList.remove('hidden');
        setTimeout(function() { var n = document.getElementById('newChannelName'); if (n) n.focus(); }, 50);
        break;
      case 'closeCreateChannel':
        document.getElementById('createChannelModal').classList.add('hidden');
        document.getElementById('newChannelName').value = '';
        document.getElementById('newChannelEmoji').value = '';
        break;
      case 'submitCreateChannel': {
        var nameEl = document.getElementById('newChannelName');
        var emojiEl = document.getElementById('newChannelEmoji');
        var chName = (nameEl ? nameEl.value.trim() : '').replace(/\s+/g, '-').toLowerCase();
        var chEmoji = (emojiEl ? emojiEl.value.trim() : '') || '#';
        if (chName) {
          createChannel(chName, chEmoji);
          document.getElementById('createChannelModal').classList.add('hidden');
          nameEl.value = ''; emojiEl.value = '';
        } else if (nameEl) {
          nameEl.focus();
        }
        break;
      }
      case 'startEditMsg': {
        var cid2 = actionEl.dataset.chatId;
        var mid2 = actionEl.dataset.msgId;
        var msgRow = document.querySelector('[data-msg-id="' + mid2 + '"]');
        if (!msgRow) break;
        var msgTextEl = msgRow.querySelector('.msg-text');
        if (!msgTextEl) break;
        var curText = msgTextEl.textContent.replace(/\(edited\)$/, '').trim();
        msgTextEl.outerHTML = '<div class="msg-edit-wrap">' +
          '<input class="msg-edit-input" id="editInput_' + mid2 + '" value="' + curText.replace(/"/g, '&quot;') + '" data-chat-id="' + cid2 + '" data-msg-id="' + mid2 + '">' +
          '<button class="msg-edit-save" data-action="saveEditMsg" data-chat-id="' + cid2 + '" data-msg-id="' + mid2 + '">Save</button>' +
          '<button class="msg-edit-cancel" data-action="cancelEditMsg" data-chat-id="' + cid2 + '" data-msg-id="' + mid2 + '">Cancel</button>' +
        '</div>';
        var inp = document.getElementById('editInput_' + mid2);
        if (inp) { inp.focus(); inp.select(); }
        break;
      }
      case 'saveEditMsg': {
        var cid3 = actionEl.dataset.chatId;
        var mid3 = actionEl.dataset.msgId;
        var inp3 = document.getElementById('editInput_' + mid3);
        if (inp3) editMessage(cid3, mid3, inp3.value);
        break;
      }
      case 'cancelEditMsg':
        if (state.activeChat) refreshChatMessages(state.activeChat.id);
        break;
      case 'deleteMsg': {
        var cid4 = actionEl.dataset.chatId;
        var mid4 = actionEl.dataset.msgId;
        if (confirm('Delete this message?')) deleteMessage(cid4, mid4);
        break;
      }
      case 'toggleNotifPanel': {
        var panel = document.getElementById('notifPanel');
        if (panel) {
          var isHidden = panel.classList.toggle('hidden');
          if (!isHidden) renderNotifPanel();
        }
        break;
      }
      case 'goNotif': {
        var ncid = actionEl.dataset.chatId;
        document.getElementById('notifPanel').classList.add('hidden');
        var nch = allChannels().filter(function(c){ return c.id === ncid; })[0];
        if (nch) setState({ activeChat: { id: nch.id, name: nch.name, sub: CI.t('dept_channel'), color: nch.bgColor, icon: nch.emoji, iconSize: '15px', radius: '9px', isChannel: true } });
        break;
      }
      case 'clearNotifs':
        state.notifications = [];
        updateNotifBadge();
        renderNotifPanel();
        break;
      case 'openQuickAdd':
        setState({ showQuickAdd: true });
        break;
      case 'closeQuickAdd':
        setState({ showQuickAdd: false });
        break;
      case 'addTask':
        addTaskFromInput();
        break;
    }
  });

  document.addEventListener('keydown', function (e) {
    var active = document.activeElement;
    if (e.key === 'Enter' && active && active.id === 'quickAddInput') {
      addTaskFromInput();
    }
    if (e.key === 'Enter' && active && active.id === 'chatInput' && !e.shiftKey) {
      e.preventDefault();
      if (state.activeChat) {
        sendMessage(state.activeChat.id, active.value);
        active.value = '';
        active.style.height = '';
      }
    }
    if (e.key === 'Enter' && active && active.id === 'agentTextInput') {
      e.preventDefault();
      var inp2 = document.getElementById('agentTextInput');
      if (inp2 && inp2.value.trim()) { sendAgentMessage(inp2.value.trim(), false); inp2.value = ''; }
    }
    if (e.key === 'Enter' && active && active.id === 'threadInput' && !e.shiftKey) {
      e.preventDefault();
      if (state.activeThread) {
        sendThreadReply(state.activeThread.key, active.value);
        active.value = '';
        active.style.height = '';
      }
    }
    // Save inline message edit on Enter
    if (e.key === 'Enter' && active && active.classList && active.classList.contains('msg-edit-input')) {
      e.preventDefault();
      var cid = active.dataset.chatId;
      var mid = active.dataset.msgId;
      if (cid && mid) editMessage(cid, mid, active.value);
    }
    if (e.key === 'Escape') {
      // Close create-channel modal
      var ccm = document.getElementById('createChannelModal');
      if (ccm && !ccm.classList.contains('hidden')) { ccm.classList.add('hidden'); return; }
      // Close notif panel
      var np = document.getElementById('notifPanel');
      if (np && !np.classList.contains('hidden')) { np.classList.add('hidden'); return; }
      // Cancel inline edit
      if (active && active.classList && active.classList.contains('msg-edit-input')) {
        if (state.activeChat) refreshChatMessages(state.activeChat.id);
        return;
      }
      var dd = document.getElementById('searchDropdown');
      if (dd && !dd.classList.contains('hidden')) { closeSearch(); return; }
      if (state.activeThread) { setState({ activeThread: null }); return; }
      if (state.activeTask) setState({ activeTask: null });
      else if (state.showQuickAdd) setState({ showQuickAdd: false });
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target && (e.target.id === 'chatInput' || e.target.id === 'threadInput')) {
      e.target.style.height = '';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    }
    if (e.target && e.target.id === 'searchInput') {
      runSearch(e.target.value);
    }
  });

  // Close search dropdown and notif panel on outside click
  document.addEventListener('click', function (e) {
    var wrap = document.getElementById('searchWrap');
    if (wrap && !wrap.contains(e.target)) {
      var dd = document.getElementById('searchDropdown');
      if (dd) dd.classList.add('hidden');
    }
    var nbw = document.getElementById('notifPanel');
    var bell = document.querySelector('.notif-bell-wrap');
    if (nbw && bell && !bell.contains(e.target)) {
      nbw.classList.add('hidden');
    }
  }, true);


  // File input change
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'fileInput') {
      stageFiles(e.target.files);
      e.target.value = ''; // reset so same file can be picked again
    }
  });

  // Drag-and-drop onto main content
  document.addEventListener('dragover', function (e) {
    if (!state.activeChat) return;
    e.preventDefault();
    var mc = document.getElementById('mainContent');
    if (mc) mc.classList.add('drag-over');
  });

  document.addEventListener('dragleave', function (e) {
    var mc = document.getElementById('mainContent');
    if (mc && !mc.contains(e.relatedTarget)) mc.classList.remove('drag-over');
  });

  document.addEventListener('drop', function (e) {
    var mc = document.getElementById('mainContent');
    if (mc) mc.classList.remove('drag-over');
    if (!state.activeChat) return;
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files.length) {
      stageFiles(e.dataTransfer.files);
    }
  });


  /* init */

  loadPersisted();
  render();
  initSearch();
  initNotifications();
})();
