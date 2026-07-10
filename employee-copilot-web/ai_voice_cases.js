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
        draftBtn.textContent = 'Generating…';
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
          actionEl.textContent = 'Copied!';
          setTimeout(function () { actionEl.textContent = 'Copy'; }, 1500);
        }
        break;
      }
      case 'aiDraftSend': {
        if (state.aiDraftText && state.activeChat) {
          sendMessage(state.activeChat.id, state.aiDraftText);
          setState({ showAIPanel: false });
        } else if (state.aiDraftText) {
          var firstCh = CHANNELS[0];
          var chatObj = { id: firstCh.id, name: firstCh.name, sub: 'Dept. channel', color: firstCh.bgColor, icon: firstCh.emoji, iconSize: '15px', radius: '9px', isChannel: true };
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
