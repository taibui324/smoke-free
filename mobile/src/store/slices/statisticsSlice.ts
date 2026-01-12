import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../config/api';
import { Statistics, ApiResponse } from '../../types';

interface StatisticsState {
  statistics: Statistics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: StatisticsState = {
  statistics: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const fetchStatistics = createAsyncThunk(
  'statistics/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<Statistics>>('/progress/stats');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch statistics');
    }
  }
);

// Slice
const statisticsSlice = createSlice({
  name: 'statistics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchStatistics.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchStatistics.fulfilled, (state, action) => {
      state.isLoading = false;
      state.statistics = action.payload;
      state.lastUpdated = Date.now();
      state.error = null;
    });
    builder.addCase(fetchStatistics.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = statisticsSlice.actions;
export default statisticsSlice.reducer;
