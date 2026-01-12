import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';

type QuitDateScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingQuitDate'>;

interface Props {
  navigation: QuitDateScreenNavigationProp;
}

const QuitDateScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleDateSelect = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    setSelectedDate(date);
  };

  const handleContinue = () => {
    // Validate quit date is within 14 days
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);

    if (selectedDate > maxDate) {
      Alert.alert('Invalid Date', 'Please select a quit date within the next 14 days');
      return;
    }

    // Navigate to motivations screen with quit date
    navigation.navigate('OnboardingMotivations', { quitDate: selectedDate.toISOString() });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>When will you quit?</Text>
        <Text style={styles.subtitle}>
          Choose your quit date. Research shows that planning ahead increases your chances of success.
        </Text>

        <View style={styles.dateOptions}>
          <TouchableOpacity
            style={[styles.dateOption, selectedDate.toDateString() === new Date().toDateString() && styles.dateOptionSelected]}
            onPress={() => handleDateSelect(0)}
          >
            <Text style={[styles.dateOptionText, selectedDate.toDateString() === new Date().toDateString() && styles.dateOptionTextSelected]}>
              Today
            </Text>
            <Text style={styles.dateOptionSubtext}>{formatDate(new Date())}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateOption, selectedDate.toDateString() === new Date(Date.now() + 86400000).toDateString() && styles.dateOptionSelected]}
            onPress={() => handleDateSelect(1)}
          >
            <Text style={[styles.dateOptionText, selectedDate.toDateString() === new Date(Date.now() + 86400000).toDateString() && styles.dateOptionTextSelected]}>
              Tomorrow
            </Text>
            <Text style={styles.dateOptionSubtext}>{formatDate(new Date(Date.now() + 86400000))}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateOption, selectedDate.toDateString() === new Date(Date.now() + 7 * 86400000).toDateString() && styles.dateOptionSelected]}
            onPress={() => handleDateSelect(7)}
          >
            <Text style={[styles.dateOptionText, selectedDate.toDateString() === new Date(Date.now() + 7 * 86400000).toDateString() && styles.dateOptionTextSelected]}>
              In 1 Week
            </Text>
            <Text style={styles.dateOptionSubtext}>{formatDate(new Date(Date.now() + 7 * 86400000))}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.selectedDateText}>
          Selected: {formatDate(selectedDate)}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
  },
  dateOptions: {
    marginBottom: 24,
  },
  dateOption: {
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  dateOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  dateOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dateOptionTextSelected: {
    color: '#007AFF',
  },
  dateOptionSubtext: {
    fontSize: 14,
    color: '#666',
  },
  selectedDateText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default QuitDateScreen;
