import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { responsesAPI } from '../../services/api';

// Async thunks
export const submitResponse = createAsyncThunk(
  'responses/submitResponse',
  async ({ formId, responseData }, { rejectWithValue }) => {
    try {
      const response = await responsesAPI.submitResponse(formId, responseData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit response');
    }
  }
);

export const fetchResponses = createAsyncThunk(
  'responses/fetchResponses',
  async ({ formId, params = {} }, { rejectWithValue }) => {
    try {
      const response = await responsesAPI.getResponses(formId, params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch responses');
    }
  }
);

export const exportResponses = createAsyncThunk(
  'responses/exportResponses',
  async (formId, { rejectWithValue }) => {
    try {
      const response = await responsesAPI.exportResponses(formId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to export responses');
    }
  }
);

const initialState = {
  responses: [],
  currentResponse: null,
  loading: false,
  submitting: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    total: 0,
  },
  exportData: null,
};

const responseSlice = createSlice({
  name: 'responses',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearResponses: (state) => {
      state.responses = [];
      state.currentResponse = null;
    },
    clearExportData: (state) => {
      state.exportData = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Submit response
      .addCase(submitResponse.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitResponse.fulfilled, (state, action) => {
        state.submitting = false;
        state.currentResponse = action.payload;
      })
      .addCase(submitResponse.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })

      // Fetch responses
      .addCase(fetchResponses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResponses.fulfilled, (state, action) => {
        state.loading = false;
        state.responses = action.payload.responses;
        state.pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          total: action.payload.total,
        };
      })
      .addCase(fetchResponses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Export responses
      .addCase(exportResponses.fulfilled, (state, action) => {
        state.exportData = action.payload;
      });
  },
});

export const { clearError, clearResponses, clearExportData } = responseSlice.actions;
export default responseSlice.reducer;