import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { useSocket } from "../../hooks/useSocket";

type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

type NotificationBellProps = {
  onToggle?: () => void;
};

export function NotificationBell({ onToggle }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useSocket();

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Notification[] }>("/notifications");
      if (response.data.success) {
        setUnreadCount(response.data.data.length);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    if (socket) {
      socket.on("notification", () => {
        fetchUnreadCount();
      });
    }

    return () => {
      if (socket) {
        socket.off("notification");
      }
    };
  }, [socket]);

  return (
    <button
      className="relative rounded-md p-2 text-muted-foreground hover:bg-[#eef1f6] hover:text-[#17202a]"
      aria-label="Notifications"
      onClick={onToggle}
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
