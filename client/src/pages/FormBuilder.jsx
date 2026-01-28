import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formsAPI } from '../services/api';
import QuestionTypes from '../components/form-builder/QuestionTypes.jsx';
import QuestionEditor from '../components/form-builder/QuestionEditor.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { Eye, Send, AlertTriangle, PlusCircle, Image as ImageIcon, Type, Video, Columns, FolderPlus } from 'lucide-react';

const FormBuilder = () => {
  const { id } = useParams();

  const [form, setForm] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);

  // Fetch form details
  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await formsAPI.getForm(id);
        setForm(res.data.form);
        setPermissions(res.data.permissions);

        if (res.data.form.sections && res.data.form.sections.length > 0) {
          setActiveSectionId(res.data.form.sections[0].id);
        }
      } catch (err) {
        setError(
          err.response?.data?.message || 'Failed to load form. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [id]);

  const canEdit = permissions?.canEdit !== false;

  const activeSection = useMemo(() => {
    if (!form || !form.sections || form.sections.length === 0) return null;
    return (
      form.sections.find((section) => section.id === activeSectionId) ||
      form.sections[0]
    );
  }, [form, activeSectionId]);

  const handleFormMetaChange = (field, value) => {
    if (!form) return;
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateSection = (sectionId, updater) => {
    setForm((prev) => {
      if (!prev) return prev;
      const sections = prev.sections || [];
      const updatedSections = sections.map((section) => {
        if (section.id !== sectionId) return section;
        return typeof updater === 'function' ? updater(section) : updater;
      });

      return {
        ...prev,
        sections: updatedSections,
      };
    });
  };

  const handleAddQuestion = (type) => {
    if (!form || !activeSection) return;

    let createdId = null;

    updateSection(activeSection.id, (section) => {
      const baseId = `q_${Date.now()}`;
      const order = (section.questions?.length || 0) + 1;

      const needsOptions = ['multiple-choice', 'checkbox', 'dropdown'].includes(
        type
      );

      const newQuestion = {
        id: baseId,
        title: 'Untitled question',
        description: '',
        type,
        required: false,
        options: needsOptions
          ? [
              {
                text: 'Option 1',
                value: 'option_1',
              },
            ]
          : [],
        order,
      };

      createdId = baseId;

      return {
        ...section,
        questions: [...(section.questions || []), newQuestion],
      };
    });

    if (createdId) {
      setSelectedQuestionId(createdId);
    }
  };

  const handleUpdateQuestion = (sectionId, questionId, updatedQuestion) => {
    updateSection(sectionId, (section) => ({
      ...section,
      questions: (section.questions || []).map((q) =>
        q.id === questionId ? { ...q, ...updatedQuestion } : q
      ),
    }));
  };

  const handleDeleteQuestion = (sectionId, questionId) => {
    updateSection(sectionId, (section) => ({
      ...section,
      questions: (section.questions || []).filter((q) => q.id !== questionId),
    }));

    if (selectedQuestionId === questionId) {
      setSelectedQuestionId(null);
    }
  };

  const handleDuplicateQuestion = (sectionId, question) => {
    let duplicatedId = null;

    updateSection(sectionId, (section) => {
      const newId = `${question.id}_copy_${Date.now()}`;
      duplicatedId = newId;

      const duplicated = {
        ...question,
        id: newId,
        title: `${question.title} (copy)`,
      };

      return {
        ...section,
        questions: [...(section.questions || []), duplicated],
      };
    });

    if (duplicatedId) {
      setSelectedQuestionId(duplicatedId);
    }
  };

  const handleSave = async () => {
    if (!form) return;

    try {
      setSaving(true);
      setError('');

      const payload = {
        title: form.title,
        description: form.description,
        sections: form.sections || [],
        settings: form.settings,
        theme: form.theme,
      };

      const res = await formsAPI.updateForm(form._id, payload);
      setForm(res.data.form);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save form.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Form not found
          </h1>
          <p className="text-gray-600 mb-4">
            We couldn&apos;t load this form. It may have been deleted or you don&apos;t
            have access.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Go back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top toolbar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-purple-100 text-purple-700 text-sm font-semibold">
                Gf
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleFormMetaChange('title', e.target.value)}
                className="border-none bg-transparent text-sm font-semibold text-gray-900 focus:ring-0 focus:outline-none px-1"
                placeholder="Untitled form"
                disabled={!canEdit}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {saving ? 'Saving…' : 'All changes are local until you save.'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to={`/forms/${form._id}/view`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Eye className="mr-1 h-4 w-4" />
              Preview
            </Link>

            {form.shareSettings?.publicLink && (
              <a
                href={`/form/${form.shareSettings.publicLink}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
              >
                <Send className="mr-1 h-4 w-4" />
                Open live form
              </a>
            )}

            {canEdit && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Warning banner for read-only */}
      {!canEdit && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 py-2 flex items-center space-x-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span>
              You have view-only access to this form. You can preview it but not
              make changes.
            </span>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <div className="flex gap-4 relative">
          
          {/* Center: Form content */}
          <div className="flex-1 space-y-4">
            {/* Form header card */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm border-t-[10px] border-t-primary-500 relative group">
               {/* Selection indicator support could range here */}
              <div className="p-6">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleFormMetaChange('title', e.target.value)}
                  placeholder="Untitled form"
                  className="mb-2 w-full border-b border-transparent focus:border-b-2 focus:border-primary-500 bg-transparent text-3xl font-medium text-gray-900 placeholder-gray-400 focus:outline-none transition-all pb-2"
                  disabled={!canEdit}
                />
                <textarea
                  value={form.description || ''}
                  onChange={(e) =>
                    handleFormMetaChange('description', e.target.value)
                  }
                  placeholder="Form description"
                  rows={2}
                  className="w-full resize-none border-b border-gray-100 focus:border-b-2 focus:border-primary-500 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none transition-all pb-1 mt-2"
                  disabled={!canEdit}
                />
              </div>
            </div>

            {/* Section tabs (if multiple) */}
            {form.sections && form.sections.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {form.sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSectionId(section.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      activeSection && activeSection.id === section.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {section.title || 'Untitled section'}
                  </button>
                ))}
              </div>
            )}

            {/* Questions */}
            {activeSection && (
              <div className="space-y-4">
                {(activeSection.questions || []).map((question) => (
                  <QuestionEditor
                    key={question.id}
                    question={question}
                    onUpdate={(updated) =>
                      handleUpdateQuestion(activeSection.id, question.id, updated)
                    }
                    onDelete={() =>
                      canEdit &&
                      handleDeleteQuestion(activeSection.id, question.id)
                    }
                    onDuplicate={() =>
                      canEdit &&
                      handleDuplicateQuestion(activeSection.id, question)
                    }
                    isSelected={selectedQuestionId === question.id}
                    onSelect={() => setSelectedQuestionId(question.id)}
                  />
                ))}

                {/* Empty state */}
                {(!activeSection.questions ||
                  activeSection.questions.length === 0) && (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                    {canEdit
                      ? 'Add your first question using the floating menu on the right.'
                      : 'This section has no questions yet.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Floating Toolbar (Sticky) */}
          {canEdit && (
            <div className="hidden md:block absolute right-[-60px] top-0 h-full">
               <div className="sticky top-4 bg-white rounded-lg p-1.5 flex flex-col items-center shadow-[0_1px_4px_0_rgba(0,0,0,0.2)] space-y-2">
                 {/* Add Question */}
                 <button 
                  onClick={() => handleAddQuestion('multiple-choice')} 
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Add Question"
                 >
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/>
                   </svg>
                 </button>
                 
                 {/* Import Questions */}
                 <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" title="Import Questions">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/>
                   </svg>
                 </button>

                 {/* Add Title and Description (Tt) */}
                 <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" title="Add Title and Description">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z" fill="currentColor"/>
                   </svg>
                 </button>

                 {/* Add Image */}
                 <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" title="Add Image">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
                   </svg>
                 </button>

                 {/* Add Video */}
                 <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" title="Add Video">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M10 8v8l6-4-6-4zm9-5H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" fill="currentColor"/>
                   </svg>
                 </button>

                 {/* Add Section */}
                 <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors" title="Add Section">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h14v3zm0-7H5v-3h14v3zm0-7H5V5h14v3z" fill="currentColor"/>
                   </svg>
                 </button>
               </div>
             </div>
          )}

        </div>
      </div>

      {/* Error toast-style message */}
      {error && (
        <div className="fixed bottom-4 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;