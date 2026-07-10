import React, { useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { StoreContext } from '../data/StoreContext';

const SETTINGS = [
  { icon: '🔔', label: 'Notifications', hint: 'All on' },
  { icon: '🎨', label: 'Appearance',    hint: 'Light' },
  { icon: '🔒', label: 'Privacy',       hint: '' },
  { icon: '📱', label: 'Linked Devices',hint: '1 device' },
  { icon: 'ℹ️', label: 'About',         hint: 'v1.0.0' },
];

export default function MeScreen() {
  const { user, pendingCount, doneCount, tasks } = useContext(StoreContext);
  const weekCount = tasks.filter(t => t.done).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{user.initials}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>{user.role} · {user.dept}</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusTxt}>Available</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { val: doneCount,   lbl: 'Done today',  color: colors.primary },
            { val: pendingCount,lbl: 'Pending',      color: colors.accent },
            { val: weekCount,   lbl: 'This week',    color: colors.success },
          ].map(s => (
            <View key={s.lbl} style={styles.statCard}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Settings list */}
        <View style={styles.settingsSection}>
          {SETTINGS.map((s, i) => (
            <TouchableOpacity key={s.label} style={[styles.settingsRow, i === SETTINGS.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.settingsIcon}>{s.icon}</Text>
              <Text style={styles.settingsLabel}>{s.label}</Text>
              <View style={{ flex: 1 }} />
              {s.hint ? <Text style={styles.settingsHint}>{s.hint}</Text> : null}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.bg },
  hero:           { alignItems: 'center', backgroundColor: '#fff', paddingVertical: 32, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar:         { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarTxt:      { color: '#fff', fontSize: 26, fontWeight: '700' },
  name:           { fontSize: 20, fontWeight: '700', color: colors.text },
  role:           { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  statusRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  statusDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  statusTxt:      { fontSize: 13, color: colors.success, fontWeight: '500' },
  statsRow:       { flexDirection: 'row', gap: 12, padding: spacing.md },
  statCard:       { flex: 1, backgroundColor: '#fff', borderRadius: radius.md, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statVal:        { fontSize: 24, fontWeight: '700' },
  statLbl:        { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  settingsSection:{ backgroundColor: '#fff', marginHorizontal: spacing.md, borderRadius: radius.lg, overflow: 'hidden' },
  settingsRow:    { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  settingsIcon:   { fontSize: 18, width: 24, textAlign: 'center' },
  settingsLabel:  { fontSize: 15, color: colors.text },
  settingsHint:   { fontSize: 13, color: colors.textMuted, marginRight: 4 },
  chevron:        { fontSize: 20, color: colors.textMuted },
});
