import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useAppSelector, useAppDispatch } from '../../store';
import { updateQuitPlan } from '../../store/slices/quitPlanSlice';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const dispatch = useAppDispatch();
  const { quitPlan } = useAppSelector((state) => state.quitPlan);

  // Profile state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Notification preferences
  const [dailyReminders, setDailyReminders] = useState(true);
  const [milestoneAlerts, setMilestoneAlerts] = useState(true);
  const [cravingSupport, setCravingSupport] = useState(true);
  const [motivationalMessages, setMotivationalMessages] = useState(true);

  // Quit date state
  const [isEditingQuitDate, setIsEditingQuitDate] = useState(false);
  const [newQuitDate, setNewQuitDate] = useState('');

  const handleSaveProfile = () => {
    // TODO: Implement profile update API call
    Alert.alert('Success', 'Profile updated successfully');
    setIsEditingProfile(false);
  };

  const handleUpdateQuitDate = async () => {
    if (!newQuitDate) {
      Alert.alert('Error', 'Please enter a valid date');
      return;
    }

    try {
      await dispatch(updateQuitPlan({ quitDate: newQuitDate })).unwrap();
      Alert.alert('Success', 'Quit date updated successfully');
      setIsEditingQuitDate(false);
      setNewQuitDate('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update quit date');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion API call
            Alert.alert('Info', 'Account deletion not yet implemented');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>

          <Text style={styles.label}>First Name</Text>
          {isEditingProfile ? (
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
            />
          ) : (
            <Text style={styles.value}>{firstName || 'Not set'}</Text>
          )}

          <Text style={styles.label}>Last Name</Text>
          {isEditingProfile ? (
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
            />
          ) : (
            <Text style={styles.value}>{lastName || 'Not set'}</Text>
          )}

          {isEditingProfile ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setIsEditingProfile(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.primaryButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setIsEditingProfile(true)}
            >
              <Text style={styles.primaryButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quit Date Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quit Date</Text>
        
        <View style={styles.card}>
          <Text style={styles.label}>Current Quit Date</Text>
          <Text style={styles.value}>
            {quitPlan?.quitDate ? new Date(quitPlan.quitDate).toLocaleDateString() : 'Not set'}
          </Text>

          {isEditingQuitDate ? (
            <>
              <Text style={styles.label}>New Quit Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={newQuitDate}
                onChangeText={setNewQuitDate}
                placeholder="YYYY-MM-DD"
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    setIsEditingQuitDate(false);
                    setNewQuitDate('');
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleUpdateQuitDate}
                >
                  <Text style={styles.primaryButtonText}>Update</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setIsEditingQuitDate(true)}
            >
              <Text style={styles.primaryButtonText}>Change Quit Date</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notification Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Daily Reminders</Text>
            <Switch
              value={dailyReminders}
              onValueChange={setDailyReminders}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Milestone Alerts</Text>
            <Switch
              value={milestoneAlerts}
              onValueChange={setMilestoneAlerts}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Craving Support</Text>
            <Switch
              value={cravingSupport}
              onValueChange={setCravingSupport}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Motivational Messages</Text>
            <Switch
              value={motivationalMessages}
              onValueChange={setMotivationalMessages}
            />
          </View>
        </View>
      </View>

      {/* Account Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    padding: 20,
    paddingTop: 60,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#FF9800',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  dangerButtonText: {
    color: '#f44336',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default SettingsScreen;
