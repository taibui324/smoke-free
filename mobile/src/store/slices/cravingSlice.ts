import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../config/api';
import { Craving, CravingAnalytics, ApiResponse } from '../../types';

interface CravingState {
  cravings: Craving[];
  analytics: CravingAnalytics | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CravingState = {
  cravings: [],
  analytics: null,
  isLoading: false,
  error: null,
};

export const fetchCravings = createAsyncThunk(
  'craving/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<Craving[]>>('/cravings');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch cravings');
    }
  }
);

export const logCraving = createAsyncThunk(
  'craving/log',
  async (
    data: {
      intensity: number;
      triggers: string[];
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post<ApiResponse<Craving>>('/cravings', data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to log craving');
    }
  }
);

export const updateCraving = createAsyncThunk(
  'craving/update',
  async (
    { id, data }: { id: string; data: Partial<Craving> },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.put<ApiResponse<Craving>>(`/cravings/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update craving');
    }
  }
);

export const fetchCravingAnalytics = createAsyncThunk(
  'craving/fetchAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<CravingAnalytics>>('/cravings/analytics');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch analytics');
    }
  }
);

const cravingSlice = createSlice({
  name: 'craving',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch cravings
    builder.addCase(fetchCravings.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchCravings.fulfilled, (state, action) => {
      state.isLoading = false;
      state.cravings = action.payload;
    });
    builder.addCase(fetchCravings.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Log craving
    builder.addCase(logCraving.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(logCraving.fulfilled, (state, action) => {
      state.isLoading = false;
      state.cravings.unshift(action.payload);
    });
    builder.addCase(logCraving.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update craving
    builder.addCase(updateCraving.fulfilled, (state, action) => {
      const index = state.cravings.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.cravings[index] = action.payload;
      }
    });

    // Fetch analytics
    builder.addCase(fetchCravingAnalytics.fulfilled, (state, action) => {
      state.analytics = action.payload;
    });
  },
});

export const { clearError } = cravingSlice.actions;
export default cravingSlice.reducer;
