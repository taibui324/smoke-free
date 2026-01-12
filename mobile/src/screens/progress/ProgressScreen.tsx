import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMilestones } from '../../store/slices/milestoneSlice';
import { RootStackParamList } from '../../types';

type ProgressScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Progress'>;

interface Props {
  navigation: ProgressScreenNavigationProp;
}

const ProgressScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { milestones, isLoading } = useAppSelector((state) => state.milestone);

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = () => {
    dispatch(fetchMilestones());
  };

  const unlockedMilestones = milestones.filter((m) => m.unlockedAt);
  const lockedMilestones = milestones.filter((m) => !m.unlockedAt);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadMilestones} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Progress</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Unlocked Achievements ({unlockedMilestones.length})</Text>
        {unlockedMilestones.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Keep going! Your first milestone is coming soon.</Text>
          </View>
        ) : (
          <View style={styles.milestonesGrid}>
            {unlockedMilestones.map((userMilestone) => (
              <View key={userMilestone.id} style={[styles.milestoneCard, styles.milestoneUnlocked]}>
                <Text style={styles.milestoneIcon}>{userMilestone.milestone.icon}</Text>
                <Text style={styles.milestoneName}>{userMilestone.milestone.name}</Text>
                <Text style={styles.milestoneDescription}>{userMilestone.milestone.description}</Text>
                <Text style={styles.milestoneDate}>
                  Unlocked {new Date(userMilestone.unlockedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 Upcoming Milestones ({lockedMilestones.length})</Text>
        <View style={styles.milestonesGrid}>
          {lockedMilestones.slice(0, 6).map((userMilestone) => (
            <View key={userMilestone.id} style={[styles.milestoneCard, styles.milestoneLocked]}>
              <Text style={styles.milestoneIconLocked}>🔒</Text>
              <Text style={styles.milestoneNameLocked}>{userMilestone.milestone.name}</Text>
              <Text style={styles.milestoneDescriptionLocked}>
                {userMilestone.milestone.requiredValue} {userMilestone.milestone.unit}
              </Text>
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
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  milestoneCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    minHeight: 140,
  },
  milestoneUnlocked: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  milestoneLocked: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  milestoneIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  milestoneIconLocked: {
    fontSize: 32,
    marginBottom: 8,
    opacity: 0.3,
  },
  milestoneName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  milestoneNameLocked: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 4,
  },
  milestoneDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  milestoneDescriptionLocked: {
    fontSize: 12,
    color: '#999',
  },
  milestoneDate: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
});

export default ProgressScreen;
