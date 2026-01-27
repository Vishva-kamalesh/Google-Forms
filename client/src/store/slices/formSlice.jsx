import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { formsAPI } from '../../services/api';

// Async thunks
export const fetchForms = createAsyncThunk(
  'forms/fetchForms',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await formsAPI.getForms(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch forms');
    }
  }
);

export const fetchForm = createAsyncThunk(
  'forms/fetchForm',
  async (formId, { rejectWithValue }) => {
    try {
      const response = await formsAPI.getForm(formId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch form');
    }
  }
);

export const createForm = createAsyncThunk(
  'forms/createForm',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await formsAPI.createForm(formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create form');
    }
  }
);

export const updateForm = createAsyncThunk(
  'forms/updateForm',
  async ({ formId, formData }, { rejectWithValue }) => {
    try {
      const response = await formsAPI.updateForm(formId, formData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update form');
    }
  }
);

export const deleteForm = createAsyncThunk(
  'forms/deleteForm',
  async (formId, { rejectWithValue }) => {
    try {
      await formsAPI.deleteForm(formId);
      return formId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete form');
    }
  }
);

export const publishForm = createAsyncThunk(
  'forms/publishForm',
  async (formId, { rejectWithValue }) => {
    try {
      const response = await formsAPI.publishForm(formId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to publish form');
    }
  }
);

export const fetchPublicForm = createAsyncThunk(
  'forms/fetchPublicForm',
  async (publicLink, { rejectWithValue }) => {
    try {
      const response = await formsAPI.getPublicForm(publicLink);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Form not found');
    }
  }
);

export const generateQRCode = createAsyncThunk(
  'forms/generateQRCode',
  async (formId, { rejectWithValue }) => {
    try {
      const response = await formsAPI.generateQRCode(formId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to generate QR code');
    }
  }
);

const initialState = {
  forms: [],
  currentForm: null,
  publicForm: null,
  qrCode: null,
  loading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    total: 0,
  },
  filters: {
    status: '',
    search: '',
  },
  // Form builder state
  isDirty: false,
  lastSaved: null,
  isAutoSaving: false,
};

const formSlice = createSlice({
  name: 'forms',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentForm: (state) => {
      state.currentForm = null;
      state.isDirty = false;
      state.lastSaved = null;
    },
    clearPublicForm: (state) => {
      state.publicForm = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    // Form builder actions
    updateCurrentForm: (state, action) => {
      if (state.currentForm) {
        state.currentForm.form = { ...state.currentForm.form, ...action.payload };
        state.isDirty = true;
      }
    },
    addQuestion: (state, action) => {
      const { sectionId, question } = action.payload;
      if (state.currentForm) {
        const section = state.currentForm.form.sections.find(s => s.id === sectionId);
        if (section) {
          section.questions.push(question);
          state.isDirty = true;
        }
      }
    },
    updateQuestion: (state, action) => {
      const { sectionId, questionId, updates } = action.payload;
      if (state.currentForm) {
        const section = state.currentForm.form.sections.find(s => s.id === sectionId);
        if (section) {
          const questionIndex = section.questions.findIndex(q => q.id === questionId);
          if (questionIndex !== -1) {
            section.questions[questionIndex] = { ...section.questions[questionIndex], ...updates };
            state.isDirty = true;
          }
        }
      }
    },
    deleteQuestion: (state, action) => {
      const { sectionId, questionId } = action.payload;
      if (state.currentForm) {
        const section = state.currentForm.form.sections.find(s => s.id === sectionId);
        if (section) {
          section.questions = section.questions.filter(q => q.id !== questionId);
          state.isDirty = true;
        }
      }
    },
    reorderQuestions: (state, action) => {
      const { sectionId, questions } = action.payload;
      if (state.currentForm) {
        const section = state.currentForm.form.sections.find(s => s.id === sectionId);
        if (section) {
          section.questions = questions;
          state.isDirty = true;
        }
      }
    },
    addSection: (state, action) => {
      if (state.currentForm) {
        state.currentForm.form.sections.push(action.payload);
        state.isDirty = true;
      }
    },
    updateSection: (state, action) => {
      const { sectionId, updates } = action.payload;
      if (state.currentForm) {
        const sectionIndex = state.currentForm.form.sections.findIndex(s => s.id === sectionId);
        if (sectionIndex !== -1) {
          state.currentForm.form.sections[sectionIndex] = {
            ...state.currentForm.form.sections[sectionIndex],
            ...updates
          };
          state.isDirty = true;
        }
      }
    },
    deleteSection: (state, action) => {
      const sectionId = action.payload;
      if (state.currentForm) {
        state.currentForm.form.sections = state.currentForm.form.sections.filter(s => s.id !== sectionId);
        state.isDirty = true;
      }
    },
    setAutoSaving: (state, action) => {
      state.isAutoSaving = action.payload;
    },
    setSaved: (state) => {
      state.isDirty = false;
      state.lastSaved = new Date().toISOString();
      state.isAutoSaving = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch forms
      .addCase(fetchForms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchForms.fulfilled, (state, action) => {
        state.loading = false;
        state.forms = action.payload.forms;
        state.pagination = {
          currentPage: action.payload.currentPage,
          totalPages: action.payload.totalPages,
          total: action.payload.total,
        };
      })
      .addCase(fetchForms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch single form
      .addCase(fetchForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchForm.fulfilled, (state, action) => {
        state.loading = false;
        state.currentForm = action.payload;
        state.isDirty = false;
        state.lastSaved = action.payload.form.updatedAt;
      })
      .addCase(fetchForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Create form
      .addCase(createForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createForm.fulfilled, (state, action) => {
        state.loading = false;
        state.forms.unshift(action.payload.form);
        state.currentForm = action.payload;
      })
      .addCase(createForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update form
      .addCase(updateForm.pending, (state) => {
        state.isAutoSaving = true;
      })
      .addCase(updateForm.fulfilled, (state, action) => {
        state.isAutoSaving = false;
        state.isDirty = false;
        state.lastSaved = new Date().toISOString();
        
        if (state.currentForm) {
          state.currentForm = action.payload;
        }
        
        // Update in forms list
        const formIndex = state.forms.findIndex(f => f._id === action.payload.form._id);
        if (formIndex !== -1) {
          state.forms[formIndex] = action.payload.form;
        }
      })
      .addCase(updateForm.rejected, (state, action) => {
        state.isAutoSaving = false;
        state.error = action.payload;
      })

      // Delete form
      .addCase(deleteForm.fulfilled, (state, action) => {
        state.forms = state.forms.filter(form => form._id !== action.payload);
        if (state.currentForm?.form._id === action.payload) {
          state.currentForm = null;
        }
      })

      // Publish form
      .addCase(publishForm.fulfilled, (state, action) => {
        if (state.currentForm) {
          state.currentForm = action.payload;
        }
        
        const formIndex = state.forms.findIndex(f => f._id === action.payload.form._id);
        if (formIndex !== -1) {
          state.forms[formIndex] = action.payload.form;
        }
      })

      // Fetch public form
      .addCase(fetchPublicForm.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicForm.fulfilled, (state, action) => {
        state.loading = false;
        state.publicForm = action.payload;
      })
      .addCase(fetchPublicForm.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Generate QR code
      .addCase(generateQRCode.fulfilled, (state, action) => {
        state.qrCode = action.payload;
      });
  },
});

export const {
  clearError,
  clearCurrentForm,
  clearPublicForm,
  setFilters,
  updateCurrentForm,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  addSection,
  updateSection,
  deleteSection,
  setAutoSaving,
  setSaved,
} = formSlice.actions;

export default formSlice.reducer;