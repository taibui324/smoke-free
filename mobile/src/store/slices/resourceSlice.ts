import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../config/api';
import { Resource, ApiResponse } from '../../types';

interface ResourceState {
  resources: Resource[];
  bookmarkedResources: Resource[];
  dailyTip: Resource | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ResourceState = {
  resources: [],
  bookmarkedResources: [],
  dailyTip: null,
  isLoading: false,
  error: null,
};

export const fetchResources = createAsyncThunk(
  'resource/fetchAll',
  async (params: { type?: string; category?: string; query?: string } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.type) queryParams.append('type', params.type);
      if (params.category) queryParams.append('category', params.category);
      if (params.query) queryParams.append('query', params.query);

      const response = await apiClient.get<ApiResponse<Resource[]>>(`/resources?${queryParams.toString()}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch resources');
    }
  }
);

export const fetchBookmarkedResources = createAsyncThunk(
  'resource/fetchBookmarked',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<Resource[]>>('/resources/bookmarks/list');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch bookmarks');
    }
  }
);

export const fetchDailyTip = createAsyncThunk(
  'resource/fetchDailyTip',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<Resource>>('/resources/daily-tip');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch daily tip');
    }
  }
);

export const bookmarkResource = createAsyncThunk(
  'resource/bookmark',
  async (resourceId: string, { rejectWithValue }) => {
    try {
      await apiClient.post(`/resources/${resourceId}/bookmark`);
      return resourceId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to bookmark resource');
    }
  }
);

export const removeBookmark = createAsyncThunk(
  'resource/removeBookmark',
  async (resourceId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/resources/${resourceId}/bookmark`);
      return resourceId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to remove bookmark');
    }
  }
);

const resourceSlice = createSlice({
  name: 'resource',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch resources
    builder.addCase(fetchResources.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchResources.fulfilled, (state, action) => {
      state.isLoading = false;
      state.resources = action.payload;
    });
    builder.addCase(fetchResources.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch bookmarked
    builder.addCase(fetchBookmarkedResources.fulfilled, (state, action) => {
      state.bookmarkedResources = action.payload;
    });

    // Fetch daily tip
    builder.addCase(fetchDailyTip.fulfilled, (state, action) => {
      state.dailyTip = action.payload;
    });

    // Bookmark resource
    builder.addCase(bookmarkResource.fulfilled, (state, action) => {
      const resource = state.resources.find((r) => r.id === action.payload);
      if (resource) {
        resource.isBookmarked = true;
      }
    });

    // Remove bookmark
    builder.addCase(removeBookmark.fulfilled, (state, action) => {
      const resource = state.resources.find((r) => r.id === action.payload);
      if (resource) {
        resource.isBookmarked = false;
      }
      state.bookmarkedResources = state.bookmarkedResources.filter((r) => r.id !== action.payload);
    });
  },
});

export const { clearError } = resourceSlice.actions;
export default resourceSlice.reducer;
