import React from 'react';
import { 
  Type, 
  AlignLeft, 
  CheckSquare, 
  Circle, 
  ChevronDown, 
  Calendar,
  Clock,
  Upload,
  BarChart3
} from 'lucide-react';

export const QUESTION_TYPES = {
  'short-text': {
    id: 'short-text',
    name: 'Short Text',
    icon: Type,
    description: 'Single line text input'
  },
  'long-text': {
    id: 'long-text',
    name: 'Long Text',
    icon: AlignLeft,
    description: 'Multi-line text area'
  },
  'multiple-choice': {
    id: 'multiple-choice',
    name: 'Multiple Choice',
    icon: Circle,
    description: 'Single selection from options'
  },
  'checkbox': {
    id: 'checkbox',
    name: 'Checkbox',
    icon: CheckSquare,
    description: 'Multiple selections allowed'
  },
  'dropdown': {
    id: 'dropdown',
    name: 'Dropdown',
    icon: ChevronDown,
    description: 'Select from dropdown list'
  },
  'linear-scale': {
    id: 'linear-scale',
    name: 'Linear Scale',
    icon: BarChart3,
    description: 'Rating scale (1-5, 1-10, etc.)'
  },
  'date': {
    id: 'date',
    name: 'Date',
    icon: Calendar,
    description: 'Date picker'
  },
  'time': {
    id: 'time',
    name: 'Time',
    icon: Clock,
    description: 'Time picker'
  },
  'file-upload': {
    id: 'file-upload',
    name: 'File Upload',
    icon: Upload,
    description: 'File attachment'
  }
};

const QuestionTypes = ({ onAddQuestion }) => {
  return (
    <div className="bg-white border-r border-gray-200 w-64 p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Types</h3>
      
      <div className="space-y-2">
        {Object.values(QUESTION_TYPES).map((type) => {
          const IconComponent = type.icon;
          
          return (
            <button
              key={type.id}
              onClick={() => onAddQuestion(type.id)}
              className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors group"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                <IconComponent className="w-4 h-4 text-blue-600" />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{type.name}</p>
                <p className="text-xs text-gray-500 truncate">{type.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionTypes;