import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { PRIORITY_COLORS } from '../data/mockData';
import { StoreContext } from '../data/StoreContext';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}

export default function WeekScreen() {
  const { tasks, toggleTask } = useContext(StoreContext);
  const [activeDay, setActiveDay] = useState('Today');

  const dayTasks = tasks.filter(t => {
    if (activeDay === 'Today') return t.due === 'Today';
    if (activeDay === 'Tomorrow') return t.due === 'Tomorrow';
    return t.due === activeDay;
  });

  const done    = dayTasks.filter(t => t.done).length;
  const total   = dayTasks.length;
  const pct     = total > 0 ? done / total : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.weekRange}>{getWeekRange()}</Text>
        <Text style={styles.headerTitle}>Weekly Planner</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md }}>
          {['Today', 'Tomorrow', ...DAYS].map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.pill, activeDay === d && styles.pillActive]}
              onPress={() => setActiveDay(d)}
            >
              <Text style={[styles.pillTxt, activeDay === d && styles.pillTxtActive]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{activeDay}</Text>
          <Text style={styles.progressCount}>{done}/{total}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>
        {dayTasks.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>No tasks for {activeDay} 🎉</Text>
          </View>
        )}
        {dayTasks.map(t => (
          <TouchableOpacity key={t.id} style={[styles.taskCard, t.done && { opacity: 0.55 }]} onPress={() => toggleTask(t.id)}>
            <View style={[styles.checkbox, t.done && styles.checkboxDone]}>
              {t.done && <Text style={styles.check}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskTitle, t.done && styles.taskDone]}>{t.title}</Text>
              <View style={styles.taskMeta}>
                <Text style={styles.metaTag}>{t.dept}</Text>
                <Text style={[styles.priority, { color: PRIORITY_COLORS[t.priority] }]}>● {t.priority}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: '#fff', paddingTop: spacing.md, paddingHorizontal: spacing.md, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  weekRange:    { fontSize: 11, color: colors.textMuted, marginBottom: 2 },
  headerTitle:  { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
  pillRow:      { marginHorizontal: -spacing.md, marginBottom: 12 },
  pill:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.bg },
  pillActive:   { backgroundColor: colors.primary },
  pillTxt:      { fontSize: 13, color: colors.textSecondary },
  pillTxtActive:{ color: '#fff', fontWeight: '600' },
  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel:{ fontSize: 13, color: colors.text, fontWeight: '500' },
  progressCount:{ fontSize: 13, color: colors.textSecondary },
  progressTrack:{ height: 5, backgroundColor: colors.bg, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  empty:        { alignItems: 'center', paddingTop: 60 },
  emptyTxt:     { color: colors.textMuted, fontSize: 15 },
  taskCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginBottom: 8, gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  checkbox:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  check:        { color: '#fff', fontSize: 11, fontWeight: '700' },
  taskTitle:    { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 4 },
  taskDone:     { textDecorationLine: 'line-through', color: colors.textMuted },
  taskMeta:     { flexDirection: 'row', gap: 8 },
  metaTag:      { fontSize: 11, color: colors.textSecondary },
  priority:     { fontSize: 11, fontWeight: '600' },
});
