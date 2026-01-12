import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchResources, fetchDailyTip, bookmarkResource, removeBookmark } from '../../store/slices/resourceSlice';
import { RootStackParamList, Resource } from '../../types';

type ResourcesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Resources'>;

interface Props {
  navigation: ResourcesScreenNavigationProp;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'health_benefits', label: 'Health' },
  { id: 'coping_strategies', label: 'Coping' },
  { id: 'success_stories', label: 'Stories' },
  { id: 'motivation', label: 'Motivation' },
];

const ResourcesScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { resources, dailyTip, isLoading } = useAppSelector((state) => state.resource);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadResources();
    dispatch(fetchDailyTip());
  }, []);

  const loadResources = () => {
    const params: any = {};
    if (selectedCategory !== 'all') {
      params.category = selectedCategory;
    }
    if (searchQuery) {
      params.query = searchQuery;
    }
    dispatch(fetchResources(params));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadResources();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const handleBookmark = (resource: Resource) => {
    if (resource.isBookmarked) {
      dispatch(removeBookmark(resource.id));
    } else {
      dispatch(bookmarkResource(resource.id));
    }
  };

  const renderResource = (resource: Resource) => (
    <TouchableOpacity
      key={resource.id}
      style={styles.resourceCard}
      onPress={() => navigation.navigate('ResourceDetail', { resourceId: resource.id })}
    >
      <View style={styles.resourceHeader}>
        <View style={styles.resourceType}>
          <Text style={styles.resourceTypeText}>
            {resource.type === 'article' ? '📄' : resource.type === 'video' ? '🎥' : '💡'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleBookmark(resource)}>
          <Text style={styles.bookmarkIcon}>{resource.isBookmarked ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.resourceTitle}>{resource.title}</Text>
      <Text style={styles.resourceDescription} numberOfLines={2}>
        {resource.description}
      </Text>
      {resource.readingTimeMinutes && (
        <Text style={styles.resourceMeta}>{resource.readingTimeMinutes} min read</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadResources} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Resources</Text>
      </View>

      {dailyTip && (
        <View style={styles.dailyTipCard}>
          <Text style={styles.dailyTipTitle}>💡 Daily Tip</Text>
          <Text style={styles.dailyTipText}>{dailyTip.title}</Text>
          <Text style={styles.dailyTipDescription}>{dailyTip.description}</Text>
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search resources..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === category.id && styles.categoryButtonTextActive,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.resourcesList}>
        {resources.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No resources found</Text>
          </View>
        ) : (
          resources.map(renderResource)
        )}
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
  dailyTipCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  dailyTipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dailyTipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dailyTipDescription: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resourcesList: {
    marginBottom: 20,
  },
  resourceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resourceType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resourceTypeText: {
    fontSize: 20,
  },
  bookmarkIcon: {
    fontSize: 24,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resourceMeta: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
  },
});

export default ResourcesScreen;
