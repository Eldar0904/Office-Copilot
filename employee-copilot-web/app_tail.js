
          if (ch) setState({ activeChat: { id: ch.id, name: ch.name, sub: 'Dept. channel', color: ch.bgColor, icon: ch.emoji, iconSize: '15px', radius: '9px', isChannel: true }, activeThread: null });
        } else {
          var dm = DMS.filter(function (d) { return d.id === actionEl.dataset.chatId; })[0];
          if (dm) setState({ activeChat: { id: dm.id, name: dm.name, sub: dm.role + (dm.online ? ' · Online' : ''), color: dm.avatarBg, icon: dm.initials, iconSize: '12px', radius: '50%', isChannel: false }, activeThread: null });
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
      case 'sendChatMsg': {
        var input = document.getElementById('chatInput');
        if (input && state.activeChat) {
          sendMessage(state.activeChat.id, input.value);
          input.value = '';
          input.style.height = '';
          input.focus();
        }
        break;
      }
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
          if (ch) setState({ activeChat: { id: ch.id, name: ch.name, sub: 'Dept. channel', color: ch.bgColor, icon: ch.emoji, iconSize: '15px', radius: '9px', isChannel: true } });
        } else {
          var dm = DMS.filter(function (d) { return d.id === cid; })[0];
          if (dm) setState({ activeChat: { id: dm.id, name: dm.name, sub: dm.role + (dm.online ? ' · Online' : ''), color: dm.avatarBg, icon: dm.initials, iconSize: '12px', radius: '50%', isChannel: false } });
        }
        break;
      }
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
    if (e.key === 'Enter' && active && active.id === 'threadInput' && !e.shiftKey) {
      e.preventDefault();
      if (state.activeThread) {
        sendThreadReply(state.activeThread.key, active.value);
        active.value = '';
        active.style.height = '';
      }
    }
    if (e.key === 'Escape') {
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

  // Close search dropdown on outside click
  document.addEventListener('click', function (e) {
    var wrap = document.getElementById('searchWrap');
    if (wrap && !wrap.contains(e.target)) {
      var dd = document.getElementById('searchDropdown');
      if (dd) dd.classList.add('hidden');
    }
  }, true);

  /* init */

  loadPersisted();
  render();
})();
