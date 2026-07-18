/**
 * Patient dashboard page
 * Shows welcome message, recent documents list, quick action button, and stats
 */

'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DocumentList } from '@/components/DocumentList';
import type { Document } from '@/types/documents';

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pendingConfirmation: 0,
  });

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/documents');

        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }

        const data = await response.json();
        const docs = data.documents || [];

        setDocuments(docs);

        // Calculate stats
        const pendingConfirmation = docs.filter((doc: Document) => !doc.isConfirmed).length;
        setStats({
          total: docs.length,
          pendingConfirmation,
        });
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const recentDocuments = documents.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Welcome back, {session?.user?.name}!</h1>
        <p className="text-blue-100 text-lg">
          Manage your medical documents and extract information with ease
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Documents Stat */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Total Documents</p>
              <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="flex-shrink-0">
              <svg
                className="h-12 w-12 text-blue-600 opacity-20"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M4 4a2 2 0 012-2h6a2 2 0 012 2v12a1 1 0 11-2 0V4a1 1 0 00-1-1H6a1 1 0 00-1 1v12a1 1 0 11-2 0V4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Confirmation Stat */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-1">Pending Confirmation</p>
              <p className="text-4xl font-bold text-orange-600">{stats.pendingConfirmation}</p>
            </div>
            <div className="flex-shrink-0">
              <svg
                className="h-12 w-12 text-orange-600 opacity-20"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M13 6a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 11-2 0 1 1 0 012 0zm7 1a1 1 0 100-2 1 1 0 000 2zM9 17a1 1 0 11-2 0 1 1 0 012 0zm6-5a1 1 0 11-2 0 1 1 0 012 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="flex justify-center">
        <Link
          href="/dashboard/patient/upload"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition duration-200"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Upload New Document
        </Link>
      </div>

      {/* Recent Documents Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Recent Documents</h2>
          <p className="text-gray-600">
            {recentDocuments.length === 0
              ? 'No documents yet. Start by uploading your first one!'
              : `Showing ${recentDocuments.length} of ${documents.length} documents`}
          </p>
        </div>

        {/* Document List */}
        <DocumentList documents={recentDocuments} isLoading={isLoading} />

        {/* View All Documents Link */}
        {documents.length > 5 && (
          <div className="mt-6 text-center">
            <Link
              href="/dashboard/patient/documents"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              View all {documents.length} documents →
            </Link>
          </div>
        )}
      </div>

      {/* Empty State CTA */}
      {documents.length === 0 && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents uploaded yet</h3>
          <p className="text-gray-600 mb-6">
            Upload your medical documents (prescriptions, diagnostic reports, discharge summaries)
            to get started
          </p>
          <Link
            href="/dashboard/patient/upload"
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Upload Your First Document
          </Link>
        </div>
      )}
    </div>
  );
}
