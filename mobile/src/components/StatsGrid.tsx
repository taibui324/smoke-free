import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Statistics } from '../types';

interface Props {
  statistics: Statistics;
}

const StatsGrid: React.FC<Props> = ({ statistics }) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={styles.statValue}>${statistics.moneySaved.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Money Saved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🚭</Text>
          <Text style={styles.statValue}>{statistics.cigarettesNotSmoked}</Text>
          <Text style={styles.statLabel}>Cigarettes Not Smoked</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statValue}>
            {statistics.lifeRegained.days}d {statistics.lifeRegained.hours}h
          </Text>
          <Text style={styles.statLabel}>Life Regained</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statValue}>{statistics.currentStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default StatsGrid;
