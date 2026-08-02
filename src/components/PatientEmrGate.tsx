/**
 * MediFlow — Patient EMR Gate & Profile Provider
 * Strictly enforces EMR completion before unlocking Patient Dashboard
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { EmrProfile } from '@/types/documents';
import EmrFormModal from '@/components/EmrFormModal';

interface EmrGateContextType {
  isEmrCompleted: boolean;
  emrProfile: EmrProfile | null;
  isLoading: boolean;
  openEditModal: () => void;
  refreshProfile: () => Promise<void>;
}

const EmrGateContext = createContext<EmrGateContextType>({
  isEmrCompleted: false,
  emrProfile: null,
  isLoading: true,
  openEditModal: () => {},
  refreshProfile: async () => {},
});

export const useEmrProfile = () => useContext(EmrGateContext);

export default function PatientEmrGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [isEmrCompleted, setIsEmrCompleted] = useState<boolean>(false);
  const [emrProfile, setEmrProfile] = useState<EmrProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showCompulsoryModal, setShowCompulsoryModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  const fetchProfile = async () => {
    if (!session?.user) return;
    try {
      setIsLoading(true);
      const res = await fetch('/api/patient/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsEmrCompleted(!!data.isEmrCompleted);
          setEmrProfile(data.emrProfile || null);

          // Check if patient role and EMR is NOT completed
          const userRole = (session.user as any).role || 'patient';
          if (userRole === 'patient' && !data.isEmrCompleted) {
            setShowCompulsoryModal(true);
          } else {
            setShowCompulsoryModal(false);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching EMR profile in Gate:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [session, status]);

  const handleSaveSuccess = (savedProfile: EmrProfile) => {
    setEmrProfile(savedProfile);
    setIsEmrCompleted(true);
    setShowCompulsoryModal(false);
    setShowEditModal(false);
  };

  const openEditModal = () => {
    setShowEditModal(true);
  };

  return (
    <EmrGateContext.Provider
      value={{
        isEmrCompleted,
        emrProfile,
        isLoading,
        openEditModal,
        refreshProfile: fetchProfile,
      }}
    >
      {/* Container with conditional blur & pointer locking when EMR is compulsory */}
      <div className={`relative transition-all duration-300 ${showCompulsoryModal ? 'filter blur-sm pointer-events-none select-none min-h-[400px]' : ''}`}>
        {children}
      </div>

      {/* Compulsory EMR Registration Modal for New / Unregistered Existing Patients */}
      <EmrFormModal
        isOpen={showCompulsoryModal}
        isCompulsory={true}
        initialData={emrProfile}
        defaultName={session?.user?.name || ''}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Edit EMR Modal (User triggered anytime from dashboard) */}
      <EmrFormModal
        isOpen={showEditModal}
        isCompulsory={false}
        initialData={emrProfile}
        defaultName={session?.user?.name || ''}
        onSaveSuccess={handleSaveSuccess}
        onClose={() => setShowEditModal(false)}
      />
    </EmrGateContext.Provider>
  );
}
