import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.collaborationSocket = null;
    this.analyticsSocket = null;
    this.isConnected = false;
  }

  // Initialize collaboration socket
  initializeCollaboration(formId, userId) {
    if (this.collaborationSocket) {
      this.collaborationSocket.disconnect();
    }

    this.collaborationSocket = io(`${SOCKET_URL}/collaboration`, {
      transports: ['websocket'],
      upgrade: false,
    });

    this.collaborationSocket.on('connect', () => {
      console.log('Connected to collaboration namespace');
      this.isConnected = true;
      this.collaborationSocket.emit('join-form', formId);
    });

    this.collaborationSocket.on('disconnect', () => {
      console.log('Disconnected from collaboration namespace');
      this.isConnected = false;
    });

    return this.collaborationSocket;
  }

  // Initialize analytics socket
  initializeAnalytics(formId) {
    if (this.analyticsSocket) {
      this.analyticsSocket.disconnect();
    }

    this.analyticsSocket = io(`${SOCKET_URL}/analytics`, {
      transports: ['websocket'],
      upgrade: false,
    });

    this.analyticsSocket.on('connect', () => {
      console.log('Connected to analytics namespace');
      this.analyticsSocket.emit('join-analytics', formId);
    });

    this.analyticsSocket.on('disconnect', () => {
      console.log('Disconnected from analytics namespace');
    });

    return this.analyticsSocket;
  }

  // Collaboration methods
  emitFormUpdate(formId, updates, userId) {
    if (this.collaborationSocket && this.isConnected) {
      this.collaborationSocket.emit('form-update', {
        formId,
        updates,
        userId,
        timestamp: Date.now(),
      });
    }
  }

  emitCursorMove(formId, position, userId) {
    if (this.collaborationSocket && this.isConnected) {
      this.collaborationSocket.emit('cursor-move', {
        formId,
        position,
        userId,
        timestamp: Date.now(),
      });
    }
  }

  onFormUpdate(callback) {
    if (this.collaborationSocket) {
      this.collaborationSocket.on('form-updated', callback);
    }
  }

  onUserJoined(callback) {
    if (this.collaborationSocket) {
      this.collaborationSocket.on('user-joined', callback);
    }
  }

  onCursorMove(callback) {
    if (this.collaborationSocket) {
      this.collaborationSocket.on('cursor-moved', callback);
    }
  }

  // Analytics methods
  onNewResponse(callback) {
    if (this.analyticsSocket) {
      this.analyticsSocket.on('new-response', callback);
    }
  }

  onAnalyticsUpdate(callback) {
    if (this.analyticsSocket) {
      this.analyticsSocket.on('analytics-updated', callback);
    }
  }

  // Cleanup methods
  disconnectCollaboration() {
    if (this.collaborationSocket) {
      this.collaborationSocket.disconnect();
      this.collaborationSocket = null;
      this.isConnected = false;
    }
  }

  disconnectAnalytics() {
    if (this.analyticsSocket) {
      this.analyticsSocket.disconnect();
      this.analyticsSocket = null;
    }
  }

  disconnectAll() {
    this.disconnectCollaboration();
    this.disconnectAnalytics();
  }

  // Remove specific listeners
  removeCollaborationListeners() {
    if (this.collaborationSocket) {
      this.collaborationSocket.removeAllListeners('form-updated');
      this.collaborationSocket.removeAllListeners('user-joined');
      this.collaborationSocket.removeAllListeners('cursor-moved');
    }
  }

  removeAnalyticsListeners() {
    if (this.analyticsSocket) {
      this.analyticsSocket.removeAllListeners('new-response');
      this.analyticsSocket.removeAllListeners('analytics-updated');
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;