import { useEffect, useState } from "react";
import { api } from "../services/api";
import { InviteActionCard } from "../components/notifications/InviteActionCard";

type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

export function Notifications() {
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

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-sm text-muted-foreground">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-4 pb-20 lg:pb-4">
      <header className="rounded-lg border border-[#dfe3ea] bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Inbox</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#17202a]">Notifications</h1>
      </header>
      {notifications.length === 0 ? (
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">No new notifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className="rounded-lg border border-[#dfe3ea] bg-white shadow-sm">
              {notification.type === "TEAM_INVITE_RECEIVED" ? (
                <InviteActionCard
                  notification={notification}
                  onAction={() => markAsRead(notification.id)}
                />
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#17202a]">
                        {getNotificationTitle(notification.type)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {getNotificationMessage(notification)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="ml-2 rounded-md px-2 py-1 text-xs font-medium text-[#0c66e4] hover:bg-[#e9f2ff]"
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
