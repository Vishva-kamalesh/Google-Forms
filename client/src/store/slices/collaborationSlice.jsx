import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeCollaborators: [],
  cursors: {},
  isConnected: false,
  lastUpdate: null,
  conflictResolution: 'last-write-wins',
};

const collaborationSlice = createSlice({
  name: 'collaboration',
  initialState,
  reducers: {
    setConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    addCollaborator: (state, action) => {
      const collaborator = action.payload;
      const existingIndex = state.activeCollaborators.findIndex(c => c.userId === collaborator.userId);
      
      if (existingIndex === -1) {
        state.activeCollaborators.push(collaborator);
      } else {
        state.activeCollaborators[existingIndex] = collaborator;
      }
    },
    removeCollaborator: (state, action) => {
      const userId = action.payload;
      state.activeCollaborators = state.activeCollaborators.filter(c => c.userId !== userId);
      delete state.cursors[userId];
    },
    updateCursor: (state, action) => {
      const { userId, position } = action.payload;
      state.cursors[userId] = {
        position,
        timestamp: Date.now(),
      };
    },
    receiveFormUpdate: (state, action) => {
      const { updates, updatedBy, timestamp } = action.payload;
      state.lastUpdate = {
        updates,
        updatedBy,
        timestamp,
      };
    },
    clearCollaboration: (state) => {
      state.activeCollaborators = [];
      state.cursors = {};
      state.isConnected = false;
      state.lastUpdate = null;
    },
  },
});

export const {
  setConnected,
  addCollaborator,
  removeCollaborator,
  updateCursor,
  receiveFormUpdate,
  clearCollaboration,
} = collaborationSlice.actions;

export default collaborationSlice.reducer;