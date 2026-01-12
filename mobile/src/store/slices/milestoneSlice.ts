import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../config/api';
import { UserMilestone, ApiResponse } from '../../types';

interface MilestoneState {
  milestones: UserMilestone[];
  isLoading: boolean;
  error: string | null;
}

const initialState: MilestoneState = {
  milestones: [],
  isLoading: false,
  error: null,
};

export const fetchMilestones = createAsyncThunk(
  'milestone/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<UserMilestone[]>>('/progress/milestones');
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch milestones');
    }
  }
);

const milestoneSlice = createSlice({
  name: 'milestone',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchMilestones.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchMilestones.fulfilled, (state, action) => {
      state.isLoading = false;
      state.milestones = action.payload;
    });
    builder.addCase(fetchMilestones.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = milestoneSlice.actions;
export default milestoneSlice.reducer;
