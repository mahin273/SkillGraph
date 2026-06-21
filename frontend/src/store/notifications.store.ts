import { create } from "zustand";

type NotificationsState = {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
};

export const useNotificationsStore = create<NotificationsState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount })
}));
