import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AisMapScreen } from '../screens/AisMapScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { MessagesListScreen } from '../screens/MessagesListScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { WeatherScreen } from '../screens/WeatherScreen';
import { colors } from '../theme/colors';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Weather: 'partly-sunny',
  Ais: 'boat',
  Messages: 'chatbubbles',
  Profile: 'person-circle',
};

const TAB_LABELS: Record<keyof TabParamList, string> = {
  Weather: 'Vreme',
  Ais: 'Ladje',
  Messages: 'Sporočila',
  Profile: 'Moja ladja',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.sea,
        tabBarInactiveTintColor: colors.mist,
        tabBarLabel: TAB_LABELS[route.name as keyof TabParamList],
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name as keyof TabParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Weather" component={WeatherScreen} />
      <Tab.Screen name="Ais" component={AisMapScreen} />
      <Tab.Screen name="Messages" component={MessagesListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.deepSea },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Klepet' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
