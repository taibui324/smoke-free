import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../config/api';
import { QuitPlan, ApiResponse } from '../../types';

interface QuitPlanState {
  quitPlan: QuitPlan | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: QuitPlanState = {
  quitPlan: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchQuitPlan = createAsyncThunk(
  'quitPlan/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<QuitPlan>>('/quit-plan');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch quit plan');
    }
  }
);

export const createQuitPlan = createAsyncThunk(
  'quitPlan/create',
  async (
    data: {
      quitDate: string;
      cigarettesPerDay: number;
      costPerPack: number;
      cigarettesPerPack: number;
      motivations: string[];
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post<ApiResponse<QuitPlan>>('/quit-plan', data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create quit plan');
    }
  }
);

export const updateQuitDate = createAsyncThunk(
  'quitPlan/updateQuitDate',
  async (quitDate: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.put<ApiResponse<QuitPlan>>('/quit-plan/quit-date', { quitDate });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update quit date');
    }
  }
);

// Slice
const quitPlanSlice = createSlice({
  name: 'quitPlan',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch quit plan
    builder.addCase(fetchQuitPlan.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchQuitPlan.fulfilled, (state, action) => {
      state.isLoading = false;
      state.quitPlan = action.payload;
      state.error = null;
    });
    builder.addCase(fetchQuitPlan.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create quit plan
    builder.addCase(createQuitPlan.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createQuitPlan.fulfilled, (state, action) => {
      state.isLoading = false;
      state.quitPlan = action.payload;
      state.error = null;
    });
    builder.addCase(createQuitPlan.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update quit date
    builder.addCase(updateQuitDate.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateQuitDate.fulfilled, (state, action) => {
      state.isLoading = false;
      state.quitPlan = action.payload;
      state.error = null;
    });
    builder.addCase(updateQuitDate.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = quitPlanSlice.actions;
export default quitPlanSlice.reducer;
