import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text } from 'react-native';

import { StoreContext } from './src/data/StoreContext';
import { useAppStore } from './src/data/store';
import { colors } from './src/theme';

import TodayScreen    from './src/screens/TodayScreen';
import WeekScreen     from './src/screens/WeekScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import MeScreen       from './src/screens/MeScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused, unreadCount }) {
  const icons = { Today: '📋', Week: '📅', Messages: '💬', Me: '👤' };
  return (
    <View style={{ alignItems: 'center' }}>
      <View>
        <Text style={{ fontSize: 20 }}>{icons[label]}</Text>
        {unreadCount > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function App() {
  const store = useAppStore();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreContext.Provider value={store}>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
                tabBarIcon: ({ focused }) => (
                  <TabIcon
                    label={route.name}
                    focused={focused}
                    unreadCount={route.name === 'Messages' ? store.totalUnread : 0}
                  />
                ),
              })}
            >
              <Tab.Screen name="Today"    component={TodayScreen} />
              <Tab.Screen name="Week"     component={WeekScreen} />
              <Tab.Screen name="Messages" component={MessagesScreen} />
              <Tab.Screen name="Me"       component={MeScreen} />
            </Tab.Navigator>
          </NavigationContainer>
        </StoreContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabBar:      { backgroundColor: '#fff', borderTopColor: colors.border, borderTopWidth: 1, height: 60, paddingBottom: 8 },
  tabLabel:    { fontSize: 11 },
  tabBadge:    { position: 'absolute', top: -4, right: -8, backgroundColor: colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
