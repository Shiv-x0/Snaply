import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function UploadPanel({ onSuccess, setLoading }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const token = localStorage.getItem('snaply_token');
    setLoading(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      await axios.post(`${API_BASE}/api/parse/`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Token ${token}`
        }
      });
      e.target.value = ''; // reset input
      setSuccess('Successfully parsed receipt image!');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to parse image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-sm border app-card">
      <h2 className="text-base font-bold mb-1 app-text-primary">Log Receipt Photo</h2>
      <p className="text-xs app-text-secondary mb-6">Upload a photo of your paper receipt to instantly extract ledger items.</p>

      <div className="w-full">
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-48 border border-dashed rounded-xl cursor-pointer hover:bg-gray-50/20 transition-all border-[var(--card-border)]">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p className="mb-1 text-xs app-text-primary"><span className="font-bold text-orange-500">Click to upload</span> or drag receipt</p>
              <p className="text-[10px] app-text-secondary">PNG, JPG, JPEG up to 10MB</p>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {success && <p className="mt-4 text-xs text-green-600 font-semibold bg-green-50/50 p-3 rounded-xl border border-green-100 text-center animate-pulse">{success}</p>}
      {error && <p className="mt-4 text-xs text-red-600 font-semibold bg-red-50/50 p-3 rounded-xl border border-red-150 text-center">{error}</p>}
    </div>
  );
}
