import { useState } from "react";
import { api } from "../../services/api";

type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

type InviteActionCardProps = {
  notification: Notification;
  onAction: () => void;
};

export function InviteActionCard({ notification, onAction }: InviteActionCardProps) {
  const [loading, setLoading] = useState(false);
  const [responded, setResponded] = useState(false);

  const { projectName, fromUser, inviteId } = notification.payload as {
    projectName: string;
    fromUser: string;
    inviteId: string;
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.put(`/team/invite/${inviteId}/accept`);
      setResponded(true);
      onAction();
    } catch (error) {
      console.error("Failed to accept invitation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await api.put(`/team/invite/${inviteId}/decline`);
      setResponded(true);
      onAction();
    } catch (error) {
      console.error("Failed to decline invitation:", error);
    } finally {
      setLoading(false);
    }
  };

  if (responded) {
    return (
      <div className="p-4 bg-slate-50">
        <p className="text-sm text-slate-600">Response sent</p>
      </div>
    );
  }

  return (
    <article className="p-4 hover:bg-slate-50">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-slate-900">Team Invitation</p>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-medium">{fromUser}</span> invited you to join{" "}
            <span className="font-medium">{projectName}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Accept"}
          </button>
          <button
            onClick={handleDecline}
            disabled={loading}
            className="flex-1 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Decline"}
          </button>
        </div>
      </div>
    </article>
  );
}
