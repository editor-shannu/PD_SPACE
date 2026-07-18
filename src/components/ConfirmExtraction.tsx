'use client';

import React, { useState } from 'react';
import { ExtractedData, Medication } from '@/types/documents';

interface ConfirmExtractionProps {
  extractedData: ExtractedData;
  fileName?: string;
  onConfirm: (data: ExtractedData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmExtraction: React.FC<ConfirmExtractionProps> = ({
  extractedData,
  fileName,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ExtractedData>(extractedData);
  const [editingMedicationIndex, setEditingMedicationIndex] = useState<number | null>(null);
  const [newMedication, setNewMedication] = useState<Medication>({
    name: '',
    dosage: '',
    frequency: '',
  });

  const handleFieldChange = (field: keyof Omit<ExtractedData, 'medications'>, value: string | Date) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const updatedMeds = [...formData.medications];
    updatedMeds[index] = {
      ...updatedMeds[index],
      [field]: value,
    };
    setFormData((prev) => ({
      ...prev,
      medications: updatedMeds,
    }));
  };

  const handleRemoveMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const handleAddMedication = () => {
    if (newMedication.name.trim()) {
      setFormData((prev) => ({
        ...prev,
        medications: [...prev.medications, newMedication],
      }));
      setNewMedication({ name: '', dosage: '', frequency: '' });
    }
  };

  const handleConfirm = () => {
    onConfirm(formData);
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    if (typeof date === 'string') {
      return date.split('T')[0];
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Extracted Information</h2>
        <p className="text-gray-600 mb-6">
          Review and edit the extracted information before saving
        </p>

        {fileName && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">File:</span> {fileName}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type *
            </label>
            <select
              value={formData.document_type}
              onChange={(e) => handleFieldChange('document_type', e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="prescription">Prescription</option>
              <option value="diagnostic_report">Diagnostic Report</option>
              <option value="discharge_summary">Discharge Summary</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Doctor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Doctor Name
            </label>
            <input
              type="text"
              value={formData.doctor_name || ''}
              onChange={(e) => handleFieldChange('doctor_name', e.target.value)}
              placeholder="Enter doctor's name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={formatDateForInput(formData.date)}
              onChange={(e) =>
                handleFieldChange('date', e.target.value ? new Date(e.target.value) : '')
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Diagnosis
            </label>
            <textarea
              value={formData.diagnosis || ''}
              onChange={(e) => handleFieldChange('diagnosis', e.target.value)}
              placeholder="Enter diagnosis information"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Medications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Medications
            </label>

            {formData.medications.length > 0 && (
              <div className="space-y-3 mb-4">
                {formData.medications.map((med, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-300 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-gray-700">
                        Medication {index + 1}
                      </h4>
                      <button
                        onClick={() => handleRemoveMedication(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <input
                        type="text"
                        placeholder="Medication name *"
                        value={med.name}
                        onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Dosage"
                        value={med.dosage || ''}
                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Frequency"
                        value={med.frequency || ''}
                        onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Medication */}
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <h4 className="font-medium text-gray-700 mb-3">Add Medication</h4>
              <div className="grid grid-cols-1 gap-3 mb-3">
                <input
                  type="text"
                  placeholder="Medication name"
                  value={newMedication.name}
                  onChange={(e) =>
                    setNewMedication((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Dosage"
                  value={newMedication.dosage}
                  onChange={(e) =>
                    setNewMedication((prev) => ({
                      ...prev,
                      dosage: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Frequency"
                  value={newMedication.frequency}
                  onChange={(e) =>
                    setNewMedication((prev) => ({
                      ...prev,
                      frequency: e.target.value,
                    }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAddMedication}
                disabled={!newMedication.name.trim()}
                className="w-full px-3 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
              >
                + Add Medication
              </button>
            </div>
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Follow-up Date
            </label>
            <input
              type="date"
              value={formatDateForInput(formData.follow_up_date)}
              onChange={(e) =>
                handleFieldChange('follow_up_date', e.target.value ? new Date(e.target.value) : '')
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Enter any additional notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
