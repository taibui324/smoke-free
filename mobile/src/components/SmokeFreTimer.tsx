import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  quitDate: string;
}

const SmokeFreeTimer: React.FC<Props> = ({ quitDate }) => {
  const [timeElapsed, setTimeElapsed] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      const quit = new Date(quitDate).getTime();
      const now = Date.now();
      const diff = now - quit;

      if (diff < 0) {
        setTimeElapsed({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      setTimeElapsed({
        days,
        hours: hours % 24,
        minutes: minutes % 60,
        seconds: seconds % 60,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [quitDate]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Smoke-Free Time</Text>
      <View style={styles.timeContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{timeElapsed.days}</Text>
          <Text style={styles.timeLabel}>Days</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{String(timeElapsed.hours).padStart(2, '0')}</Text>
          <Text style={styles.timeLabel}>Hours</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{String(timeElapsed.minutes).padStart(2, '0')}</Text>
          <Text style={styles.timeLabel}>Minutes</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{String(timeElapsed.seconds).padStart(2, '0')}</Text>
          <Text style={styles.timeLabel}>Seconds</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeBlock: {
    alignItems: 'center',
    minWidth: 50,
  },
  timeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  separator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 4,
  },
});

export default SmokeFreeTimer;
