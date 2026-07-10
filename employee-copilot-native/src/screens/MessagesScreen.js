import React, { useContext, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, TextInput, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { colors, radius, spacing } from '../theme';
import { StoreContext } from '../data/StoreContext';

function Avatar({ initials, color, size = 42, online }) {
  return (
    <View style={{ position: 'relative' }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color || colors.primary }]}>
        <Text style={[styles.avatarTxt, { fontSize: size * 0.35 }]}>{initials}</Text>
      </View>
      {online !== undefined && (
        <View style={[styles.onlineDot, online ? styles.onlineDotOn : styles.onlineDotOff]} />
      )}
    </View>
  );
}

function ChatRow({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.chatRow} onPress={() => onPress(item)}>
      <Avatar initials={item.initials} color={item.color} online={item.online} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.chatRowTop}>
          <Text style={styles.chatName}>{item.name}</Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadTxt}>{item.unread}</Text>
            </View>
          )}
        </View>
        <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMsg}</Text>
      </View>
    </TouchableOpacity>
  );
}

function ChatView({ chat, onBack, chatMessages, sendMessage }) {
  const [text, setText] = useState('');
  const msgs = chatMessages[chat.id] || [];
  const send = () => { if (text.trim()) { sendMessage(chat.id, text.trim()); setText(''); } };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Nav */}
      <View style={styles.chatNav}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Avatar initials={chat.initials} color={chat.color} size={34} online={chat.online} />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.chatNavTitle}>{chat.name}</Text>
          {chat.online !== undefined && <Text style={styles.chatNavSub}>{chat.online ? 'Online' : 'Offline'}</Text>}
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={msgs}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={{ padding: spacing.md, gap: 12 }}
        ListEmptyComponent={<Text style={styles.emptyChat}>No messages yet. Say hi 👋</Text>}
        renderItem={({ item: m }) => (
          <View style={[styles.bubble, m.isMine && styles.bubbleMine]}>
            <Text style={[styles.bubbleTxt, m.isMine && styles.bubbleTxtMine]}>{m.text}</Text>
            <Text style={styles.bubbleTime}>{m.time}</Text>
          </View>
        )}
      />

      {/* Composer */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder="Message…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send}>
            <Text style={styles.sendArrow}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function MessagesScreen() {
  const { channels, dms, chatMessages, sendMessage } = useContext(StoreContext);
  const [activeChat, setActiveChat] = useState(null);

  if (activeChat) {
    return <ChatView chat={activeChat} onBack={() => setActiveChat(null)} chatMessages={chatMessages} sendMessage={sendMessage} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search messages</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Departments</Text>
          {channels.map(c => <ChatRow key={c.id} item={c} onPress={setActiveChat} />)}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Direct Messages</Text>
          {dms.map(d => <ChatRow key={d.id} item={d} onPress={setActiveChat} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg },
  header:          { backgroundColor: '#fff', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle:     { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 10 },
  searchBox:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  searchIcon:      { fontSize: 13 },
  searchPlaceholder: { color: colors.textMuted, fontSize: 13 },
  section:         { padding: spacing.md, paddingBottom: 0 },
  sectionLabel:    { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted, marginBottom: 8 },
  chatRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginBottom: 8 },
  avatar:          { alignItems: 'center', justifyContent: 'center' },
  avatarTxt:       { color: '#fff', fontWeight: '700' },
  onlineDot:       { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  onlineDotOn:     { backgroundColor: colors.success },
  onlineDotOff:    { backgroundColor: colors.textMuted },
  chatRowTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  chatName:        { fontSize: 15, fontWeight: '600', color: colors.text },
  unreadBadge:     { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1 },
  unreadTxt:       { color: '#fff', fontSize: 11, fontWeight: '700' },
  lastMsg:         { fontSize: 13, color: colors.textSecondary },
  /* chat view */
  chatNav:         { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: '#fff' },
  backBtn:         { marginRight: 8 },
  backArrow:       { fontSize: 28, color: colors.primary, lineHeight: 32 },
  chatNavTitle:    { fontSize: 15, fontWeight: '700', color: colors.text },
  chatNavSub:      { fontSize: 12, color: colors.textSecondary },
  emptyChat:       { textAlign: 'center', color: colors.textMuted, marginTop: 60, fontSize: 14 },
  bubble:          { alignSelf: 'flex-start', backgroundColor: colors.bg, borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, maxWidth: '75%' },
  bubbleMine:      { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  bubbleTxt:       { fontSize: 14, color: colors.text },
  bubbleTxtMine:   { color: '#fff' },
  bubbleTime:      { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  composer:        { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#fff' },
  composerInput:   { flex: 1, backgroundColor: colors.bg, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 100 },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendArrow:       { color: '#fff', fontSize: 18, fontWeight: '700' },
});
