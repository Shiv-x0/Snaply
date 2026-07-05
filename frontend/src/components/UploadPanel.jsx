import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const IconUploadCloud = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function UploadPanel({ onSuccess, setLoading }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  const processFile = async (file) => {
    if (!file) return;
    const token = localStorage.getItem('snaply_token');
    setLoading(true);
    setError('');
    setSuccess('');
    setFileName(file.name);

    const formData = new FormData();
    formData.append('image', file);

    try {
      await axios.post(`${API_BASE}/api/parse/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Receipt parsed successfully');
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse image. Please try again.');
      setFileName('');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processFile(file);
    else setError('Please drop a valid image file.');
  };

  return (
    <div className="card card-md">
      <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>Upload Receipt</h2>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
        Upload a photo of your receipt. Gemini AI will extract all line items automatically.
      </p>

      <label
        className="upload-zone"
        style={{ borderColor: isDragging ? 'var(--accent)' : undefined, background: isDragging ? 'rgba(124,58,237,0.03)' : undefined, cursor: 'pointer' }}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div style={{ color: isDragging ? 'var(--accent)' : 'var(--text-tertiary)', marginBottom: '12px' }}>
          <IconUploadCloud />
        </div>
        <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
          {fileName ? fileName : 'Click to upload or drag and drop'}
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)' }}>PNG, JPG, JPEG — max 10MB</p>
        <input type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
      </label>

      {success && (
        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--green-light)', border: '1px solid #86efac', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--red-light)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--red)', fontWeight: '500' }}>
          {error}
        </div>
      )}
    </div>
  );
}
