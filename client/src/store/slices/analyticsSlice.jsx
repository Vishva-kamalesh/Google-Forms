import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { analyticsAPI } from '../../services/api';

// Async thunks
export const fetchFormAnalytics = createAsyncThunk(
  'analytics/fetchFormAnalytics',
  async (formId, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getFormAnalytics(formId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch analytics');
    }
  }
);

export const fetchQuestionAnalytics = createAsyncThunk(
  'analytics/fetchQuestionAnalytics',
  async (formId, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getQuestionAnalytics(formId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch question analytics');
    }
  }
);

export const fetchRealtimeStats = createAsyncThunk(
  'analytics/fetchRealtimeStats',
  async (formId, { rejectWithValue }) => {
    try {
      const response = await analyticsAPI.getRealtimeStats(formId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch realtime stats');
    }
  }
);

const initialState = {
  overview: null,
  questionAnalytics: [],
  realtimeStats: null,
  loading: false,
  error: null,
  lastUpdated: null,
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAnalytics: (state) => {
      state.overview = null;
      state.questionAnalytics = [];
      state.realtimeStats = null;
    },
    updateRealtimeStats: (state, action) => {
      state.realtimeStats = { ...state.realtimeStats, ...action.payload };
      state.lastUpdated = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch form analytics
      .addCase(fetchFormAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFormAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchFormAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch question analytics
      .addCase(fetchQuestionAnalytics.fulfilled, (state, action) => {
        state.questionAnalytics = action.payload.questionAnalytics;
      })

      // Fetch realtime stats
      .addCase(fetchRealtimeStats.fulfilled, (state, action) => {
        state.realtimeStats = action.payload;
        state.lastUpdated = new Date().toISOString();
      });
  },
});

export const { clearError, clearAnalytics, updateRealtimeStats } = analyticsSlice.actions;
export default analyticsSlice.reducer;