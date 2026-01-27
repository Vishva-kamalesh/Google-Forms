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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your forms</h1>
          <p className="text-sm text-gray-600">Create, edit and analyze your forms.</p>
        </div>
        <button
          onClick={handleCreateForm}
          className="btn-primary flex items-center"
          disabled={creating}
        >
          {creating ? 'Creating…' : 'New form'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {forms.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
          No forms yet. Click "New form" to create your first one.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {forms.map((form) => (
            <div key={form._id} className="card hover:shadow-medium transition-shadow">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {form.title}
                </h2>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {form.description || 'No description'}
                </p>
              </div>
              <div className="card-body flex items-center justify-between">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Status: <span className="capitalize">{form.status}</span></p>
                  <p>Responses: {form.analytics?.totalResponses ?? 0}</p>
                </div>
                <div className="flex flex-col space-y-2 text-sm">
                  <Link
                    to={`/forms/${form._id}/builder`}
                    className="btn-secondary text-center"
                  >
                    Edit
                  </Link>
                  {form.shareSettings?.publicLink && (
                    <Link
                      to={`/forms/${form._id}/analytics`}
                      className="btn-secondary text-center"
                    >
                      Analytics
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
