import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

function Dashboard() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await formsAPI.getForms();
        setForms(res.data.forms || []);
      } catch (err) {
        setError('Failed to load forms');
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  const handleCreateForm = async () => {
    try {
      setCreating(true);
      const res = await formsAPI.createForm({ title: 'Untitled form', description: '' });
      const form = res.data.form;
      setForms((prev) => [form, ...prev]);
      navigate(`/forms/${form._id}/builder`);
    } catch (err) {
      setError('Failed to create form');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Template Section */}
      <div className="bg-gray-200 pb-8 pt-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-medium text-gray-900">Start a new form</h2>
            <div className="flex items-center space-x-4">
               {/* Placeholder for template gallery toggle if needed later */}
            </div>
          </div>
          
          <div className="flex items-start space-x-4">
            <div className="group cursor-pointer" onClick={handleCreateForm}>
              <div className="flex h-32 w-48 items-center justify-center rounded border border-gray-300 bg-white hover:border-primary-500 hover:bg-gray-50 transition-colors">
                {creating ? (
                  <LoadingSpinner size="medium" />
                ) : (
                  <div className="h-10 w-10 text-primary-600">
                    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full">
                       <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="mt-2 text-sm font-medium text-gray-900 group-hover:text-primary-600">Blank form</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Forms Section */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-medium text-gray-900">Recent forms</h2>
          <div className="text-sm text-gray-600">
             {/* Sort options could go here */}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        {forms.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            <p>No forms yet. Start a new one above!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {forms.map((form) => (
              <div key={form._id} className="group card hover:border-primary-500 cursor-pointer transition-all">
                <div className="flex h-32 items-center justify-center rounded-t border-b border-gray-100 bg-gray-50">
                  <div className="text-primary-200">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-16 w-16 opacity-50">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                  </div>
                </div>
                <div className="p-4">
                  <Link to={`/forms/${form._id}/builder`} className="block">
                    <h2 className="text-sm font-medium text-gray-900 truncate group-hover:text-primary-600">
                      {form.title}
                    </h2>
                    <div className="flex items-center justify-between mt-2">
                       <span className="text-xs text-gray-500">Opened {new Date(form.updatedAt || Date.now()).toLocaleDateString()}</span>
                       {/* Context menu trigger could go here */}
                    </div>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
