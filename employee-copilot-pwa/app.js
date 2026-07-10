(function () {
  'use strict';

  var CD = window.CopilotData;
  var CI = window.CopilotI18n;
  window.copilotRerender = function () { render(); };

  var DC = CD.DC, PC = CD.PC, PL = CD.PL;
  var STORAGE_KEY = CD.STORAGE_KEY;
  var TASKS_BASE = CD.TASKS_BASE, CHANNELS = CD.CHANNELS, DMS = CD.DMS, CHAT = CD.CHAT, PSETTINGS = CD.PSETTINGS;
  var TODAY = CD.TODAY, WEEK_START = CD.WEEK_START, TODAY_INDEX = CD.TODAY_INDEX;
  var DAY_LETTERS = CD.DAY_LETTERS, WEEKDAY_FULL = CD.WEEKDAY_FULL, MONTH_FULL = CD.MONTH_FULL, WDAYS = CD.WDAYS;
  var fmtRange = CD.fmtRange;
  var esc = CD.esc;
  var ME = { name: 'Sara Ahmed', initials: 'SA', avatarBg: '#0b5389' };
  var AGENT_SERVER = 'http://localhost:3001';

  /* ── state ── */
  var state = {
    activeTab: 'today', activeChat: null, activeTask: null, selectedDay: TODAY_INDEX,
    completedTasks: {}, showAddSheet: false, extraTasks: [], nextId: 13,
    chatMessages: {}, extraChannels: [], notifications: [], activeThread: null,
    stagedFiles: [], showCreateChannel: false, showAgentPanel: false, showNotifPanel: false,
    agentMessages: [], agentListening: false, agentThinking: false, agentSpeaking: false,
    ctxTarget: null
  };

  function loadPersisted() {
    var saved = CD.loadPersisted();
    if (saved) {
      state.completedTasks = saved.completedTasks || {};
      state.extraTasks     = saved.extraTasks || [];
      state.nextId         = saved.nextId || 13;
      state.chatMessages   = saved.chatMessages || {};
      state.extraChannels  = saved.extraChannels || [];
      if (saved.activeTab) state.activeTab = saved.activeTab;
    }
  }

  function persist() {
    CD.persist({
      completedTasks: state.completedTasks, extraTasks: state.extraTasks,
      nextId: state.nextId, activeTab: state.activeTab,
      chatMessages: state.chatMessages, extraChannels: state.extraChannels
    });
  }

  function setState(patch) { Object.assign(state, patch); persist(); render(); }

  /* ── helpers ── */
  function allTasks()    { return TASKS_BASE.concat(state.extraTasks); }
  function allChannels() { return CHANNELS.concat(state.extraChannels); }

  function getChatMsgs(chatId) {
    return state.chatMessages[chatId] ? state.chatMessages[chatId] : (CHAT[chatId] ? CHAT[chatId].slice() : []);
  }

  function nowTime() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

  function toggleTask(id) {
    var ct = Object.assign({}, state.completedTasks);
    ct[id] = !ct[id];
    setState({ completedTasks: ct });
  }

  function enrichTask(t) { return CD.enrichTask(t, state.completedTasks); }
  function translateTask(t) { return Object.assign({}, t, { title: CI.taskTitle(t) }); }

  function addTaskFromInput() {
    var input = document.getElementById('newTaskInput');
    var title = (input.value || '').trim();
    if (!title) return;
    setState({ extraTasks: state.extraTasks.concat([{ id: state.nextId, title: title, dept: 'PMO', dueTime: 'Today', priority: 'medium', day: TODAY_INDEX }]), nextId: state.nextId + 1, showAddSheet: false });
    input.value = '';
  }

  /* ── file helpers ── */
  function fileIcon(type) {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('sheet') || type.includes('excel') || type.includes('xls')) return '📊';
    return '📎';
  }
  function fmtFileSize(b) {
    return b < 1024 ? b + ' B' : b < 1048576 ? (b/1024).toFixed(1) + ' KB' : (b/1048576).toFixed(1) + ' MB';
  }

  function stageFiles(files) {
    var arr = Array.prototype.slice.call(files), pending = arr.length;
    arr.forEach(function(f) {
      var r = new FileReader();
      r.onload = function(ev) {
        state.stagedFiles.push({ name: f.name, type: f.type, size: f.size, dataUrl: ev.target.result });
        if (--pending === 0) renderFileStrip();
      };
      r.readAsDataURL(f);
    });
  }

  function renderFileStrip() {
    var strip = document.getElementById('pwaFileStrip');
    if (!strip) return;
    if (!state.stagedFiles.length) { strip.classList.add('hidden'); strip.innerHTML = ''; return; }
    strip.classList.remove('hidden');
    strip.innerHTML = state.stagedFiles.map(function(f, i) {
      return f.type.startsWith('image/')
        ? '<div class="pwa-file-chip"><img src="' + f.dataUrl + '" class="pwa-file-thumb"><button class="pwa-file-remove" data-action="removeFile" data-idx="' + i + '">×</button></div>'
        : '<div class="pwa-file-chip pwa-file-doc"><span>' + fileIcon(f.type) + '</span><span class="pwa-file-name">' + esc(f.name) + '</span><button class="pwa-file-remove" data-action="removeFile" data-idx="' + i + '">×</button></div>';
    }).join('');
  }

  function sendStagedFiles(chatId) {
    state.stagedFiles.forEach(function(f) {
      appendMsg(chatId, { id: Date.now() + Math.random(), sender: ME.name, initials: ME.initials, avatarBg: ME.avatarBg, mine: true, time: nowTime(), isFile: true, file: f });
    });
    state.stagedFiles = [];
    renderFileStrip();
  }

  function appendMsg(chatId, msg) {
    var upd = Object.assign({}, state.chatMessages);
    upd[chatId] = getChatMsgs(chatId).concat([msg]);
    state.chatMessages = upd;
    persist();
    refreshChatMessages(chatId);
  }

  function sendMessage(chatId, text) {
    text = (text || '').trim();
    if (!text) return;
    appendMsg(chatId, { id: Date.now(), sender: ME.name, initials: ME.initials, avatarBg: ME.avatarBg, text: text, mine: true, time: nowTime() });
    var ch = allChannels().filter(function(c) { return c.id === chatId; })[0];
    if (ch) {
      setTimeout(function() {
        var r = ['Got it, thanks!','On it!','Noted 👍','Will do!','Thanks!'],
            n = ['Khalid Al-Rashid','Layla Hassan','Omar Yousef','Rania Saleh'],
            rN = n[Math.floor(Math.random()*n.length)],
            rT = r[Math.floor(Math.random()*r.length)];
        appendMsg(chatId, { id: Date.now()+1, sender: rN, initials: rN.split(' ').map(function(w){return w[0];}).join('').slice(0,2), avatarBg: '#6b7de3', text: rT, mine: false, time: nowTime() });
        pushNotification(rN + ' replied in #' + ch.name, rT, chatId);
      }, 3000 + Math.random() * 4000);
    }
  }

  function editMessage(chatId, msgId, newText) {
    newText = (newText || '').trim();
    if (!newText) return;
    var upd = Object.assign({}, state.chatMessages);
    upd[chatId] = getChatMsgs(chatId).map(function(m) { return m.id === msgId ? Object.assign({}, m, { text: newText, edited: true }) : m; });
    state.chatMessages = upd;
    persist();
    refreshChatMessages(chatId);
  }

  function deleteMessage(chatId, msgId) {
    var upd = Object.assign({}, state.chatMessages);
    upd[chatId] = getChatMsgs(chatId).filter(function(m) { return m.id !== msgId; });
    state.chatMessages = upd;
    persist();
    refreshChatMessages(chatId);
  }

  function createChannel(name, emoji) {
    var id = 'ch_' + name.replace(/[^a-z0-9]/g, '_');
    if (allChannels().filter(function(c) { return c.id === id; })[0]) return;
    state.extraChannels = state.extraChannels.concat([{ id: id, name: name, emoji: emoji || '#', bgColor: '#4f6ef7' }]);
    persist();
    pushNotification('#' + name + ' created', 'Your new channel is ready!', id);
    render();
  }

  function pushNotification(title, body, chatId) {
    state.notifications.unshift({ id: Date.now(), title: title, body: body, chatId: chatId, time: nowTime() });
    if (state.notifications.length > 20) state.notifications = state.notifications.slice(0, 20);
    updateNotifBadge();
  }

  function updateNotifBadge() {
    var b = document.getElementById('notifBadgePwa');
    if (b) { b.textContent = state.notifications.length; b.classList.toggle('hidden', !state.notifications.length); }
  }

  /* ── threads ── */
  function getThreadMsgs(key) { return state.chatMessages['__thread__' + key] || []; }

  function sendThreadReply(key, text) {
    text = (text || '').trim();
    if (!text) return;
    var upd = Object.assign({}, state.chatMessages);
    upd['__thread__' + key] = getThreadMsgs(key).concat([{ id: Date.now(), sender: ME.name, initials: ME.initials, avatarBg: ME.avatarBg, text: text, mine: true, time: nowTime() }]);
    state.chatMessages = upd;
    persist();
    renderThreadSheet();
  }

  function renderThreadSheet() {
    if (!state.activeThread) return;
    var key = state.activeThread.chatId + ':' + state.activeThread.msgId;
    var orig = getChatMsgs(state.activeThread.chatId).filter(function(m) { return m.id === state.activeThread.msgId; })[0];
    var origEl = document.getElementById('threadOriginalPwa');
    if (origEl && orig) {
      var t = Object.assign({}, orig, { text: CI.msgText(state.activeThread.chatId, orig) });
      origEl.innerHTML = '<div class="thread-orig-bubble">' + esc(t.text) + '<div class="thread-orig-meta">' + esc(t.sender) + ' · ' + esc(t.time) + '</div></div>';
    }
    var replies = getThreadMsgs(key);
    var el = document.getElementById('threadRepliesPwa');
    if (el) {
      el.innerHTML = !replies.length
        ? '<div style="color:#a0aab4;font-size:13px;text-align:center;padding:16px 0;">No replies yet</div>'
        : replies.map(function(m) {
            return '<div class="thread-reply-row' + (m.mine ? ' mine' : '') + '">' +
              '<div class="thread-reply-bubble ' + (m.mine ? 'mine' : 'theirs') + '">' + esc(m.text) + '</div>' +
              '<div class="thread-reply-meta" style="text-align:' + (m.mine ? 'right' : 'left') + ';">' + esc(m.sender) + ' · ' + esc(m.time) + '</div>' +
            '</div>';
          }).join('');
      el.scrollTop = el.scrollHeight;
    }
  }

  /* ── voice agent ── */
  var _recognition = null, _currentAudio = null, SESSION_ID = 'pwa_' + Date.now();

  function speak(text) {
    if (!text) return;
    if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.agentSpeaking = true; updateAgentUI();
    fetch(AGENT_SERVER + '/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text }) })
      .then(function(r) { if (!r.ok) throw new Error('tts'); return r.blob(); })
      .then(function(blob) {
        var url = URL.createObjectURL(blob), audio = new Audio(url);
        _currentAudio = audio;
        audio.onended = function() { state.agentSpeaking = false; updateAgentUI(); URL.revokeObjectURL(url); _currentAudio = null; };
        audio.onerror = function() { state.agentSpeaking = false; updateAgentUI(); _currentAudio = null; };
        audio.play();
      })
      .catch(function() {
        if (window.speechSynthesis) {
          var u = new SpeechSynthesisUtterance(text);
          u.lang = 'en-US';
          u.onend = u.onerror = function() { state.agentSpeaking = false; updateAgentUI(); };
          window.speechSynthesis.speak(u);
        } else { state.agentSpeaking = false; updateAgentUI(); }
      });
  }

  function sendAgentMessage(text, doSpeak) {
    if (!text) return;
    state.agentMessages.push({ role: 'user', text: text });
    state.agentThinking = true; updateAgentUI(); renderAgentMessages();
    fetch(AGENT_SERVER + '/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, sessionId: SESSION_ID }) })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        state.agentThinking = false;
        state.agentMessages.push({ role: 'agent', text: data.text });
        renderAgentMessages(); updateAgentUI();
        if (doSpeak && data.text) speak(data.text);
        if (data.action) executeAgentAction(data.action);
      })
      .catch(function() {
        state.agentThinking = false;
        state.agentMessages.push({ role: 'agent', text: 'Could not reach the agent server.' });
        renderAgentMessages(); updateAgentUI();
      });
  }

  function executeAgentAction(action) {
    if (!action) return;
    if (action.type === 'create_task') {
      state.extraTasks = state.extraTasks.concat([{ id: state.nextId++, title: action.args.title, dept: action.args.dept || 'PMO', dueTime: action.args.due_time || 'Today', priority: action.args.priority || 'medium', day: TODAY_INDEX }]);
      persist();
    } else if (action.type === 'send_message') {
      var target = action.args.to.replace(/^#/, '');
      var ch = allChannels().filter(function(c) { return c.name === target || c.id === target; })[0];
      if (ch) sendMessage(ch.id, action.args.message);
    }
  }

  function renderAgentMessages() {
    var el = document.getElementById('agentMsgsPwa');
    if (!el) return;
    el.innerHTML = state.agentMessages.map(function(m) {
      return '<div class="agent-msg-pwa ' + (m.role === 'user' ? 'user' : 'agent') + '">' + esc(m.text) + '</div>';
    }).join('');
    el.scrollTop = el.scrollHeight;
    var thinking = document.getElementById('agentThinkingPwa');
    if (thinking) thinking.classList.toggle('hidden', !state.agentThinking);
  }

  function updateAgentUI() {
    var orb = document.getElementById('agentOrbPwa'), status = document.getElementById('agentStatusPwa');
    if (!orb) return;
    orb.className = 'agent-orb-pwa' + (state.agentListening ? ' listening' : '') + (state.agentSpeaking ? ' speaking' : '') + (state.agentThinking ? ' thinking' : '');
    if (status) status.textContent = state.agentListening ? 'Listening…' : state.agentSpeaking ? 'Speaking…' : state.agentThinking ? 'Thinking…' : 'Tap to speak';
  }

  function toggleAgentMic() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice not supported. Please type instead.'); return; }
    if (state.agentListening) {
      if (_recognition) _recognition.stop();
      state.agentListening = false; updateAgentUI(); return;
    }
    _recognition = new SR();
    _recognition.lang = 'en-US'; _recognition.continuous = true; _recognition.interimResults = false; _recognition.maxAlternatives = 1;
    _recognition.onstart  = function() { state.agentListening = true; updateAgentUI(); };
    _recognition.onresult = function(ev) {
      var transcript = ev.results[ev.results.length - 1][0].transcript.trim();
      if (!transcript) return;
      _recognition.stop();
      state.agentListening = false; updateAgentUI();
      sendAgentMessage(transcript, true);
    };
    _recognition.onerror = function(ev) {
      if (ev.error === 'no-speech') { if (state.agentListening) { try { _recognition.start(); } catch(_){} } return; }
      state.agentListening = false; updateAgentUI();
    };
    _recognition.onend = function() { if (!state.agentListening) updateAgentUI(); };
    _recognition.start();
  }

  /* ── chat message rendering ── */
  function refreshChatMessages(chatId) {
    var container = document.getElementById('chatMessages');
    if (!container || !state.activeChat || state.activeChat.id !== chatId) return;
    var msgs = getChatMsgs(chatId), chat = state.activeChat;
    container.innerHTML = msgs.map(function(msg) {
      return msgBubbleHTML(Object.assign({}, msg, { text: CI.msgText(chatId, msg) }), chat);
    }).join('');
    container.scrollTop = container.scrollHeight;
    attachLongPress();
  }

  function msgBubbleHTML(msg, chat) {
    var bodyHTML;
    if (msg.isFile && msg.file) {
      var f = msg.file;
      bodyHTML = f.type.startsWith('image/')
        ? '<img class="pwa-attach-img" src="' + f.dataUrl + '" data-action="openLightbox" data-src="' + f.dataUrl + '">'
        : '<div class="pwa-attach-card"><span>' + fileIcon(f.type) + '</span><div><div class="pwa-attach-name">' + esc(f.name) + '</div><div class="pwa-attach-size">' + fmtFileSize(f.size) + '</div></div></div>';
    } else {
      bodyHTML = esc(msg.text) + (msg.edited ? ' <span class="edited-label">(edited)</span>' : '');
    }
    var threadKey = chat.id + ':' + msg.id;
    var tc = getThreadMsgs(threadKey).length;
    var threadBtn = chat.isChannel
      ? '<div class="thread-btn-pwa" data-action="openThreadPwa" data-chat-id="' + esc(chat.id) + '" data-msg-id="' + msg.id + '">↩ ' + (tc > 0 ? tc + ' repl' + (tc === 1 ? 'y' : 'ies') : 'Reply') + '</div>'
      : '';
    return '<div class="chat-msg-row' + (msg.mine ? ' mine' : '') + '" data-msg-id="' + msg.id + '" data-chat-id="' + chat.id + '" data-mine="' + (msg.mine ? '1' : '0') + '">' +
      (!msg.mine ? '<div class="chat-msg-avatar" style="background:' + msg.avatarBg + ';"><span>' + esc(msg.initials) + '</span></div>' : '') +
      '<div class="chat-msg-bubble-wrap">' +
        (!msg.mine && chat.isChannel ? '<div class="chat-msg-sender">' + esc(msg.sender) + '</div>' : '') +
        '<div class="chat-msg-bubble ' + (msg.mine ? 'mine' : 'theirs') + '">' + bodyHTML + '</div>' +
        '<div class="chat-msg-time" style="text-align:' + (msg.mine ? 'right' : 'left') + ';">' + esc(msg.time) + '</div>' +
        threadBtn +
      '</div>' +
    '</div>';
  }

  /* ── long-press ── */
  var _pressTimer = null;

  function attachLongPress() {
    document.querySelectorAll('#chatMessages .chat-msg-row[data-mine="1"]').forEach(function(row) {
      row.addEventListener('touchstart', function(e) {
        var chatId = row.dataset.chatId, msgId = row.dataset.msgId;
        _pressTimer = setTimeout(function() {
          state.ctxTarget = { chatId: chatId, msgId: Number(msgId) || msgId };
          var t = e.touches[0];
          showCtxMenu(t.clientX, t.clientY);
        }, 500);
      }, { passive: true });
      row.addEventListener('touchend',  function() { clearTimeout(_pressTimer); }, { passive: true });
      row.addEventListener('touchmove', function() { clearTimeout(_pressTimer); }, { passive: true });
    });
  }

  function showCtxMenu(x, y) {
    var menu = document.getElementById('msgCtxMenu');
    if (!menu) return;
    menu.classList.remove('hidden');
    menu.style.top  = Math.min(y - 10, window.innerHeight - 140) + 'px';
    menu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  }

  function hideCtxMenu() {
    var menu = document.getElementById('msgCtxMenu');
    if (menu) menu.classList.add('hidden');
    state.ctxTarget = null;
  }

  /* ── RENDER ── */
  function render() {
    var ct = state.completedTasks, tasks = allTasks(), inChat = !!state.activeChat;

    document.getElementById('statusSpacer').classList.toggle('blue', state.activeTab === 'me' && !inChat);
    ['today','week','messages','me'].forEach(function(tab) {
      var on = !inChat && state.activeTab === tab;
      var icon = document.querySelector('[data-tab-icon="' + tab + '"]');
      var lbl  = document.querySelector('[data-tab-label="' + tab + '"]');
      if (icon) icon.classList.toggle('active', on);
      if (lbl)  lbl.classList.toggle('active', on);
    });
    var td = document.querySelector('[data-today-dot]');
    if (td) { var tda = !inChat && state.activeTab === 'today'; td.setAttribute('fill', tda ? '#0b5389' : 'transparent'); td.setAttribute('stroke', tda ? '#0b5389' : 'var(--text-faint)'); }
    var hasUnread = CHANNELS.some(function(c) { return c.unread > 0; }) || DMS.some(function(d) { return d.unread > 0; });
    document.getElementById('unreadDot').classList.toggle('hidden', !hasUnread);
    document.getElementById('mainScreens').classList.toggle('hidden', inChat);
    document.getElementById('tabbar').classList.toggle('hidden', inChat);
    document.getElementById('screen-chat').classList.toggle('hidden', !inChat);
    ['today','week','messages','me'].forEach(function(tab) {
      document.getElementById('screen-' + tab).classList.toggle('hidden', inChat || state.activeTab !== tab);
    });

    /* TODAY */
    if (!inChat && state.activeTab === 'today') {
      var todayRaw = tasks.filter(function(t) { return t.day === TODAY_INDEX; });
      var comp = todayRaw.filter(function(t) { return ct[t.id]; }).length, tot = todayRaw.length, pend = tot - comp;
      var hp = todayRaw.filter(function(t) { return !ct[t.id] && t.priority === 'high'; }).length;
      var h = new Date().getHours();
      var gw = h < 12 ? CI.t('greeting_morning') : h < 17 ? CI.t('greeting_afternoon') : CI.t('greeting_evening');
      var ge = h < 12 ? '☀️' : h < 17 ? '👋' : '🌙';
      var sum = pend === 0 ? CI.t('all_done_msg') : hp > 0 ? pend + ' task' + (pend>1?'s':'') + ' left, ' + hp + ' high priority.' : CI.tf(pend>1?'ontrack_msg_pl':'ontrack_msg',{n:pend});
      var dash = Math.round((tot===0?0:comp/tot)*125.7);
      document.getElementById('todayHero').innerHTML =
        '<div class="today-hero">' +
          '<div class="hero-top"><div class="hero-date">' + WEEKDAY_FULL[TODAY_INDEX] + ', ' + MONTH_FULL[TODAY.getMonth()] + ' ' + TODAY.getDate() + '</div>' +
          '<div class="hero-greeting">' + gw + ', Sara ' + ge + '</div></div>' +
          '<div class="hero-row"><div class="hero-summary">' + sum + '</div>' +
            '<div class="hero-ring"><svg width="52" height="52" viewBox="0 0 52 52">' +
              '<circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="4"/>' +
              '<circle cx="26" cy="26" r="20" fill="none" stroke="white" stroke-width="4" stroke-dasharray="' + dash + ' 125.7" stroke-linecap="round" transform="rotate(-90 26 26)" style="transition:stroke-dasharray 0.4s;"/>' +
            '</svg><div class="hero-ring-label">' + comp + '/' + tot + '</div></div></div>' +
          '<div class="hero-chips"><div class="hero-chip">✓ ' + comp + ' ' + CI.t('chip_done') + '</div>' +
            '<div class="hero-chip">○ ' + pend + ' ' + CI.t('chip_pending') + '</div>' +
            (hp > 0 ? '<div class="hero-chip hero-chip-urgent">🔴 ' + hp + ' urgent</div>' : '') +
          '</div>' +
        '</div>';
      var inc = todayRaw.filter(function(t){return !ct[t.id];}).sort(function(a,b){return ({high:0,medium:1,low:2}[a.priority]||1)-({high:0,medium:1,low:2}[b.priority]||1);});
      var done = todayRaw.filter(function(t){return ct[t.id];});
      var tt = inc.concat(done).map(function(t){return enrichTask(translateTask(t));});
      var feat = tt[0] && !tt[0].completed && tt[0].priority==='high' ? tt[0] : null;
      var rest = feat ? tt.slice(1) : tt;
      document.getElementById('todayTaskList').innerHTML =
        (feat ? '<div class="featured-label">' + CI.t('top_priority') + '</div>' + featuredCardHTML(feat) : '') +
        (rest.length ? '<div class="task-section-label">' + (feat ? CI.t('other_tasks') : CI.t('todays_tasks')) + '</div>' : '') +
        rest.map(function(t){return taskCardHTML(t,{});}).join('') +
        '<div class="add-task-row" data-action="openAddSheet"><div class="add-task-icon"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1V11M1 6H11" stroke="#0b5389" stroke-width="2.5" stroke-linecap="round"/></svg></div><div class="add-task-label">' + CI.t('add_task') + '</div></div>';
      attachSwipeListeners();
    }

    /* WEEK */
    if (!inChat && state.activeTab === 'week') {
      document.getElementById('weekRangeLabel').textContent = fmtRange();
      document.getElementById('dayPills').innerHTML = WDAYS.map(function(d) {
        return '<div class="day-pill' + (d.idx===state.selectedDay?' active':'') + '" data-action="selectDay" data-day="' + d.idx + '"><span class="dp-letter">' + CI.dates('day_letters',d.idx) + '</span><span class="dp-num' + (d.idx===TODAY_INDEX?' today-num':'') + '">' + d.date + '</span></div>';
      }).join('');
      var sel = tasks.filter(function(t){return t.day===state.selectedDay;}), sc = sel.filter(function(t){return ct[t.id];}).length;
      document.getElementById('selectedDayLabel').textContent = WEEKDAY_FULL[state.selectedDay];
      document.getElementById('weekDayCount').textContent = sc + '/' + sel.length;
      document.getElementById('weekProgressFill').style.width = (sel.length===0?0:Math.round(sc/sel.length*100)) + '%';
      var wt = sel.map(function(t){return enrichTask(translateTask(t));});
      document.getElementById('weekTaskList').innerHTML = !wt.length
        ? '<div class="empty-day"><div class="empty-day-emoji">✅</div><div class="empty-day-text">' + CI.t('empty_day') + '</div></div>'
        : wt.map(function(t){return taskCardHTML(t,{showPriorityBadge:true});}).join('') +
          '<div class="add-task-row" data-action="openAddSheet"><div class="add-task-icon"><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1V11M1 6H11" stroke="#0b5389" stroke-width="2.5" stroke-linecap="round"/></svg></div><div class="add-task-label">' + CI.t('add_task') + '</div></div>';
      attachSwipeListeners();
    }

    /* MESSAGES */
    if (!inChat && state.activeTab === 'messages') {
      document.getElementById('channelList').innerHTML = allChannels().map(function(ch) {
        return '<div class="list-row" data-action="openChat" data-chat-type="channel" data-chat-id="' + ch.id + '">' +
          '<div class="list-avatar" style="background:' + (ch.bgColor||'#4f6ef7') + ';border-radius:14px;font-size:18px;">' + ch.emoji + '</div>' +
          '<div class="list-main"><div class="list-row-top"><div class="list-name">#' + esc(ch.name) + '</div><div class="list-time">' + esc(ch.time||'') + '</div></div>' +
          '<div class="list-preview">' + esc(CI.channelLastMsg(ch)) + '</div></div>' +
          (ch.unread>0?'<div class="unread-badge"><span>'+ch.unread+'</span></div>':'') +
        '</div>';
      }).join('');
      document.getElementById('dmList').innerHTML = DMS.map(function(dm) {
        return '<div class="list-row" data-action="openChat" data-chat-type="dm" data-chat-id="' + dm.id + '">' +
          '<div class="list-avatar" style="background:' + dm.avatarBg + ';border-radius:50%;font-size:13px;color:#fff;font-weight:700;">' + dm.initials + (dm.online?'<div class="online-dot"></div>':'') + '</div>' +
          '<div class="list-main"><div class="list-row-top"><div class="list-name">' + esc(dm.name) + '</div><div class="list-time">' + esc(dm.time) + '</div></div>' +
          '<div class="list-preview">' + esc(CI.dmLastMsg(dm)) + '</div></div>' +
          (dm.unread>0?'<div class="unread-badge"><span>'+dm.unread+'</span></div>':'') +
        '</div>';
      }).join('');
    }

    /* ME */
    if (!inChat && state.activeTab === 'me') {
      var tr2 = tasks.filter(function(t){return t.day===TODAY_INDEX;}), c2=tr2.filter(function(t){return ct[t.id];}).length;
      document.getElementById('statDone').textContent    = c2;
      document.getElementById('statPending').textContent = tr2.length - c2;
      document.getElementById('statWeek').textContent    = Object.keys(ct).filter(function(k){return ct[k];}).length;
      document.getElementById('settingsList').innerHTML = PSETTINGS.map(function(s) {
        return '<div class="settings-row"><div class="settings-icon" style="background:'+s.iconBg+';">'+s.icon+'</div><div class="settings-label">'+esc(CI.settingLabel(s.label))+'</div><svg width="7" height="12" viewBox="0 0 7 12" fill="none" style="opacity:0.25;"><path d="M1 1L6 6L1 11" stroke="#223035" stroke-width="2" stroke-linecap="round"/></svg></div>';
      }).join('');
      var ls = document.getElementById('langSwitcherPwa');
      if (ls) ls.innerHTML = CI.langSwitcherHTML();
    }

    /* CHAT */
    if (inChat) {
      var chat = state.activeChat, av = document.getElementById('chatAvatar');
      av.style.background = chat.color; av.style.borderRadius = chat.radius; av.style.fontSize = chat.iconSize; av.textContent = chat.icon;
      document.getElementById('chatTitle').textContent    = chat.name;
      document.getElementById('chatSubtitle').textContent = chat.sub;
      refreshChatMessages(chat.id);
      updateNotifBadge();
    }

    /* sheets */
    document.getElementById('taskDetailOverlay').classList.toggle('hidden', !state.activeTask);
    if (state.activeTask) {
      var at = state.activeTask, isDone = !!ct[at.id];
      document.getElementById('td-priorityBar').style.background = PC[at.priority]||'#dedede';
      document.getElementById('td-title').textContent = at.title;
      document.getElementById('td-dept').textContent = at.dept;
      document.getElementById('td-dept').style.background = DC[at.dept]||'#4f5158';
      document.getElementById('td-due').textContent = CI.t('due_prefix') + ' ' + at.dueTime;
      document.getElementById('td-priority').textContent = at.priority + ' ' + CI.t('priority_suffix');
      document.getElementById('td-priority').style.background = PL[at.priority]||'#f6f7f9';
      document.getElementById('td-priority').style.color = PC[at.priority]||'#4f5158';
      document.getElementById('td-toggleBtn').textContent = isDone ? CI.t('mark_pending') : CI.t('mark_done');
      document.getElementById('td-toggleBtn').style.background = isDone ? '#34c759' : '#0b5389';
    }
    document.getElementById('addTaskOverlay').classList.toggle('hidden', !state.showAddSheet);
    if (state.showAddSheet) setTimeout(function(){var i=document.getElementById('newTaskInput');if(i)i.focus();},50);
    document.getElementById('createChannelOverlay').classList.toggle('hidden', !state.showCreateChannel);
    document.getElementById('threadOverlay').classList.toggle('hidden', !state.activeThread);
    document.getElementById('agentPanelOverlay').classList.toggle('hidden', !state.showAgentPanel);
    document.getElementById('notifOverlayPwa').classList.toggle('hidden', !state.showNotifPanel);
    if (state.activeThread) renderThreadSheet();
    if (state.showAgentPanel) renderAgentMessages();
    if (state.showNotifPanel) renderNotifListPwa();
  }

  function renderNotifListPwa() {
    var el = document.getElementById('notifListPwa');
    if (!el) return;
    el.innerHTML = !state.notifications.length
      ? '<div style="padding:20px;text-align:center;color:#a0aab4;font-size:13px;">No notifications yet</div>'
      : state.notifications.map(function(n) {
          return '<div class="notif-item-pwa" data-action="goNotifPwa" data-chat-id="' + n.chatId + '">' +
            '<div class="notif-title-pwa">' + esc(n.title) + '</div>' +
            '<div class="notif-body-pwa">' + esc(n.body) + '</div>' +
            '<div class="notif-time-pwa">' + esc(n.time) + '</div>' +
          '</div>';
        }).join('');
  }

  /* ── task card HTML ── */
  function taskCardHTML(t, opts) {
    var spb = opts && opts.showPriorityBadge;
    return '<div class="task-swipe-wrap" data-swipe-id="' + t.id + '">' +
      '<div class="swipe-hint swipe-hint-left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg><span>' + CI.t('swipe_defer') + '</span></div>' +
      '<div class="swipe-hint swipe-hint-right"><svg width="18" height="18" viewBox="0 0 13 13" fill="none"><path d="M2 6.5L5.5 10L11 3" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + (t.completed?CI.t('swipe_undo'):CI.t('swipe_done')) + '</span></div>' +
      '<div class="task-card swipe-card">' +
        '<div class="task-card-left"><div class="task-check' + (t.completed?' done':'') + '" data-action="toggleTask" data-id="' + t.id + '">' + (t.completed?'<svg width="10" height="8" viewBox="0 0 13 10" fill="none"><path d="M1.5 5L5.5 9L11.5 1" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>':'') + '</div></div>' +
        '<div class="task-card-body" data-action="openTaskDetail" data-id="' + t.id + '"><div class="task-title' + (t.completed?' done':'') + '">' + esc(t.title) + '</div>' +
          '<div class="task-meta"><div class="task-dept-tag" style="background:' + (DC[t.dept]||'#4f5158') + ';">' + esc(t.dept) + '</div><div class="task-due">' + esc(t.dueTime) + '</div>' + (spb?'<div class="task-priority-dot" style="background:' + (PC[t.priority]||'#ccc') + ';"></div>':'') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function featuredCardHTML(t) {
    return '<div class="featured-card" data-action="openTaskDetail" data-id="' + t.id + '">' +
      '<div class="featured-card-head"><div class="task-check featured-check' + (t.completed?' done':'') + '" data-action="toggleTask" data-id="' + t.id + '">' + (t.completed?'<svg width="11" height="9" viewBox="0 0 13 10" fill="none"><path d="M1.5 5L5.5 9L11.5 1" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>':'') + '</div><div class="priority-flame">🔴</div></div>' +
      '<div class="featured-title' + (t.completed?' done':'') + '">' + esc(t.title) + '</div>' +
      '<div class="featured-meta"><div class="task-dept-tag" style="background:' + (DC[t.dept]||'#4f5158') + ';">' + esc(t.dept) + '</div><div class="task-due" style="color:rgba(255,255,255,0.75);">' + esc(t.dueTime) + '</div></div>' +
    '</div>';
  }

  /* ── swipe ── */
  function attachSwipeListeners() {
    document.querySelectorAll('.task-swipe-wrap').forEach(function(wrap) {
      var card = wrap.querySelector('.swipe-card'), id = Number(wrap.dataset.swipeId), sx = 0, cx = 0, drag = false;
      var THRESH = 80;
      function start(x) { sx = x; drag = true; card.style.transition = 'none'; }
      function move(x) {
        if (!drag) return; cx = x - sx; card.style.transform = 'translateX(' + cx + 'px)';
        wrap.querySelector('.swipe-hint-left').style.opacity  = cx < -20 ? Math.min(1,(-cx-20)/60) : 0;
        wrap.querySelector('.swipe-hint-right').style.opacity = cx >  20 ? Math.min(1,(cx-20)/60)  : 0;
      }
      function end() {
        if (!drag) return; drag = false; card.style.transition = ''; card.style.transform = '';
        wrap.querySelector('.swipe-hint-left').style.opacity = 0; wrap.querySelector('.swipe-hint-right').style.opacity = 0;
        if (cx > THRESH || cx < -THRESH) toggleTask(id);
      }
      wrap.addEventListener('touchstart', function(e){start(e.touches[0].clientX);},{passive:true});
      wrap.addEventListener('touchmove',  function(e){move(e.touches[0].clientX);}, {passive:true});
      wrap.addEventListener('touchend',   end);
    });
  }

  /* ── events ── */
  document.addEventListener('click', function(e) {
    var ctx = document.getElementById('msgCtxMenu');
    if (ctx && !ctx.classList.contains('hidden') && !ctx.contains(e.target)) { hideCtxMenu(); return; }
    var stop = e.target.closest('[data-stop]'), el = e.target.closest('[data-action]');
    if (!el) return;
    if (stop && el !== stop && !stop.contains(el)) return;
    var a = el.dataset.action;
    switch (a) {
      case 'setLang':              CI.setLang(el.dataset.lang); break;
      case 'selectTab':            setState({ activeTab: el.dataset.tab }); break;
      case 'toggleTask':           e.stopPropagation(); toggleTask(Number(el.dataset.id)); break;
      case 'openTaskDetail': { var id=Number(el.dataset.id),t=allTasks().filter(function(x){return x.id===id;})[0]; if(t) setState({activeTask:t}); break; }
      case 'closeTaskDetail':      setState({ activeTask: null }); break;
      case 'toggleActiveTask': { var at=state.activeTask; if(!at) break; var ct3=Object.assign({},state.completedTasks); ct3[at.id]=!ct3[at.id]; setState({completedTasks:ct3,activeTask:null}); break; }
      case 'selectDay':            setState({ selectedDay: Number(el.dataset.day) }); break;
      case 'openChat': {
        var type = el.dataset.chatType;
        if (type==='channel') { var ch=allChannels().filter(function(c){return c.id===el.dataset.chatId;})[0]; if(ch) setState({activeChat:{id:ch.id,name:ch.name,sub:CI.t('dept_channel'),color:ch.bgColor||'#4f6ef7',icon:ch.emoji,iconSize:'18px',radius:'14px',isChannel:true}}); }
        else { var dm=DMS.filter(function(d){return d.id===el.dataset.chatId;})[0]; if(dm) setState({activeChat:{id:dm.id,name:dm.name,sub:CI.dmRole(dm)+(dm.online?' · '+CI.t('online'):''),color:dm.avatarBg,icon:dm.initials,iconSize:'14px',radius:'50%',isChannel:false}}); }
        break;
      }
      case 'closeChat':            setState({ activeChat: null, stagedFiles: [] }); renderFileStrip(); break;
      case 'sendChatMsg': {
        var inp = document.getElementById('chatInput');
        if (state.activeChat) { if(inp&&inp.value.trim()){sendMessage(state.activeChat.id,inp.value.trim());inp.value='';inp.style.height='';} if(state.stagedFiles.length) sendStagedFiles(state.activeChat.id); }
        break;
      }
      case 'removeFile': { var idx=Number(el.dataset.idx); state.stagedFiles.splice(idx,1); renderFileStrip(); break; }
      case 'openAddSheet':         setState({ showAddSheet: true }); break;
      case 'closeAddSheet':        document.getElementById('newTaskInput').value=''; setState({ showAddSheet: false }); break;
      case 'addTask':              addTaskFromInput(); break;
      case 'openCreateChannel':    setState({ showCreateChannel: true }); break;
      case 'closeCreateChannel':   document.getElementById('newChannelName').value=''; document.getElementById('newChannelEmoji').value=''; setState({ showCreateChannel: false }); break;
      case 'submitCreateChannel': {
        var ne=document.getElementById('newChannelName'),ee=document.getElementById('newChannelEmoji');
        var cn=(ne?ne.value.trim():'').replace(/\s+/g,'-').toLowerCase(),ce=(ee?ee.value.trim():'')||'#';
        if(cn){createChannel(cn,ce);ne.value='';ee.value='';setState({showCreateChannel:false});}else if(ne)ne.focus();
        break;
      }
      case 'openThreadPwa':        setState({ activeThread: { chatId: el.dataset.chatId, msgId: Number(el.dataset.msgId)||el.dataset.msgId } }); break;
      case 'closeThread':          setState({ activeThread: null }); break;
      case 'sendThreadReplyPwa': {
        var ti=document.getElementById('threadInputPwa');
        if(ti&&ti.value.trim()&&state.activeThread){var k=state.activeThread.chatId+':'+state.activeThread.msgId;sendThreadReply(k,ti.value.trim());ti.value='';} break;
      }
      case 'ctxEdit': {
        if(!state.ctxTarget){hideCtxMenu();break;}
        var ct4=state.ctxTarget; hideCtxMenu();
        var orig=getChatMsgs(ct4.chatId).filter(function(m){return m.id===ct4.msgId;})[0];
        if(!orig)break;
        var ntext=prompt('Edit message:',orig.text);
        if(ntext!==null) editMessage(ct4.chatId,ct4.msgId,ntext);
        break;
      }
      case 'ctxDelete': {
        if(!state.ctxTarget){hideCtxMenu();break;}
        var ct5=state.ctxTarget; hideCtxMenu();
        if(confirm('Delete this message?')) deleteMessage(ct5.chatId,ct5.msgId); break;
      }
      case 'ctxReply': {
        if(!state.ctxTarget){hideCtxMenu();break;}
        var ct6=state.ctxTarget; hideCtxMenu();
        setState({activeThread:{chatId:ct6.chatId,msgId:ct6.msgId}}); break;
      }
      case 'openAgentPanel':       setState({ showAgentPanel: true }); break;
      case 'closeAgentPanel':      setState({ showAgentPanel: false }); break;
      case 'toggleAgentMicPwa':    toggleAgentMic(); break;
      case 'sendAgentTextPwa': { var ai=document.getElementById('agentInputPwa'); if(ai&&ai.value.trim()){sendAgentMessage(ai.value.trim(),false);ai.value='';} break; }
      case 'toggleNotifPanelPwa':  setState({ showNotifPanel: !state.showNotifPanel }); break;
      case 'closeNotifPanelPwa':   setState({ showNotifPanel: false }); break;
      case 'goNotifPwa': {
        var ncid=el.dataset.chatId; setState({showNotifPanel:false});
        var nch=allChannels().filter(function(c){return c.id===ncid;})[0];
        if(nch) setState({activeChat:{id:nch.id,name:nch.name,sub:CI.t('dept_channel'),color:nch.bgColor||'#4f6ef7',icon:nch.emoji,iconSize:'18px',radius:'14px',isChannel:true}});
        break;
      }
      case 'clearNotifsPwa':       state.notifications=[]; updateNotifBadge(); setState({showNotifPanel:false}); break;
      case 'openLightbox': {
        var src=el.dataset.src,lb=document.getElementById('pwaLightbox'),lbi=document.getElementById('pwaLightboxImg');
        if(lb&&lbi&&src){lbi.src=src;lb.classList.remove('hidden');} break;
      }
      case 'closeLightbox': { var lb2=document.getElementById('pwaLightbox'); if(lb2)lb2.classList.add('hidden'); break; }
    }
  });

  document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'chatFileInput') { stageFiles(e.target.files); e.target.value = ''; }
  });

  document.addEventListener('input', function(e) {
    if (e.target && (e.target.id === 'chatInput' || e.target.id === 'threadInputPwa')) {
      e.target.style.height = ''; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
    }
  });

  document.addEventListener('keydown', function(e) {
    var a = document.activeElement;
    if (e.key === 'Enter' && !e.shiftKey) {
      if (a && a.id === 'newTaskInput') { addTaskFromInput(); e.preventDefault(); }
      if (a && a.id === 'chatInput' && state.activeChat) {
        e.preventDefault();
        if (a.value.trim()) { sendMessage(state.activeChat.id, a.value.trim()); a.value = ''; a.style.height = ''; }
        if (state.stagedFiles.length) sendStagedFiles(state.activeChat.id);
      }
      if (a && a.id === 'threadInputPwa' && state.activeThread) {
        e.preventDefault();
        var k = state.activeThread.chatId + ':' + state.activeThread.msgId;
        sendThreadReply(k, a.value.trim()); a.value = ''; a.style.height = '';
      }
      if (a && a.id === 'agentInputPwa') { e.preventDefault(); if(a.value.trim()){sendAgentMessage(a.value.trim(),false);a.value='';} }
    }
    if (e.key === 'Escape') {
      if (state.showCreateChannel) { setState({showCreateChannel:false}); return; }
      if (state.activeThread)      { setState({activeThread:null});       return; }
      if (state.showAgentPanel)    { setState({showAgentPanel:false});    return; }
      if (state.showNotifPanel)    { setState({showNotifPanel:false});    return; }
      if (state.showAddSheet)      { setState({showAddSheet:false});      return; }
      if (state.activeTask)        { setState({activeTask:null});         return; }
      if (state.activeChat)        { setState({activeChat:null,stagedFiles:[]}); renderFileStrip(); }
    }
  });

  /* init */
  loadPersisted();
  render();
  if ('serviceWorker' in navigator) window.addEventListener('load', function() { navigator.serviceWorker.register('service-worker.js').catch(function(){}); });
})();
