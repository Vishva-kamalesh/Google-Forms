const express = require('express');
const { body, validationResult } = require('express-validator');
const Form = require('../models/Form');
const Response = require('../models/Response');
const { auth, optionalAuth } = require('../middleware/auth');
const QRCode = require('qrcode');

const router = express.Router();

// Get all forms for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const query = {
      $or: [
        { creator: req.user._id },
        { 'collaborators.user': req.user._id }
      ]
    };

    if (status) query.status = status;
    if (search) {
      query.$and = [
        query.$or ? { $or: query.$or } : {},
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete query.$or;
    }

    const forms = await Form.find(query)
      .populate('creator', 'name email')
      .populate('collaborators.user', 'name email')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Form.countDocuments(query);

    res.json({
      forms,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new form
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 1, max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description = '' } = req.body;

    const form = new Form({
      title,
      description,
      creator: req.user._id,
      sections: [{
        id: 'section_1',
        title: 'Untitled Section',
        description: '',
        questions: [],
        order: 1
      }]
    });

    await form.save();
    await form.populate('creator', 'name email');

    // Emit to collaboration namespace
    const io = req.app.get('io');
    io.of('/collaboration').emit('form-created', {
      formId: form._id,
      form: form
    });

    res.status(201).json({ form });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get form by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('collaborators.user', 'name email');

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check permissions
    const isOwner = req.user && form.creator._id.toString() === req.user._id.toString();
    const isCollaborator = req.user && form.collaborators.some(
      collab => collab.user._id.toString() === req.user._id.toString()
    );

    if (form.status === 'draft' && !isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Increment view count for published forms
    if (form.status === 'published') {
      await Form.findByIdAndUpdate(req.params.id, {
        $inc: { 'analytics.totalViews': 1 }
      });
    }

    res.json({ 
      form,
      permissions: {
        canEdit: isOwner || (isCollaborator && form.collaborators.find(
          collab => collab.user._id.toString() === req.user?._id.toString()
        )?.permission === 'edit'),
        canView: true
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update form
router.put('/:id', auth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Check permissions
    const isOwner = form.creator.toString() === req.user._id.toString();
    const canEdit = isOwner || form.collaborators.some(
      collab => collab.user.toString() === req.user._id.toString() && 
      collab.permission === 'edit'
    );

    if (!canEdit) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update form
    const allowedUpdates = ['title', 'description', 'sections', 'settings', 'theme'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Add to audit log
    form.auditLog.push({
      action: 'form_updated',
      user: req.user._id,
      details: { updatedFields: Object.keys(updates) }
    });

    // Increment version
    updates.version = form.version + 1;
    updates.auditLog = form.auditLog;

    const updatedForm = await Form.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('creator', 'name email')
     .populate('collaborators.user', 'name email');

    // Emit real-time update
    const io = req.app.get('io');
    io.of('/collaboration').to(req.params.id).emit('form-updated', {
      formId: req.params.id,
      updates,
      updatedBy: req.user._id,
      version: updates.version
    });

    res.json({ form: updatedForm });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Publish form
router.post('/:id/publish', auth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    if (form.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only form owner can publish' });
    }

    // Generate public link if not exists
    if (!form.shareSettings.publicLink) {
      form.shareSettings.publicLink = generateUniqueId();
    }

    form.status = 'published';
    form.auditLog.push({
      action: 'form_published',
      user: req.user._id
    });

    await form.save();

    res.json({ 
      form,
      publicUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/form/${form.shareSettings.publicLink}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get form by public link
router.get('/public/:publicLink', async (req, res) => {
  try {
    const form = await Form.findOne({ 
      'shareSettings.publicLink': req.params.publicLink,
      status: 'published'
    }).populate('creator', 'name');

    if (!form) {
      return res.status(404).json({ message: 'Form not found or not published' });
    }

    // Check if form is expired
    if (form.shareSettings.linkExpiration && new Date() > form.shareSettings.linkExpiration) {
      return res.status(410).json({ message: 'Form link has expired' });
    }

    // Check response limit
    if (form.settings.limitResponses && form.analytics.totalResponses >= form.settings.maxResponses) {
      return res.status(410).json({ message: 'Form has reached maximum responses' });
    }

    res.json({ form });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate QR code for form
router.get('/:id/qrcode', auth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form || form.creator.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Form not found' });
    }

    if (!form.shareSettings.publicLink) {
      return res.status(400).json({ message: 'Form must be published first' });
    }

    const publicUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/form/${form.shareSettings.publicLink}`;
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl);

    res.json({ qrCode: qrCodeDataUrl, publicUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add collaborator
router.post('/:id/collaborators', [
  auth,
  body('email').isEmail(),
  body('permission').isIn(['view', 'edit'])
], async (req, res) => {
  try {
    const { email, permission } = req.body;
    
    const form = await Form.findById(req.params.id);
    if (!form || form.creator.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const User = require('../models/User');
    const collaborator = await User.findOne({ email });
    if (!collaborator) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already a collaborator
    const existingCollab = form.collaborators.find(
      collab => collab.user.toString() === collaborator._id.toString()
    );

    if (existingCollab) {
      existingCollab.permission = permission;
    } else {
      form.collaborators.push({
        user: collaborator._id,
        permission
      });
    }

    await form.save();
    await form.populate('collaborators.user', 'name email');

    res.json({ collaborators: form.collaborators });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete form
router.delete('/:id', auth, async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    
    if (!form || form.creator.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Delete all responses
    await Response.deleteMany({ form: req.params.id });
    
    // Delete form
    await Form.findByIdAndDelete(req.params.id);

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

function generateUniqueId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

module.exports = router;