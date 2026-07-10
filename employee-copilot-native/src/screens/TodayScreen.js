import React, { useContext, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, PanResponder, Dimensions, TextInput, Modal,
  SafeAreaView, StatusBar,
} from 'react-native';
import { colors, radius, spacing } from '../theme';
import { PRIORITY_COLORS, PRIORITY_BG } from '../data/mockData';
import { StoreContext } from '../data/StoreContext';

const SCREEN_W = Dimensions.get('window').width;
const SWIPE_THRESHOLD   = 80;
const SWIPE_DISMISS     = SCREEN_W * 0.55;

/* ── Hero card ── */
function HeroCard({ user, pendingCount, doneCount, highCount }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const emoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙';
  const firstName = user.name.split(' ')[0];

  const total = pendingCount + doneCount;
  const pct   = total > 0 ? doneCount / total : 0;
  const R = 22, CIRC = 2 * Math.PI * R;
  const dash = CIRC * (1 - pct);

  let summary = 'You\'re all caught up! Great work.';
  if (highCount > 0 && pendingCount > 0)
    summary = `${pendingCount} task${pendingCount > 1 ? 's' : ''} pending — ${highCount} urgent. Let\'s knock them out.`;
  else if (pendingCount > 0)
    summary = `${pendingCount} task${pendingCount > 1 ? 's' : ''} on your plate today. You\'ve got this.`;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.hero}>
      <StatusBar barStyle="light-content" />
      <View style={styles.heroTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroDate}>{today}</Text>
          <Text style={styles.heroGreeting}>Good {greet}, {firstName} {emoji}</Text>
        </View>
        {/* SVG-like progress ring using border trick */}
        <View style={styles.ringWrap}>
          <Text style={styles.ringPct}>{Math.round(pct * 100)}%</Text>
          <Text style={styles.ringLabel}>done</Text>
        </View>
      </View>
      <Text style={styles.heroSummary}>{summary}</Text>
      <View style={styles.heroChips}>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipNum}>{doneCount}</Text>
          <Text style={styles.heroChipLbl}>done</Text>
        </View>
        <View style={styles.heroChip}>
          <Text style={styles.heroChipNum}>{pendingCount}</Text>
          <Text style={styles.heroChipLbl}>pending</Text>
        </View>
        {highCount > 0 && (
          <View style={[styles.heroChip, styles.heroChipUrgent]}>
            <Text style={[styles.heroChipNum, { color: '#fff' }]}>{highCount}</Text>
            <Text style={[styles.heroChipLbl, { color: 'rgba(255,255,255,0.8)' }]}>urgent</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ── Featured task card (top priority) ── */
function FeaturedCard({ task, onToggle, onDefer }) {
  if (!task) return null;
  return (
    <View style={styles.featuredWrap}>
      <Text style={styles.featuredLabel}>🔴  Top Priority</Text>
      <View style={styles.featuredCard}>
        <View style={[styles.featuredStripe, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
        <View style={{ flex: 1, padding: 14 }}>
          <Text style={styles.featuredTitle}>{task.title}</Text>
          <View style={styles.featuredMeta}>
            <Text style={styles.metaTag}>{task.dept}</Text>
            <Text style={styles.metaTag}>{task.due}</Text>
          </View>
          <View style={styles.featuredActions}>
            <TouchableOpacity style={styles.featuredBtn} onPress={() => onToggle(task.id)}>
              <Text style={styles.featuredBtnTxt}>✓ Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.featuredBtn, styles.featuredBtnOutline]} onPress={() => onDefer(task.id)}>
              <Text style={[styles.featuredBtnTxt, { color: colors.textSecondary }]}>→ Defer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ── Swipeable task row ── */
function SwipeableTask({ task, onToggle, onDefer, onPress }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiping, setSwiping] = useState(false);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => setSwiping(true),
    onPanResponderMove: (_, g) => translateX.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_DISMISS) {
        Animated.timing(translateX, { toValue: SCREEN_W, useNativeDriver: true, duration: 200 }).start(() => onToggle(task.id));
      } else if (g.dx < -SWIPE_DISMISS) {
        Animated.timing(translateX, { toValue: -SCREEN_W, useNativeDriver: true, duration: 200 }).start(() => onDefer(task.id));
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 180, friction: 12 }).start();
      }
      setSwiping(false);
    },
    onPanResponderTerminate: () => {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      setSwiping(false);
    },
  })).current;

  const bg = translateX.interpolate({
    inputRange: [-SCREEN_W, -SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD, SCREEN_W],
    outputRange: ['#ff9500', '#fff7ed', '#fff', '#edfff2', '#34c759'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.taskWrap, { backgroundColor: bg }]} {...panResponder.panHandlers}>
      {/* Swipe hints */}
      <View style={styles.swipeHintLeft}>
        <Text style={styles.swipeHintTxt}>→ Defer</Text>
      </View>
      <View style={styles.swipeHintRight}>
        <Text style={styles.swipeHintTxt}>Complete ✓</Text>
      </View>
      <Animated.View style={{ transform: [{ translateX }] }}>
        <TouchableOpacity
          style={[styles.taskCard, task.done && styles.taskCardDone]}
          onPress={() => onPress(task)}
          activeOpacity={0.85}
        >
          <TouchableOpacity style={[styles.checkbox, task.done && styles.checkboxDone]} onPress={() => onToggle(task.id)}>
            {task.done && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.taskTitle, task.done && styles.taskTitleDone]} numberOfLines={2}>{task.title}</Text>
            <View style={styles.taskMeta}>
              <Text style={styles.taskMetaTag}>{task.dept}</Text>
              <Text style={[styles.taskPriority, { color: PRIORITY_COLORS[task.priority] }]}>● {task.priority}</Text>
              <Text style={styles.taskDue}>{task.due}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

/* ── Add Task Modal ── */
function AddTaskModal({ visible, onClose, onAdd }) {
  const [text, setText] = useState('');
  const submit = () => { if (text.trim()) { onAdd(text.trim()); setText(''); onClose(); } };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>New Task</Text>
        <TextInput
          style={styles.taskInput}
          placeholder="What needs to be done?"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          autoFocus
          returnKeyType="done"
        />
        <View style={styles.sheetActions}>
          <TouchableOpacity style={styles.btnPrimary} onPress={submit}>
            <Text style={styles.btnPrimaryTxt}>Add Task</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnIcon} onPress={onClose}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* ── Main screen ── */
export default function TodayScreen() {
  const { tasks, user, pendingCount, doneCount, highCount, toggleTask, addTask, deferTask } = useContext(StoreContext);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const pending  = tasks.filter(t => !t.done);
  const done     = tasks.filter(t => t.done);
  const featured = pending.find(t => t.priority === 'high');
  const rest     = pending.filter(t => t !== featured);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <HeroCard user={user} pendingCount={pendingCount} doneCount={doneCount} highCount={highCount} />

        {featured && (
          <FeaturedCard task={featured} onToggle={toggleTask} onDefer={deferTask} />
        )}

        {rest.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{featured ? 'Other tasks' : "Today's tasks"}</Text>
            {rest.map(t => (
              <SwipeableTask
                key={t.id}
                task={t}
                onToggle={toggleTask}
                onDefer={deferTask}
                onPress={setSelectedTask}
              />
            ))}
          </View>
        )}

        {done.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Completed</Text>
            {done.map(t => (
              <SwipeableTask
                key={t.id}
                task={t}
                onToggle={toggleTask}
                onDefer={deferTask}
                onPress={setSelectedTask}
              />
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabTxt}>＋</Text>
      </TouchableOpacity>

      <AddTaskModal visible={showAdd} onClose={() => setShowAdd(false)} onAdd={addTask} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },

  /* Hero */
  hero: {
    backgroundColor: colors.heroTop,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroTop:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  heroDate:     { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 3 },
  heroGreeting: { color: '#fff', fontSize: 22, fontWeight: '700' },
  heroSummary:  { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  heroChips:    { flexDirection: 'row', gap: 8 },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  heroChipUrgent: { backgroundColor: colors.danger },
  heroChipNum:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  heroChipLbl:  { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  ringWrap: {
    width: 56, height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  ringPct:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  ringLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9 },

  /* Featured */
  featuredWrap: { padding: spacing.md, paddingBottom: 0 },
  featuredLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  featuredCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  featuredStripe: { width: 4 },
  featuredTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  featuredMeta:  { flexDirection: 'row', gap: 8, marginBottom: 14 },
  metaTag:       { backgroundColor: colors.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, color: colors.textSecondary },
  featuredActions: { flexDirection: 'row', gap: 8 },
  featuredBtn:      { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 8, alignItems: 'center' },
  featuredBtnOutline: { backgroundColor: colors.bg },
  featuredBtnTxt:   { color: '#fff', fontSize: 13, fontWeight: '600' },

  /* Section */
  section:      { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  sectionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted, marginBottom: 8 },

  /* Swipeable task */
  taskWrap: { borderRadius: radius.md, marginBottom: 8, overflow: 'hidden', position: 'relative' },
  swipeHintLeft:  { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center' },
  swipeHintRight: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  swipeHintTxt:   { fontSize: 12, color: colors.textSecondary },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  taskCardDone:  { opacity: 0.6 },
  checkbox:      { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone:  { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark:     { color: '#fff', fontSize: 12, fontWeight: '700' },
  taskTitle:     { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 4 },
  taskTitleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  taskMeta:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskMetaTag:   { fontSize: 11, color: colors.textSecondary },
  taskPriority:  { fontSize: 11, fontWeight: '600' },
  taskDue:       { fontSize: 11, color: colors.textMuted },

  /* Add modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle:  { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:   { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  taskInput:    { backgroundColor: colors.bg, borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.text, marginBottom: 16 },
  sheetActions: { flexDirection: 'row', gap: 10 },
  btnPrimary:   { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  btnPrimaryTxt:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  btnIcon:      { width: 48, height: 48, backgroundColor: colors.bg, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  fabTxt: { color: '#fff', fontSize: 26, lineHeight: 30 },
});
