/**
 * MediFlow — Patient EMR Registration & Edit Modal
 * Glassmorphic UI with strict validation and compulsory gating support
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { EmrProfile } from '@/types/documents';

interface EmrFormModalProps {
  isOpen: boolean;
  isCompulsory?: boolean;
  initialData?: EmrProfile | null;
  defaultName?: string;
  onSaveSuccess: (profile: EmrProfile) => void;
  onClose?: () => void;
}

export default function EmrFormModal({
  isOpen,
  isCompulsory = false,
  initialData,
  defaultName = '',
  onSaveSuccess,
  onClose,
}: EmrFormModalProps) {
  const [formData, setFormData] = useState<Partial<EmrProfile>>({
    fullName: defaultName || '',
    dob: '',
    age: undefined,
    gender: 'Male',
    phone: '',
    bloodGroup: 'O+',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyRelation: 'Spouse / Parent',
    preExistingConditions: '',
    allergies: '',
    currentMedications: '',
    height: '',
    weight: '',
    address: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        fullName: initialData.fullName || defaultName || '',
        dob: initialData.dob || '',
        age: initialData.age,
        gender: initialData.gender || 'Male',
        phone: initialData.phone || '',
        bloodGroup: initialData.bloodGroup || 'O+',
        emergencyContactName: initialData.emergencyContactName || '',
        emergencyContactPhone: initialData.emergencyContactPhone || '',
        emergencyRelation: initialData.emergencyRelation || 'Spouse / Parent',
        preExistingConditions: initialData.preExistingConditions || '',
        allergies: initialData.allergies || '',
        currentMedications: initialData.currentMedications || '',
        height: initialData.height || '',
        weight: initialData.weight || '',
        address: initialData.address || '',
      });
    } else if (defaultName) {
      setFormData((prev) => ({ ...prev, fullName: defaultName }));
    }
  }, [initialData, defaultName]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Strict Client-side Validations
    if (!formData.fullName?.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!formData.phone?.trim()) {
      setErrorMsg('Please enter your primary phone/contact number.');
      return;
    }
    if (!formData.emergencyContactPhone?.trim()) {
      setErrorMsg('Please enter an emergency contact phone number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/patient/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save EMR profile details.');
      }

      setSuccessMsg('EMR details saved successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onSaveSuccess(data.emrProfile || formData as EmrProfile);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong while saving form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl border border-white/80 rounded-3xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#003893] to-[#2ab8d8] p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
                📋
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">
                  {isCompulsory ? 'Compulsory Patient EMR Form' : 'Edit Patient Health Details'}
                </h2>
                <p className="text-xs text-cyan-100 font-medium mt-0.5">
                  {isCompulsory
                    ? 'Action Required: Complete this form to unlock your Patient Dashboard.'
                    : 'Update your vital medical history, allergies, and contact details.'}
                </p>
              </div>
            </div>
            {!isCompulsory && onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm font-bold transition"
              >
                ✕
              </button>
            )}
          </div>
          {isCompulsory && (
            <div className="mt-3 px-3 py-1.5 bg-amber-500/20 border border-amber-300/30 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-100">
              <span>🔒</span>
              <span>Dashboard functionality is locked until compulsory EMR form is saved.</span>
            </div>
          )}
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <span>✅</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Identity & Vitals */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#003893] flex items-center gap-2">
              <span>👤</span> 1. Personal & Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName || ''}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Primary Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="e.g. +1 555-0192"
                  className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender || 'Male'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                >
                  {genderOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup || 'O+'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                >
                  {bloodGroupOptions.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Date of Birth / Age</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                  />
                  <input
                    type="number"
                    name="age"
                    value={formData.age || ''}
                    onChange={handleChange}
                    placeholder="Age"
                    className="w-20 px-3 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Height (cm)</label>
                  <input
                    type="text"
                    name="height"
                    value={formData.height || ''}
                    onChange={handleChange}
                    placeholder="175 cm"
                    className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="text"
                    name="weight"
                    value={formData.weight || ''}
                    onChange={handleChange}
                    placeholder="70 kg"
                    className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 2: Emergency Contacts */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#003893] flex items-center gap-2">
              <span>🚨</span> 2. Emergency Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  name="emergencyContactName"
                  value={formData.emergencyContactName || ''}
                  onChange={handleChange}
                  placeholder="e.g. Mary Doe"
                  className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Emergency Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="emergencyContactPhone"
                  value={formData.emergencyContactPhone || ''}
                  onChange={handleChange}
                  placeholder="e.g. +1 555-0999"
                  className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Relationship</label>
                <input
                  type="text"
                  name="emergencyRelation"
                  value={formData.emergencyRelation || ''}
                  onChange={handleChange}
                  placeholder="e.g. Spouse / Parent / Sibling"
                  className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section 3: Medical History & Conditions */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#003893] flex items-center gap-2">
              <span>🩺</span> 3. Clinical History & Medical Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Pre-existing Medical Conditions
                </label>
                <textarea
                  name="preExistingConditions"
                  value={formData.preExistingConditions || ''}
                  onChange={handleChange}
                  placeholder="e.g. Diabetes Type 2, Hypertension, Asthma, or None"
                  rows={2}
                  className="w-full p-3 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Allergies</label>
                  <input
                    type="text"
                    name="allergies"
                    value={formData.allergies || ''}
                    onChange={handleChange}
                    placeholder="e.g. Penicillin, Peanuts, Latex, or None"
                    className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Current Medications</label>
                  <input
                    type="text"
                    name="currentMedications"
                    value={formData.currentMedications || ''}
                    onChange={handleChange}
                    placeholder="e.g. Metformin 500mg, Lisinopril, or None"
                    className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  placeholder="Street Address, City, State/Province, Country"
                  className="w-full px-3.5 py-2.5 text-xs text-[#003893] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ab8d8] focus:bg-white outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            {!isCompulsory && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-[#003893] to-[#2ab8d8] hover:from-[#082f73] hover:to-[#1fb1d1] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#2ab8d8]/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Saving EMR Details...'
                : isCompulsory
                ? 'Save Details & Unlock Dashboard 🔓'
                : 'Save EMR Details 💾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
