import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config';
import Card from '../components/Card';
import Button from '../components/Button';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';

interface SubmissionResult {
  item_accuracy: number;
  brand_accuracy?: number;
  l0_accuracy?: number;
  l1_accuracy?: number;
  l2_accuracy?: number;
  l3_accuracy?: number;
  l4_accuracy?: number;
  timestamp: string;
  submissionsRemaining: number;
}

const UploadSubmission: React.FC = () => {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [submissionsRemaining, setSubmissionsRemaining] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const uploadsResponse = await axios.get(`${API_URL}/submissions-remaining`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setSubmissionsRemaining(uploadsResponse.data.submissionsRemaining);
      } catch (error) {
        console.error('Error fetching submission requirements:', error);
      }
    };
    
    fetchRequirements();
  }, [token]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = async (file: File) => {
    // Check if file is CSV
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Only CSV files are allowed');
      return;
    }
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }
    
    // Read first 5 rows for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result?.toString() || '';
      const rows = text.split('\n').slice(0, 5);
      setCsvPreview(rows);
      
      // Basic validation for required columns
      if (rows.length > 0) {
        const headers = rows[0].toLowerCase();
        if (!headers.includes('walmart_id')) {
          toast.error('CSV must contain a column named "walmart_id"');
          return;
        }
        
        // Check for category columns
        const requiredColumns = ['details_brand', 'l0_category', 'l1_category', 'l2_category', 'l3_category', 'l4_category'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          toast.error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
        }
      }
    };
    reader.readAsText(file);
    
    setFile(file);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });
      
      setResult(response.data);
      setSubmissionsRemaining(response.data.submissionsRemaining);
      toast.success('File uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      const serverError = error.response?.data;
      
      // Handle rate limit (429) error specifically
      if (error.response?.status === 429) {
        const nextReset = serverError.nextReset ? 
          new Date(serverError.nextReset).toLocaleTimeString() : 
          'tomorrow';
        toast.error(`Daily upload limit exceeded. Limit resets at ${nextReset}`);
      } else {
        // Handle other errors
        const errorMessage = serverError?.error 
          ? serverError.error
          : 'Upload failed. Please check file format and try again.';
        toast.error(errorMessage);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setCsvPreview([]);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Submit Product Categorization Model</h1>
      
      {/* Submission Info */}
      <Card className="mb-6 p-4">
        <h2 className="font-semibold text-lg mb-2">Submission Requirements</h2>
        <ul className="list-disc pl-5 mb-4">
          <li>Upload a CSV file with product categorization predictions for each item</li>
          <li>Required columns: <code>walmart_id</code>, <code>details_Brand</code>, <code>L0_category</code>, <code>L1_category</code>, <code>L2_category</code>, <code>L3_category</code>, <code>L4_category</code></li>
          <li>File size limit: 5MB</li>
          <li>All product IDs in the dataset must be included</li>
        </ul>
        {submissionsRemaining !== null && (
          <div className="text-sm mt-2">
            <p>Submissions remaining today: <span className="font-medium">{submissionsRemaining}</span></p>
          </div>
        )}
      </Card>
      
      {/* File Upload */}
      <Card className="mb-6">
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!file ? (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Drag and drop your CSV file here</h3>
              <p className="text-sm text-gray-500 mb-4">or</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="primary"
              >
                Select File
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button 
                  onClick={handleRemoveFile}
                  className="ml-4 text-red-500 hover:text-red-700"
                  disabled={isUploading}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {csvPreview.length > 0 && (
                <div className="bg-gray-50 rounded p-3 text-left text-sm">
                  <p className="font-medium mb-1">File Preview (first 5 rows):</p>
                  <pre className="overflow-x-auto">{csvPreview.join('\n')}</pre>
                </div>
              )}
              
              {!isUploading ? (
                <Button 
                  onClick={handleUpload}
                  variant="primary"
                  className="w-full"
                  disabled={isUploading}
                >
                  Upload File
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm">{uploadProgress}% Uploaded</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
      
      {/* Results */}
      {result && (
        <Card className="p-4">
          <div className="flex items-center mb-3">
            <CheckCircle className="text-green-500 h-6 w-6 mr-2" />
            <h2 className="text-lg font-semibold">Submission Results</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm text-gray-500">Item Accuracy</p>
              <p className="text-xl font-bold">{(result.item_accuracy * 100).toFixed(2)}%</p>
            </div>
            {result.brand_accuracy !== undefined && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Brand Accuracy</p>
                <p className="text-xl font-bold">{(result.brand_accuracy * 100).toFixed(2)}%</p>
              </div>
            )}
          </div>
          
          {/* Category level accuracies */}
          {(result.l0_accuracy !== undefined || result.l1_accuracy !== undefined ||
            result.l2_accuracy !== undefined || result.l3_accuracy !== undefined ||
            result.l4_accuracy !== undefined) && (
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2">Category Level Accuracies</h3>
              <div className="grid grid-cols-3 gap-3">
                {result.l0_accuracy !== undefined && (
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">L0 Category</p>
                    <p className="text-lg font-bold">{(result.l0_accuracy * 100).toFixed(2)}%</p>
                  </div>
                )}
                {result.l1_accuracy !== undefined && (
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">L1 Category</p>
                    <p className="text-lg font-bold">{(result.l1_accuracy * 100).toFixed(2)}%</p>
                  </div>
                )}
                {result.l2_accuracy !== undefined && (
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">L2 Category</p>
                    <p className="text-lg font-bold">{(result.l2_accuracy * 100).toFixed(2)}%</p>
                  </div>
                )}
                {result.l3_accuracy !== undefined && (
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">L3 Category</p>
                    <p className="text-lg font-bold">{(result.l3_accuracy * 100).toFixed(2)}%</p>
                  </div>
                )}
                {result.l4_accuracy !== undefined && (
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">L4 Category</p>
                    <p className="text-lg font-bold">{(result.l4_accuracy * 100).toFixed(2)}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <p className="mt-4 text-sm text-gray-500">
            Submitted on {new Date(result.timestamp).toLocaleString()}
          </p>
          
          <p className="mt-2 text-sm">
            Submissions remaining today: <span className="font-medium">{result.submissionsRemaining}</span>
          </p>
          
          <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-100">
            <p className="text-sm">
              <span className="font-semibold">Note:</span> Your best item accuracy score will be used for the leaderboard ranking.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default UploadSubmission;