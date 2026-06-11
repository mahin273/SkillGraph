import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { InviteActionCard } from "./InviteActionCard";

type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

type NotificationDropdownProps = {
  onClose: () => void;
};

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Notification[] }>("/notifications");
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications([]);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="absolute left-0 top-12 z-50 w-[320px] rounded-lg border border-[#dfe3ea] bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-[#edf0f5] p-3">
        <h3 className="text-sm font-semibold text-[#17202a]">Notifications</h3>
        {notifications.length > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs font-medium text-[#0c66e4] hover:text-[#0055cc]"
          >
            Clear all
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded px-1.5 py-1 text-xs text-muted-foreground hover:bg-[#eef1f6] hover:text-[#17202a]"
        >
          Close
        </button>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-slate-500">No new notifications</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {notifications.map((notification) => (
              <div key={notification.id}>
                {notification.type === "TEAM_INVITE_RECEIVED" ? (
                  <InviteActionCard
                    notification={notification}
                    onAction={() => markAsRead(notification.id)}
                  />
                ) : (
                  <div className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {getNotificationTitle(notification.type)}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {getNotificationMessage(notification)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getNotificationTitle(type: string): string {
  switch (type) {
    case "ENDORSEMENT_RECEIVED":
      return "New Endorsement";
    case "TEAM_INVITE_RECEIVED":
      return "Team Invitation";
    case "TEAM_INVITE_ACCEPTED":
      return "Invitation Accepted";
    case "TEAM_INVITE_DECLINED":
      return "Invitation Declined";
    case "INGESTION_COMPLETE":
      return "Skills Updated";
    case "GPS_PATH_UPDATED":
      return "Career Path Updated";
    default:
      return "Notification";
  }
}

function getNotificationMessage(notification: Notification): string {
  const { type, payload } = notification;
  
  switch (type) {
    case "ENDORSEMENT_RECEIVED":
      return `${payload.fromUser} endorsed your ${payload.skill} skill`;
    case "TEAM_INVITE_ACCEPTED":
      return `${payload.byUser} accepted your invitation to ${payload.projectName}`;
    case "TEAM_INVITE_DECLINED":
      return `${payload.byUser} declined your invitation`;
    case "INGESTION_COMPLETE":
      return `Found ${payload.skillsFound} skills from your repositories`;
    case "GPS_PATH_UPDATED":
      return `Your career path is now ${payload.newCompletion}% complete`;
    default:
      return "You have a new notification";
  }
}
