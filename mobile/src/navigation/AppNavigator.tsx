import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { useAppSelector, useAppDispatch } from '../store';
import { fetchQuitPlan } from '../store/slices/quitPlanSlice';
import { RootStackParamList } from '../types';

// Auth screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Onboarding screens
import QuitDateScreen from '../screens/onboarding/QuitDateScreen';
import MotivationsScreen from '../screens/onboarding/MotivationsScreen';
import HabitsScreen from '../screens/onboarding/HabitsScreen';

// Main tab navigator
import MainTabNavigator from './MainTabNavigator';

// Craving screens
import CravingLogScreen from '../screens/craving/CravingLogScreen';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { quitPlan, isLoading: quitPlanLoading } = useAppSelector((state) => state.quitPlan);
  const [isCheckingQuitPlan, setIsCheckingQuitPlan] = useState(true);

  useEffect(() => {
    if (isAuthenticated && !quitPlan && !quitPlanLoading) {
      dispatch(fetchQuitPlan())
        .unwrap()
        .catch(() => {
          // User doesn't have a quit plan yet, will show onboarding
        })
        .finally(() => {
          setIsCheckingQuitPlan(false);
        });
    } else if (!isAuthenticated) {
      setIsCheckingQuitPlan(false);
    } else if (quitPlan) {
      setIsCheckingQuitPlan(false);
    }
  }, [isAuthenticated, quitPlan, quitPlanLoading, dispatch]);

  if (authLoading || isCheckingQuitPlan) {
    // TODO: Add proper loading screen
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : !quitPlan ? (
          // Onboarding Stack
          <>
            <Stack.Screen name="OnboardingQuitDate" component={QuitDateScreen} />
            <Stack.Screen name="OnboardingMotivations" component={MotivationsScreen} />
            <Stack.Screen name="OnboardingHabits" component={HabitsScreen} />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen 
              name="CravingLog" 
              component={CravingLogScreen}
              options={{
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'Log a Craving',
                headerBackTitle: 'Cancel',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
