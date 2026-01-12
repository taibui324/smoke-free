import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../config/api';
import { ChatMessage, ApiResponse } from '../../types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
};

export const fetchChatHistory = createAsyncThunk(
  'chat/fetchHistory',
  async (limit: number = 50, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<ApiResponse<ChatMessage[]>>(`/chat/history?limit=${limit}`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch chat history');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (
    { message, includeContext }: { message: string; includeContext?: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post<ApiResponse<{ message: ChatMessage; assistantMessage: ChatMessage }>>('/chat/message', {
        message,
        includeContext,
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to send message');
    }
  }
);

export const clearChatHistory = createAsyncThunk(
  'chat/clearHistory',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.delete('/chat/history');
      return true;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to clear chat history');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch history
    builder.addCase(fetchChatHistory.pending, (state) => {
      state.isLoading = true;
    });
    builder.addCase(fetchChatHistory.fulfilled, (state, action) => {
      state.isLoading = false;
      state.messages = action.payload.reverse(); // Reverse to show oldest first
    });
    builder.addCase(fetchChatHistory.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Send message
    builder.addCase(sendMessage.pending, (state) => {
      state.isSending = true;
      state.error = null;
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.isSending = false;
      state.messages.push(action.payload.message);
      state.messages.push(action.payload.assistantMessage);
    });
    builder.addCase(sendMessage.rejected, (state, action) => {
      state.isSending = false;
      state.error = action.payload as string;
    });

    // Clear history
    builder.addCase(clearChatHistory.fulfilled, (state) => {
      state.messages = [];
    });
  },
});

export const { clearError } = chatSlice.actions;
export default chatSlice.reducer;
