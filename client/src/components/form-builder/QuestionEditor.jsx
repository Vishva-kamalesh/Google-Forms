import React, { useState, useEffect } from 'react';
import { 
  GripVertical, 
  Trash2, 
  Copy, 
  Plus, 
  X,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { QUESTION_TYPES } from './QuestionTypes';

const QuestionEditor = ({ 
  question, 
  onUpdate, 
  onDelete, 
  onDuplicate,
  isSelected,
  onSelect 
}) => {
  const [localQuestion, setLocalQuestion] = useState(question);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    setLocalQuestion(question);
    setShowOptions(['multiple-choice', 'checkbox', 'dropdown'].includes(question.type));
  }, [question]);

  const handleUpdate = (field, value) => {
    const updated = { ...localQuestion, [field]: value };
    setLocalQuestion(updated);
    onUpdate(updated);
  };

  const handleOptionUpdate = (index, value) => {
    const newOptions = [...(localQuestion.options || [])];
    newOptions[index] = { ...newOptions[index], text: value, value: value };
    handleUpdate('options', newOptions);
  };

  const addOption = () => {
    const newOptions = [...(localQuestion.options || [])];
    newOptions.push({
      id: `option_${Date.now()}`,
      text: `Option ${newOptions.length + 1}`,
      value: `option_${newOptions.length + 1}`
    });
    handleUpdate('options', newOptions);
  };

  const removeOption = (index) => {
    const newOptions = localQuestion.options.filter((_, i) => i !== index);
    handleUpdate('options', newOptions);
  };

  const questionType = QUESTION_TYPES[localQuestion.type];
  const IconComponent = questionType?.icon;

  return (
    <div 
      className={`bg-white border rounded-lg p-6 mb-4 transition-all ${
        isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Question Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <button className="text-gray-400 hover:text-gray-600 cursor-grab">
            <GripVertical className="w-5 h-5" />
          </button>
          
          {IconComponent && (
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <IconComponent className="w-4 h-4 text-blue-600" />
            </div>
          )}
          
          <span className="text-sm font-medium text-gray-600">
            {questionType?.name || 'Unknown'}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Title */}
      <div className="mb-4">
        <input
          type="text"
          value={localQuestion.title}
          onChange={(e) => handleUpdate('title', e.target.value)}
          placeholder="Enter your question"
          className="w-full text-lg font-medium border-none outline-none focus:ring-0 p-0 placeholder-gray-400"
        />
      </div>

      {/* Question Description */}
      <div className="mb-4">
        <textarea
          value={localQuestion.description || ''}
          onChange={(e) => handleUpdate('description', e.target.value)}
          placeholder="Add a description (optional)"
          rows={2}
          className="w-full text-sm text-gray-600 border-none outline-none focus:ring-0 p-0 placeholder-gray-400 resize-none"
        />
      </div>

      {/* Question Options */}
      {showOptions && (
        <div className="mb-4">
          <div className="space-y-2">
            {(localQuestion.options || []).map((option, index) => (
              <div key={option.id || index} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {localQuestion.type === 'multiple-choice' && (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                  )}
                  {localQuestion.type === 'checkbox' && (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded"></div>
                  )}
                  {localQuestion.type === 'dropdown' && (
                    <span className="text-sm text-gray-500">{index + 1}.</span>
                  )}
                </div>
                
                <input
                  type="text"
                  value={option.text}
                  onChange={(e) => handleOptionUpdate(index, e.target.value)}
                  className="flex-1 border-none outline-none focus:ring-0 p-1 text-sm"
                  placeholder={`Option ${index + 1}`}
                />
                
                {localQuestion.options.length > 1 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <button
            onClick={addOption}
            className="mt-3 flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add option
          </button>
        </div>
      )}

      {/* Linear Scale Settings */}
      {localQuestion.type === 'linear-scale' && (
        <div className="mb-4 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="number"
              value={localQuestion.validation?.min || 1}
              onChange={(e) => handleUpdate('validation', {
                ...localQuestion.validation,
                min: parseInt(e.target.value)
              })}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              min="0"
              max="10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="number"
              value={localQuestion.validation?.max || 5}
              onChange={(e) => handleUpdate('validation', {
                ...localQuestion.validation,
                max: parseInt(e.target.value)
              })}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              min="2"
              max="10"
            />
          </div>
        </div>
      )}

      {/* Question Settings */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleUpdate('required', !localQuestion.required)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
          >
            {localQuestion.required ? (
              <ToggleRight className="w-5 h-5 text-blue-600" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-gray-400" />
            )}
            <span>Required</span>
          </button>
        </div>
        
        <div className="text-xs text-gray-400">
          Question {localQuestion.order}
        </div>
      </div>
    </div>
  );
};

export default QuestionEditor;