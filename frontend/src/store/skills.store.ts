import { create } from "zustand";

type SkillsState = {
  skills: string[];
  setSkills: (skills: string[]) => void;
};

export const useSkillsStore = create<SkillsState>((set) => ({
  skills: [],
  setSkills: (skills) => set({ skills })
}));
