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
    case "MENTORSHIP_REQUESTED":
      return "Mentorship Request";
    case "MENTORSHIP_ACCEPTED":
      return "Mentorship Accepted";
    case "MENTORSHIP_MESSAGE":
      return "New Message";
    case "MENTORSHIP_COMPLETED":
      return "Mentorship Completed";
    case "CAREER_FAIR_INVITE":
      return "Career Fair Invite";
    case "SKILL_DECAY":
      return "Skill Decay Warning";
    default:
      return "Notification";
  }
}

function getNotificationMessage(notification: Notification): string {
  const { type, payload } = notification;
  if (!payload) return "You have a new notification";
  const p = payload as any;
  
  switch (type) {
    case "ENDORSEMENT_RECEIVED":
      return `${p.fromUser || "Someone"} endorsed your ${p.skill || "skill"} skill`;
    case "TEAM_INVITE_RECEIVED":
      return `${p.fromUser || "Someone"} invited you to join team for project ${p.projectName || ""}`;
    case "TEAM_INVITE_ACCEPTED":
      return `${p.byUser || "Someone"} accepted your invitation to ${p.projectName || ""}`;
    case "TEAM_INVITE_DECLINED":
      return `${p.byUser || "Someone"} declined your invitation`;
    case "INGESTION_COMPLETE":
      return `Found ${p.skillsFound || 0} skills from your repositories`;
    case "GPS_PATH_UPDATED":
      return `Your career path is now ${p.newCompletion || 0}% complete`;
    case "MENTORSHIP_REQUESTED":
      return `${p.studentName || "A student"} requested mentorship for ${p.skillName || "a skill"}`;
    case "MENTORSHIP_ACCEPTED":
      return `${p.mentorName || "A mentor"} accepted your mentorship request for ${p.skillName || "a skill"}`;
    case "MENTORSHIP_MESSAGE":
      return `${p.senderName || "Your partner"} (${p.skillName || ""}): ${p.preview || ""}`;
    case "MENTORSHIP_COMPLETED":
      return `${p.mentorName || "Your mentor"} completed your mentorship for ${p.skillName || ""}`;
    case "CAREER_FAIR_INVITE":
      return `${p.companyName || "A company"} invited you to their booth (${p.boothNumber || ""}) for ${p.fairName || ""}`;
    case "SKILL_DECAY":
      return p.warningText || `Your skill "${p.skillName || ""}" has decayed due to inactivity.`;
    default:
      return "You have a new notification";
  }
}
