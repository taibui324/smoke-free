import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';

type MotivationsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingMotivations'>;
type MotivationsScreenRouteProp = RouteProp<RootStackParamList, 'OnboardingMotivations'>;

interface Props {
  navigation: MotivationsScreenNavigationProp;
  route: MotivationsScreenRouteProp;
}

const MOTIVATION_OPTIONS = [
  { id: 'health', label: 'Improve my health', icon: '❤️' },
  { id: 'money', label: 'Save money', icon: '💰' },
  { id: 'family', label: 'For my family', icon: '👨‍👩‍👧‍👦' },
  { id: 'fitness', label: 'Get more fit', icon: '💪' },
  { id: 'appearance', label: 'Look better', icon: '✨' },
  { id: 'smell', label: 'Smell better', icon: '🌸' },
  { id: 'freedom', label: 'Be free from addiction', icon: '🦅' },
  { id: 'example', label: 'Set a good example', icon: '⭐' },
];

const MotivationsScreen: React.FC<Props> = ({ navigation, route }) => {
  const [selectedMotivations, setSelectedMotivations] = useState<string[]>([]);
  const { quitDate } = route.params;

  const toggleMotivation = (id: string) => {
    if (selectedMotivations.includes(id)) {
      setSelectedMotivations(selectedMotivations.filter(m => m !== id));
    } else {
      setSelectedMotivations([...selectedMotivations, id]);
    }
  };

  const handleContinue = () => {
    if (selectedMotivations.length === 0) {
      Alert.alert('Select Motivations', 'Please select at least one motivation to continue');
      return;
    }

    navigation.navigate('OnboardingHabits', {
      quitDate,
      motivations: selectedMotivations,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Why do you want to quit?</Text>
        <Text style={styles.subtitle}>
          Select all that apply. Your motivations will help personalize your experience.
        </Text>

        <View style={styles.motivationsGrid}>
          {MOTIVATION_OPTIONS.map((motivation) => (
            <TouchableOpacity
              key={motivation.id}
              style={[
                styles.motivationCard,
                selectedMotivations.includes(motivation.id) && styles.motivationCardSelected,
              ]}
              onPress={() => toggleMotivation(motivation.id)}
            >
              <Text style={styles.motivationIcon}>{motivation.icon}</Text>
              <Text
                style={[
                  styles.motivationLabel,
                  selectedMotivations.includes(motivation.id) && styles.motivationLabelSelected,
                ]}
              >
                {motivation.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.selectedCount}>
          {selectedMotivations.length} selected
        </Text>
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, selectedMotivations.length === 0 && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={selectedMotivations.length === 0}
      >
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
  motivationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  motivationCard: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    margin: '1%',
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  motivationCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  motivationIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  motivationLabel: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  motivationLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 20,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MotivationsScreen;
