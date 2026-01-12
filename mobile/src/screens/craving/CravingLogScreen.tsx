import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch } from '../../store';
import { logCraving } from '../../store/slices/cravingSlice';
import { RootStackParamList } from '../../types';

type CravingLogScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CravingLog'>;

interface Props {
  navigation: CravingLogScreenNavigationProp;
}

const TRIGGER_OPTIONS = [
  { id: 'stress', label: 'Stress', icon: '😰' },
  { id: 'social', label: 'Social Situation', icon: '👥' },
  { id: 'coffee', label: 'Coffee/Drinks', icon: '☕' },
  { id: 'alcohol', label: 'Alcohol', icon: '🍺' },
  { id: 'boredom', label: 'Boredom', icon: '😴' },
  { id: 'after_meal', label: 'After Meal', icon: '🍽️' },
  { id: 'morning', label: 'Morning Routine', icon: '🌅' },
  { id: 'work', label: 'Work Break', icon: '💼' },
];

const CravingLogScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const [intensity, setIntensity] = useState(5);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleTrigger = (id: string) => {
    if (selectedTriggers.includes(id)) {
      setSelectedTriggers(selectedTriggers.filter((t) => t !== id));
    } else {
      setSelectedTriggers([...selectedTriggers, id]);
    }
  };

  const handleSubmit = async () => {
    if (selectedTriggers.length === 0) {
      Alert.alert('Select Triggers', 'Please select at least one trigger');
      return;
    }

    setIsLoading(true);

    try {
      await dispatch(
        logCraving({
          intensity,
          triggers: selectedTriggers,
          notes: notes.trim() || undefined,
        })
      ).unwrap();

      Alert.alert(
        'Craving Logged',
        'Great job recognizing your craving! Here are some techniques to help you overcome it.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to log craving');
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Log Your Craving</Text>
      <Text style={styles.subtitle}>
        Tracking your cravings helps identify patterns and triggers
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How intense is this craving?</Text>
        <View style={styles.intensityContainer}>
          <Text style={styles.intensityLabel}>Mild</Text>
          <View style={styles.intensitySlider}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.intensityDot,
                  intensity >= value && styles.intensityDotActive,
                ]}
                onPress={() => setIntensity(value)}
              />
            ))}
          </View>
          <Text style={styles.intensityLabel}>Severe</Text>
        </View>
        <Text style={styles.intensityValue}>{intensity}/10</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What triggered this craving?</Text>
        <View style={styles.triggersGrid}>
          {TRIGGER_OPTIONS.map((trigger) => (
            <TouchableOpacity
              key={trigger.id}
              style={[
                styles.triggerCard,
                selectedTriggers.includes(trigger.id) && styles.triggerCardSelected,
              ]}
              onPress={() => toggleTrigger(trigger.id)}
            >
              <Text style={styles.triggerIcon}>{trigger.icon}</Text>
              <Text
                style={[
                  styles.triggerLabel,
                  selectedTriggers.includes(trigger.id) && styles.triggerLabelSelected,
                ]}
              >
                {trigger.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="How are you feeling? What's happening?"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Log Craving</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  intensityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intensityLabel: {
    fontSize: 14,
    color: '#666',
  },
  intensitySlider: {
    flexDirection: 'row',
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'space-between',
  },
  intensityDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E5E5',
  },
  intensityDotActive: {
    backgroundColor: '#FF3B30',
  },
  intensityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 12,
  },
  triggersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  triggerCard: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
  },
  triggerCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  triggerIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  triggerLabel: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  triggerLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CravingLogScreen;
