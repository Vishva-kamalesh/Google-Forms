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
      className={`group relative bg-white rounded-lg p-6 mb-4 transition-all shadow-sm ${
        isSelected ? 'border-l-8 border-l-primary-500 ring-1 ring-gray-200' : 'border border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Drag Handle (Visible on Hover / Selected) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-3 hidden group-hover:flex cursor-grab items-center justify-center rounded-lg bg-gray-50 p-1 text-gray-400 shadow-sm hover:text-gray-600">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Row 1: Title and Type Selector */}
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start">
        {/* Title Input */}
        <div className="flex-1 bg-gray-50 p-4 rounded-t-md border-b border-gray-300 focus-within:border-primary-500 focus-within:bg-gray-100 transition-colors">
          <input
            type="text"
            value={localQuestion.title}
            onChange={(e) => handleUpdate('title', e.target.value)}
            placeholder="Question"
            className="w-full bg-transparent text-base font-medium text-gray-900 placeholder-gray-500 focus:outline-none"
          />
        </div>

        {/* Type Selector Dropdown */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="relative">
            <select
              value={localQuestion.type}
              onChange={(e) => handleUpdate('type', e.target.value)}
              className="w-full appearance-none rounded border border-gray-200 bg-white py-3 pl-10 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              {Object.values(QUESTION_TYPES).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {/* Current Icon Overlay */}
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {(() => {
                const Icon = QUESTION_TYPES[localQuestion.type]?.icon;
                return Icon ? <Icon className="h-5 w-5" /> : null;
              })()}
            </div>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Description (Optional) */}
      {localQuestion.description !== undefined && (
        <div className="mb-4 px-4">
           <input
            type="text"
            value={localQuestion.description || ''}
            onChange={(e) => handleUpdate('description', e.target.value)}
            placeholder="Description"
            className="w-full border-b border-gray-200 py-1 text-sm text-gray-600 placeholder-gray-400 focus:border-primary-500 focus:outline-none"
          />
        </div>
      )}

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