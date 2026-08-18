import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#FF8A00',
        tabBarInactiveTintColor: '#777777',

        tabBarStyle: {
          height: 70,
          backgroundColor: '#101010',
          borderTopWidth: 1,
          borderTopColor: '#292929',
          paddingTop: 8,
          paddingBottom: 10,
        },

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* PREMIUM */}
      <Tabs.Screen
        name="premium"
        options={{
          title: 'Premium',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="diamond-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* HIDDEN ROUTES */}
      <Tabs.Screen
        name="help-support"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="rate-feedback"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="lost-found"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="club-details"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="event-details"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="saved-clubs"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="my-registrations"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="admin-dashboard"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="events-clubs"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="events"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="clubs"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}