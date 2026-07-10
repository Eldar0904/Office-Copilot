// Central state store — will connect to Supabase later
// Currently uses local in-memory state + AsyncStorage for persistence

import { useState, useCallback } from 'react';
import { TASKS, CHANNELS, DMS, CURRENT_USER } from './mockData';

// Shared state atom — lifted into AppNavigator via context
export function useAppStore() {
  const [tasks, setTasks] = useState(TASKS);
  const [channels] = useState(CHANNELS);
  const [dms] = useState(DMS);
  const [user] = useState(CURRENT_USER);
  const [chatMessages, setChatMessages] = useState({});

  const toggleTask = useCallback((id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  const addTask = useCallback((title) => {
    const newTask = {
      id: Date.now(),
      title,
      dept: user.dept,
      priority: 'medium',
      due: 'Today',
      done: false,
    };
    setTasks(prev => [...prev, newTask]);
  }, [user.dept]);

  const deferTask = useCallback((id) => {
    setTasks(prev => {
      const original = prev.find(t => t.id === id);
      if (!original) return prev;
      return prev
        .map(t => t.id === id ? { ...t, done: true } : t)
        .concat({ ...original, id: Date.now(), due: 'Tomorrow', done: false });
    });
  }, []);

  const sendMessage = useCallback((chatId, text) => {
    const msg = {
      id: Date.now(),
      text,
      sender: user.name,
      initials: user.initials,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMine: true,
    };
    setChatMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), msg],
    }));
  }, [user]);

  const pendingCount = tasks.filter(t => !t.done).length;
  const doneCount    = tasks.filter(t => t.done).length;
  const highCount    = tasks.filter(t => !t.done && t.priority === 'high').length;
  const totalUnread  = [...channels, ...dms].reduce((s, c) => s + (c.unread || 0), 0);

  return {
    tasks, channels, dms, user, chatMessages,
    pendingCount, doneCount, highCount, totalUnread,
    toggleTask, addTask, deferTask, sendMessage,
  };
}
