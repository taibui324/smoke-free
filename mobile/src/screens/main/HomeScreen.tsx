import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchStatistics } from '../../store/slices/statisticsSlice';
import { RootStackParamList } from '../../types';
import SmokeFreeTimer from '../../components/SmokeFreTimer';
import StatsGrid from '../../components/StatsGrid';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { quitPlan } = useAppSelector((state) => state.quitPlan);
  const { statistics, isLoading } = useAppSelector((state) => state.statistics);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = () => {
    dispatch(fetchStatistics());
  };

  const handleCravingPress = () => {
    navigation.navigate('CravingLog');
  };

  if (!quitPlan) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadStatistics} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.email?.split('@')[0]}! 👋</Text>
        <Text style={styles.subtitle}>Keep up the great work!</Text>
      </View>

      <SmokeFreeTimer quitDate={quitPlan.quitDate} />

      {statistics && <StatsGrid statistics={statistics} />}

      <TouchableOpacity style={styles.cravingButton} onPress={handleCravingPress}>
        <Text style={styles.cravingButtonIcon}>🆘</Text>
        <Text style={styles.cravingButtonText}>I'm Having a Craving</Text>
      </TouchableOpacity>

      <View style={styles.motivationsCard}>
        <Text style={styles.motivationsTitle}>Your Motivations</Text>
        <View style={styles.motivationsList}>
          {quitPlan.motivations.map((motivation, index) => (
            <View key={index} style={styles.motivationItem}>
              <Text style={styles.motivationBullet}>•</Text>
              <Text style={styles.motivationText}>{motivation}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  cravingButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cravingButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cravingButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  motivationsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  motivationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  motivationsList: {
    marginTop: 8,
  },
  motivationItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  motivationBullet: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 8,
  },
  motivationText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
});

export default HomeScreen;
