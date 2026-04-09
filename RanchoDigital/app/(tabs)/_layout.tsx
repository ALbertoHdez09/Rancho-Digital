import React from 'react';
import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { Home, ClipboardList, Syringe, TrendingUp, Settings } from 'lucide-react-native';

export default function TabLayout() {
  const { color } = useTheme();

  return (
    <Tabs
      screenOptions={{
        // LA NUEVA MAGIA: Aquí es donde debe ir en las versiones nuevas de Expo Router
        sceneStyle: { backgroundColor: '#F3F4F6' },
        headerShown: false, 
        tabBarShowLabel: true, 
        tabBarActiveTintColor: color,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 5,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0, 
          left: 15,
          right: 15,
          backgroundColor: '#FFFFFF',
          borderRadius: 25,
          height: 70,
          borderTopWidth: 0,
          elevation: 8, 
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Home color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventario"
        options={{
          title: 'Inventario',
          tabBarIcon: ({ color, focused }) => (
            <ClipboardList color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="salud"
        options={{
          title: 'Salud',
          tabBarIcon: ({ color, focused }) => (
            <Syringe color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="reportes"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color, focused }) => (
            <TrendingUp color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, focused }) => (
            <Settings color={color} size={24} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}