'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface GiftData {
  id: string;
  agent_id: string;
  message_filtered: string;
  object_name: string;
  object_image_url: string | null;
  status: string;
  expires_at: string;
}

export default function ClaimPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gift, setGift] = useState<GiftData | null>(null);
  const [response, setResponse] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    async function fetchGift() {
      try {
        const res = await fetch(`/api/v1/claim/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load gift');
          return;
        }

        setGift(data.gift);
      } catch {
        setError('Failed to load gift');
      } finally {
        setLoading(false);
      }
    }

    fetchGift();
  }, [token]);

  const handleAccept = async () => {
    try {
      const res = await fetch(`/api/v1/claim/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to process response');
        return;
      }

      setResponse('accepted');

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      setError('Failed to process response');
    }
  };

  const handleDecline = async () => {
    try {
      const res = await fetch(`/api/v1/claim/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });

      if (res.ok) {
        setResponse('declined');
      }
    } catch {
      setError('Failed to process response');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Unable to load gift
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (response === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Gift Declined
          </h1>
          <p className="text-gray-600">
            You&apos;ve declined this gift. The agent will be notified.
          </p>
        </div>
      </div>
    );
  }

  if (response === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Gift Accepted!
          </h1>
          <p className="text-gray-600">
            You&apos;ll be redirected to complete your shipping details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full mx-auto p-8 bg-white rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Someone wants to thank you
          </h1>
          <p className="text-gray-600">
            An AI agent would like to send you a gift
          </p>
        </div>

        {gift && (
          <>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-500 mb-2">
                From: <span className="font-medium">{gift.agent_id}</span>
              </p>
              <p className="text-gray-900 italic">
                &ldquo;{gift.message_filtered}&rdquo;
              </p>
            </div>

            <div className="border rounded-lg p-4 mb-6">
              {gift.object_image_url && (
                <img
                  src={gift.object_image_url}
                  alt={gift.object_name}
                  className="w-full h-48 object-cover rounded mb-4"
                />
              )}
              <p className="font-medium text-gray-900">{gift.object_name}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAccept}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Accept Gift
              </button>
              <button
                onClick={handleDecline}
                className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Decline
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-6">
              If you accept, you&apos;ll be asked to provide a shipping address.
              Your address will never be shared with the AI agent.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
