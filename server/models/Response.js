const mongoose = require('mongoose');

const { Schema } = mongoose;

const answerSchema = new Schema({
  questionId: { type: String, required: true },
  questionType: { type: String },
  value: { type: Schema.Types.Mixed },
  textValue: { type: String },
  numericValue: { type: Number },
  selectedOptions: [{ type: String }],
});

const metadataSchema = new Schema({
  ipAddress: { type: String },
  userAgent: { type: String },
  device: { type: String },
  timeSpent: { type: Number },
  completedAt: { type: Date },
});

const responseSchema = new Schema(
  {
    form: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
    respondent: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    respondentEmail: { type: String },
    answers: [answerSchema],
    metadata: { type: metadataSchema, default: () => ({}) },
    isAnonymous: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'completed',
    },
    submissionId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      unique: true,
    },
  },
  { timestamps: true }
);

responseSchema.methods.getSummary = function () {
  return {
    id: this._id,
    submissionId: this.submissionId,
    createdAt: this.createdAt,
    respondentEmail: this.respondentEmail,
    device: this.metadata && this.metadata.device,
    timeSpent: this.metadata && this.metadata.timeSpent,
  };
};

module.exports = mongoose.model('Response', responseSchema);
