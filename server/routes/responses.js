const express = require('express');
const { body, validationResult } = require('express-validator');
const Form = require('../models/Form');
const Response = require('../models/Response');
const { auth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Submit form response
router.post('/:formId/submit', optionalAuth, async (req, res) => {
  try {
    const { answers, metadata = {} } = req.body;
    
    const form = await Form.findById(req.params.formId);
    if (!form || form.status !== 'published') {
      return res.status(404).json({ message: 'Form not found or not published' });
    }

    // Check if form is expired
    if (form.settings.closeDate && new Date() > form.settings.closeDate) {
      return res.status(410).json({ message: 'Form submission period has ended' });
    }

    // Check response limit
    if (form.settings.limitResponses && form.analytics.totalResponses >= form.settings.maxResponses) {
      return res.status(410).json({ message: 'Form has reached maximum responses' });
    }

    // Check if user already submitted (if multiple submissions not allowed)
    if (!form.settings.allowMultipleSubmissions && req.user) {
      const existingResponse = await Response.findOne({
        form: req.params.formId,
        respondent: req.user._id
      });
      
      if (existingResponse) {
        return res.status(400).json({ message: 'You have already submitted a response' });
      }
    }

    // Validate required fields
    const requiredQuestions = [];
    form.sections.forEach(section => {
      section.questions.forEach(question => {
        if (question.required) {
          requiredQuestions.push(question.id);
        }
      });
    });

    const answeredQuestions = answers.map(answer => answer.questionId);
    const missingRequired = requiredQuestions.filter(qId => !answeredQuestions.includes(qId));
    
    if (missingRequired.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields: missingRequired
      });
    }

    // Process answers for analytics
    const processedAnswers = answers.map(answer => {
      const question = findQuestionById(form, answer.questionId);
      
      return {
        questionId: answer.questionId,
        questionType: question?.type || 'unknown',
        value: answer.value,
        textValue: typeof answer.value === 'string' ? answer.value : JSON.stringify(answer.value),
        numericValue: typeof answer.value === 'number' ? answer.value : null,
        selectedOptions: Array.isArray(answer.value) ? answer.value : 
                        (question?.type === 'multiple-choice' ? [answer.value] : [])
      };
    });

    // Create response
    const response = new Response({
      form: req.params.formId,
      respondent: req.user?._id || null,
      respondentEmail: req.body.email || req.user?.email || null,
      answers: processedAnswers,
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        device: detectDevice(req.get('User-Agent')),
        completedAt: new Date()
      },
      isAnonymous: !req.user
    });

    await response.save();

    // Update form analytics
    await Form.findByIdAndUpdate(req.params.formId, {
      $inc: { 'analytics.totalResponses': 1 },
      $set: { 'analytics.lastResponseAt': new Date() }
    });

    // Emit real-time update to analytics dashboard
    const analyticsNamespace = req.app.get('analyticsNamespace');
    analyticsNamespace.to(`analytics-${req.params.formId}`).emit('new-response', {
      formId: req.params.formId,
      response: response.getSummary(),
      totalResponses: form.analytics.totalResponses + 1
    });

    res.status(201).json({
      message: 'Response submitted successfully',
      submissionId: response.submissionId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get form responses (for form owner/collaborators)
router.get('/:formId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, device } = req.query;
    
    const form = await Form.findById(req.params.formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check permissions
    const isOwner = form.creator.toString() === req.user._id.toString();
    const canView = isOwner || form.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString()
    );

    if (!canView) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build query
    const query = { form: req.params.formId, status: 'completed' };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (device) {
      query['metadata.device'] = device;
    }

    const responses = await Response.find(query)
      .populate('respondent', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Response.countDocuments(query);

    res.json({
      responses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single response
router.get('/:formId/responses/:responseId', auth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check permissions
    const isOwner = form.creator.toString() === req.user._id.toString();
    const canView = isOwner || form.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString()
    );

    if (!canView) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const response = await Response.findById(req.params.responseId)
      .populate('respondent', 'name email');

    if (!response || response.form.toString() !== req.params.formId) {
      return res.status(404).json({ message: 'Response not found' });
    }

    res.json({ response });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export responses to CSV
router.get('/:formId/export', auth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check permissions
    const isOwner = form.creator.toString() === req.user._id.toString();
    if (!isOwner) {
      return res.status(403).json({ message: 'Only form owner can export responses' });
    }

    const responses = await Response.find({ 
      form: req.params.formId, 
      status: 'completed' 
    }).populate('respondent', 'name email');

    // Prepare CSV data
    const csvData = responses.map(response => {
      const row = {
        'Submission ID': response.submissionId,
        'Submitted At': response.createdAt.toISOString(),
        'Respondent': response.respondent?.name || 'Anonymous',
        'Email': response.respondentEmail || response.respondent?.email || '',
        'Device': response.metadata.device || '',
        'Time Spent (seconds)': response.metadata.timeSpent || ''
      };

      // Add answers
      response.answers.forEach(answer => {
        const question = findQuestionById(form, answer.questionId);
        const questionTitle = question?.title || `Question ${answer.questionId}`;
        row[questionTitle] = answer.textValue || '';
      });

      return row;
    });

    res.json({ 
      data: csvData,
      filename: `${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_responses_${Date.now()}.csv`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete response
router.delete('/:formId/responses/:responseId', auth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId);
    if (!form || form.creator.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const response = await Response.findById(req.params.responseId);
    if (!response || response.form.toString() !== req.params.formId) {
      return res.status(404).json({ message: 'Response not found' });
    }

    await Response.findByIdAndDelete(req.params.responseId);

    // Update form analytics
    await Form.findByIdAndUpdate(req.params.formId, {
      $inc: { 'analytics.totalResponses': -1 }
    });

    res.json({ message: 'Response deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper functions
function findQuestionById(form, questionId) {
  for (const section of form.sections) {
    const question = section.questions.find(q => q.id === questionId);
    if (question) return question;
  }
  return null;
}

function detectDevice(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

module.exports = router;