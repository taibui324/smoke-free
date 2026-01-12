import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useAppDispatch } from '../../store';
import { createQuitPlan } from '../../store/slices/quitPlanSlice';
import { RootStackParamList } from '../../types';

type HabitsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OnboardingHabits'>;
type HabitsScreenRouteProp = RouteProp<RootStackParamList, 'OnboardingHabits'>;

interface Props {
  navigation: HabitsScreenNavigationProp;
  route: HabitsScreenRouteProp;
}

const HabitsScreen: React.FC<Props> = ({ navigation, route }) => {
  const dispatch = useAppDispatch();
  const { quitDate, motivations } = route.params;

  const [cigarettesPerDay, setCigarettesPerDay] = useState('');
  const [costPerPack, setCostPerPack] = useState('');
  const [cigarettesPerPack, setCigarettesPerPack] = useState('20');
  const [isLoading, setIsLoading] = useState(false);

  const calculateSavings = () => {
    const cigs = parseInt(cigarettesPerDay) || 0;
    const cost = parseFloat(costPerPack) || 0;
    const perPack = parseInt(cigarettesPerPack) || 20;

    if (cigs === 0 || cost === 0) return { daily: 0, monthly: 0, yearly: 0 };

    const dailyCost = (cigs / perPack) * cost;
    const monthlyCost = dailyCost * 30;
    const yearlyCost = dailyCost * 365;

    return {
      daily: dailyCost,
      monthly: monthlyCost,
      yearly: yearlyCost,
    };
  };

  const savings = calculateSavings();

  const handleComplete = async () => {
    const cigs = parseInt(cigarettesPerDay);
    const cost = parseFloat(costPerPack);
    const perPack = parseInt(cigarettesPerPack);

    if (!cigs || cigs <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of cigarettes per day');
      return;
    }

    if (!cost || cost <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid cost per pack');
      return;
    }

    if (!perPack || perPack <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of cigarettes per pack');
      return;
    }

    setIsLoading(true);

    try {
      await dispatch(
        createQuitPlan({
          quitDate,
          cigarettesPerDay: cigs,
          costPerPack: cost,
          cigarettesPerPack: perPack,
          motivations,
        })
      ).unwrap();

      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create quit plan');
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Tell us about your habits</Text>
        <Text style={styles.subtitle}>
          This helps us calculate your savings and personalize your experience.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>How many cigarettes do you smoke per day?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 20"
            value={cigarettesPerDay}
            onChangeText={setCigarettesPerDay}
            keyboardType="number-pad"
            editable={!isLoading}
          />

          <Text style={styles.label}>How much does a pack cost?</Text>
          <View style={styles.inputWithPrefix}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={[styles.input, styles.inputWithPrefixInput]}
              placeholder="e.g., 10.00"
              value={costPerPack}
              onChangeText={setCostPerPack}
              keyboardType="decimal-pad"
              editable={!isLoading}
            />
          </View>

          <Text style={styles.label}>Cigarettes per pack</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 20"
            value={cigarettesPerPack}
            onChangeText={setCigarettesPerPack}
            keyboardType="number-pad"
            editable={!isLoading}
          />
        </View>

        {savings.yearly > 0 && (
          <View style={styles.savingsCard}>
            <Text style={styles.savingsTitle}>💰 Your Potential Savings</Text>
            <View style={styles.savingsRow}>
              <Text style={styles.savingsLabel}>Per Day:</Text>
              <Text style={styles.savingsValue}>${savings.daily.toFixed(2)}</Text>
            </View>
            <View style={styles.savingsRow}>
              <Text style={styles.savingsLabel}>Per Month:</Text>
              <Text style={styles.savingsValue}>${savings.monthly.toFixed(2)}</Text>
            </View>
            <View style={styles.savingsRow}>
              <Text style={styles.savingsLabel}>Per Year:</Text>
              <Text style={styles.savingsValueLarge}>${savings.yearly.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Complete Setup</Text>
        )}
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
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  inputWithPrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  inputWithPrefixInput: {
    flex: 1,
    marginBottom: 0,
  },
  savingsCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  savingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  savingsLabel: {
    fontSize: 16,
    color: '#666',
  },
  savingsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  savingsValueLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
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

export default HabitsScreen;
