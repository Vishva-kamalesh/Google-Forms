const express = require('express');
const Form = require('../models/Form');
const Response = require('../models/Response');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get form analytics overview
router.get('/:formId', auth, async (req, res) => {
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

    // Get basic stats
    const totalResponses = await Response.countDocuments({ 
      form: req.params.formId, 
      status: 'completed' 
    });

    const totalViews = form.analytics.totalViews;
    const conversionRate = totalViews > 0 ? (totalResponses / totalViews * 100).toFixed(2) : 0;

    // Get responses over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const responsesOverTime = await Response.aggregate([
      {
        $match: {
          form: form._id,
          status: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Device breakdown
    const deviceStats = await Response.aggregate([
      {
        $match: {
          form: form._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$metadata.device',
          count: { $sum: 1 }
        }
      }
    ]);

    // Average completion time
    const avgCompletionTime = await Response.aggregate([
      {
        $match: {
          form: form._id,
          status: 'completed',
          'metadata.timeSpent': { $exists: true, $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$metadata.timeSpent' }
        }
      }
    ]);

    res.json({
      overview: {
        totalResponses,
        totalViews,
        conversionRate: parseFloat(conversionRate),
        avgCompletionTime: avgCompletionTime[0]?.avgTime || 0,
        lastResponseAt: form.analytics.lastResponseAt
      },
      responsesOverTime,
      deviceStats,
      formStatus: form.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get question-wise analytics
router.get('/:formId/questions', auth, async (req, res) => {
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

    const questionAnalytics = [];

    // Analyze each question
    for (const section of form.sections) {
      for (const question of section.questions) {
        const analytics = await analyzeQuestion(form._id, question);
        questionAnalytics.push({
          questionId: question.id,
          questionTitle: question.title,
          questionType: question.type,
          sectionTitle: section.title,
          ...analytics
        });
      }
    }

    res.json({ questionAnalytics });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get real-time stats for dashboard
router.get('/:formId/realtime', auth, async (req, res) => {
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

    // Get recent responses (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const recentResponses = await Response.find({
      form: req.params.formId,
      status: 'completed',
      createdAt: { $gte: twentyFourHoursAgo }
    }).sort({ createdAt: -1 }).limit(10);

    // Get hourly breakdown for last 24 hours
    const hourlyStats = await Response.aggregate([
      {
        $match: {
          form: form._id,
          status: 'completed',
          createdAt: { $gte: twentyFourHoursAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d %H:00", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      recentResponses: recentResponses.map(r => r.getSummary()),
      hourlyStats,
      totalResponses: form.analytics.totalResponses,
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function to analyze individual questions
async function analyzeQuestion(formId, question) {
  const responses = await Response.find({
    form: formId,
    status: 'completed',
    'answers.questionId': question.id
  });

  const answers = responses.map(response => 
    response.answers.find(answer => answer.questionId === question.id)
  ).filter(Boolean);

  const totalAnswers = answers.length;
  const responseRate = responses.length > 0 ? (totalAnswers / responses.length * 100).toFixed(2) : 0;

  let analytics = {
    totalAnswers,
    responseRate: parseFloat(responseRate),
    skipped: responses.length - totalAnswers
  };

  switch (question.type) {
    case 'multiple-choice':
    case 'dropdown':
      analytics.optionStats = analyzeMultipleChoice(answers, question.options);
      break;
    
    case 'checkbox':
      analytics.optionStats = analyzeCheckbox(answers, question.options);
      break;
    
    case 'linear-scale':
      analytics.scaleStats = analyzeLinearScale(answers);
      break;
    
    case 'short-text':
    case 'long-text':
      analytics.textStats = analyzeTextAnswers(answers);
      break;
    
    default:
      analytics.rawData = answers.map(a => a.value);
  }

  return analytics;
}

function analyzeMultipleChoice(answers, options) {
  const optionCounts = {};
  options.forEach(option => {
    optionCounts[option.text] = 0;
  });

  answers.forEach(answer => {
    if (answer.value && optionCounts.hasOwnProperty(answer.value)) {
      optionCounts[answer.value]++;
    }
  });

  return Object.entries(optionCounts).map(([option, count]) => ({
    option,
    count,
    percentage: answers.length > 0 ? (count / answers.length * 100).toFixed(2) : 0
  }));
}

function analyzeCheckbox(answers, options) {
  const optionCounts = {};
  options.forEach(option => {
    optionCounts[option.text] = 0;
  });

  answers.forEach(answer => {
    if (Array.isArray(answer.selectedOptions)) {
      answer.selectedOptions.forEach(option => {
        if (optionCounts.hasOwnProperty(option)) {
          optionCounts[option]++;
        }
      });
    }
  });

  return Object.entries(optionCounts).map(([option, count]) => ({
    option,
    count,
    percentage: answers.length > 0 ? (count / answers.length * 100).toFixed(2) : 0
  }));
}

function analyzeLinearScale(answers) {
  const values = answers.map(a => a.numericValue).filter(v => v !== null);
  
  if (values.length === 0) {
    return { average: 0, distribution: {} };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const average = (sum / values.length).toFixed(2);

  const distribution = {};
  values.forEach(value => {
    distribution[value] = (distribution[value] || 0) + 1;
  });

  return {
    average: parseFloat(average),
    distribution,
    totalResponses: values.length
  };
}

function analyzeTextAnswers(answers) {
  const textValues = answers.map(a => a.textValue).filter(Boolean);
  
  return {
    totalResponses: textValues.length,
    averageLength: textValues.length > 0 ? 
      Math.round(textValues.reduce((acc, text) => acc + text.length, 0) / textValues.length) : 0,
    wordCount: textValues.reduce((acc, text) => acc + text.split(' ').length, 0)
  };
}

module.exports = router;