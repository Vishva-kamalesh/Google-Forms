const mongoose = require('mongoose');

const { Schema } = mongoose;

const questionOptionSchema = new Schema({
  text: { type: String, required: true },
  value: { type: String },
});

const questionSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  type: {
    type: String,
    enum: [
      'short-text',
      'long-text',
      'multiple-choice',
      'checkbox',
      'dropdown',
      'linear-scale',
      'date',
      'time',
    ],
    required: true,
  },
  required: { type: Boolean, default: false },
  options: [questionOptionSchema],
  settings: { type: Schema.Types.Mixed },
});

const sectionSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  questions: [questionSchema],
  order: { type: Number, default: 1 },
});

const collaboratorSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  permission: { type: String, enum: ['view', 'edit'], default: 'edit' },
});

const analyticsSchema = new Schema({
  totalViews: { type: Number, default: 0 },
  totalResponses: { type: Number, default: 0 },
  lastResponseAt: { type: Date },
});

const shareSettingsSchema = new Schema({
  publicLink: { type: String },
  linkExpiration: { type: Date },
  allowPublicResponses: { type: Boolean, default: true },
});

const formSettingsSchema = new Schema({
  allowMultipleSubmissions: { type: Boolean, default: true },
  limitResponses: { type: Boolean, default: false },
  maxResponses: { type: Number, default: 0 },
  closeDate: { type: Date },
});

const auditLogSchema = new Schema({
  action: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  details: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

const formSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    sections: [sectionSchema],
    collaborators: [collaboratorSchema],
    settings: { type: formSettingsSchema, default: () => ({}) },
    shareSettings: { type: shareSettingsSchema, default: () => ({}) },
    analytics: { type: analyticsSchema, default: () => ({}) },
    theme: { type: Schema.Types.Mixed },
    version: { type: Number, default: 1 },
    auditLog: [auditLogSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Form', formSchema);
