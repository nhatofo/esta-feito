import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { Home, Briefcase, Search, Star, User } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '@esta-feito/shared';

function TabIcon({ icon: Icon, focused, label }: {
  icon: typeof Home; focused: boolean; label: string;
}) {
  return (
    <View className="items-center gap-0.5 pt-1">
      <Icon
        size={22}
        color={focused ? '#d97706' : '#78716c'}
        strokeWidth={focused ? 2.5 : 1.8}
      />
      <Text className={`text-[10px] ${focused ? 'text-brand-600 font-body-semi' : 'text-muted'}`}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuthStore();
  const isProvider = user?.role === UserRole.PROVIDER;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#faebd7',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={Home} focused={focused} label="Início" />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={Briefcase} focused={focused} label="Trabalhos" />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={Search} focused={focused} label="Explorar" />,
          href: isProvider ? null : undefined, // hide for providers
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={Star} focused={focused} label="Avaliações" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon={User} focused={focused} label="Perfil" />,
        }}
      />
    </Tabs>
  );
}
