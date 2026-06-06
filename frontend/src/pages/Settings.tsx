import { GraduationCap, Github, LogOut, Mail, Plus, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { GitHubConnectButton } from "../components/auth/GitHubConnectButton";
import { GoogleConnectButton } from "../components/auth/GoogleConnectButton";
import {
  createDepartment,
  createUniversity,
  getAcademicOptions,
  getCurrentUser,
  logout,
  updateAcademicProfile,
  updateUserRole,
  type AcademicOptions,
  type AcademicProfile
} from "../services/auth.service";
import { useAuthStore } from "../store/auth.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CurrentUser = {
  id: string;
  role?: string;
  fullName: string;
  email?: string;
  emailVerified?: boolean;
  githubHandle?: string;
  githubConnected?: boolean;
  googleConnected?: boolean;
  publicHandle?: string;
  academicProfile?: AcademicProfile | null;
};

export function Settings() {
  const [user, setUserState] = useState<CurrentUser | null>(null);
  const [academicOptions, setAcademicOptions] = useState<AcademicOptions>({ universities: [] });
  const [universityId, setUniversityId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [newUniversityName, setNewUniversityName] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [addingUniversity, setAddingUniversity] = useState(false);
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [academicStatus, setAcademicStatus] = useState<string | null>(null);
  const [savingAcademicProfile, setSavingAcademicProfile] = useState(false);
  const { setUser, clearUser } = useAuthStore();

  const isStudent = user?.role === "student";
  const isProfessor = user?.role === "professor";
  const isAlumni = user?.role === "alumni";
  const hasConfiguredUniversity = !!user?.academicProfile?.universityId;
  const universityNameStr = user?.academicProfile?.universityName || "";

  useEffect(() => {
    void getCurrentUser()
      .then((currentUser) => {
        setUserState(currentUser);
        setUser(currentUser);
      })
      .catch(() => {
        window.location.href = "/login";
      });
  }, [setUser]);

  useEffect(() => {
    void getAcademicOptions()
      .then(setAcademicOptions)
      .catch(() => setAcademicOptions({ universities: [] }));
  }, []);

  useEffect(() => {
    const academicProfile = user?.academicProfile;
    setUniversityId(academicProfile?.universityId ?? "");
    setDepartmentId(academicProfile?.departmentId ?? "");
    setGraduationYear(academicProfile?.graduationYear ? String(academicProfile.graduationYear) : "");
  }, [user]);

  const selectedUniversity = academicOptions.universities.find((university) => university.id === universityId);

  async function handleAddUniversity() {
    const name = newUniversityName.trim();
    if (!name) {
      setAcademicStatus("Enter the university name first.");
      return;
    }

    setAddingUniversity(true);
    setAcademicStatus(null);

    try {
      const university = await createUniversity({ name });
      setAcademicOptions((current) => {
        const withoutDuplicate = current.universities.filter((item) => item.id !== university.id);
        return {
          universities: [...withoutDuplicate, university].sort((a, b) => a.name.localeCompare(b.name))
        };
      });
      setUniversityId(university.id);
      setDepartmentId("");
      setNewUniversityName("");
      setAcademicStatus(
        university.created
          ? "University added. Save your academic profile to use it for matchmaking."
          : "That university already exists, so I selected it for you."
      );
    } catch (error) {
      setAcademicStatus(error instanceof Error ? error.message : "Could not add university.");
    } finally {
      setAddingUniversity(false);
    }
  }

  async function handleAddDepartment() {
    const name = newDepartmentName.trim();
    if (!universityId) {
      setAcademicStatus("Choose a university before adding a department.");
      return;
    }
    if (!name) {
      setAcademicStatus("Enter the department name first.");
      return;
    }

    setAddingDepartment(true);
    setAcademicStatus(null);

    try {
      const department = await createDepartment({ universityId, name });
      setAcademicOptions((current) => ({
        universities: current.universities.map((university) => {
          if (university.id !== universityId) return university;
          const withoutDuplicate = university.departments.filter((item) => item.id !== department.id);
          return {
            ...university,
            departments: [...withoutDuplicate, department].sort((a, b) => a.name.localeCompare(b.name))
          };
        })
      }));
      setDepartmentId(department.id);
      setNewDepartmentName("");
      setAcademicStatus(
        department.created
          ? "Department added. Save your academic profile to use it for matchmaking."
          : "That department already exists, so I selected it for you."
      );
    } catch (error) {
      setAcademicStatus(error instanceof Error ? error.message : "Could not add department.");
    } finally {
      setAddingDepartment(false);
    }
  }

  async function handleAcademicProfileSave() {
    if (!universityId) {
      setAcademicStatus("Choose a university first.");
      return;
    }

    setSavingAcademicProfile(true);
    setAcademicStatus(null);

    try {
      const updatedAcademicProfile = await updateAcademicProfile({
        universityId,
        departmentId: departmentId || null,
        graduationYear: graduationYear ? Number(graduationYear) : null
      });
      const nextUser = user ? { ...user, academicProfile: updatedAcademicProfile } : user;
      if (nextUser) {
        setUserState(nextUser);
        setUser(nextUser);
      }
      setAcademicStatus("Academic profile saved. Matchmaking can now use university filters.");
    } catch (error) {
      setAcademicStatus(error instanceof Error ? error.message : "Could not save academic profile.");
    } finally {
      setSavingAcademicProfile(false);
    }
  }

  async function handleLogout() {
    await logout();
    clearUser();
    window.location.href = "/";
  }

  return (
    <section className="mx-auto grid w-full max-w-[1000px] gap-4 pb-20 lg:pb-4">
      <header className="rounded-lg border border-[#dfe3ea] bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-[#626f86]">Account</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#17202a]">Settings</h1>
      </header>

      <Card className="rounded-lg border-[#dfe3ea] bg-white py-0 shadow-sm">
        <CardHeader className="border-b border-[#edf0f5] px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <UserRound className="size-4 text-[#0c66e4]" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 text-sm">
          <div className="flex items-center justify-between rounded-lg bg-[#f7f8fa] p-3">
            <span className="text-[#626f86]">Name</span>
            <span className="font-medium text-[#17202a]">{user?.fullName ?? "Loading..."}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#f7f8fa] p-3">
            <span className="text-[#626f86]">Email</span>
            <span className="font-medium text-[#17202a]">{user?.email ?? "Not added"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#f7f8fa] p-3">
            <span className="text-[#626f86]">Public page</span>
            <span className="font-medium text-[#17202a]">{user?.publicHandle ? `/galaxy/${user.publicHandle}` : "Not ready"}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-[#f7f8fa] p-3">
            <span className="text-[#626f86]">User role</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f2ff] px-3 py-1 text-xs font-semibold text-[#0c66e4] capitalize">
              {user?.role === "admin" || user?.role === "superadmin"
                ? "System Administrator"
                : user?.role === "alumni"
                ? "Alumni / Mentor"
                : user?.role}
            </span>
          </div>
        </CardContent>
      </Card>

      {user?.role !== "admin" && user?.role !== "superadmin" && (
        <Card className="rounded-lg border-[#dfe3ea] bg-white py-0 shadow-sm">
          <CardHeader className="border-b border-[#edf0f5] px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <GraduationCap className="size-4 text-[#0c66e4]" />
              Academic profile
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* University Field */}
              {isProfessor || isAlumni ? (
                <div className="grid gap-2 text-sm font-medium text-[#17202a]">
                  University
                  <div className="h-9 flex items-center rounded-lg border border-[#cfd7e3] bg-[#f4f5f7] px-3 text-sm text-[#44546f] font-semibold">
                    {universityNameStr || "Not Configured"}
                  </div>
                </div>
              ) : (
                <label className="grid gap-2 text-sm font-medium text-[#17202a]">
                  University
                  <div className="grid gap-2">
                    <select
                      value={universityId}
                      onChange={(event) => {
                        setUniversityId(event.target.value);
                        setDepartmentId("");
                        setAcademicStatus(null);
                      }}
                      className="h-9 w-full rounded-lg border border-[#cfd7e3] bg-[#f7f8fa] px-3 text-sm outline-none focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20"
                    >
                      <option value="">Select university</option>
                      {academicOptions.universities.length === 0 && (
                        <option value="" disabled>
                          No universities available
                        </option>
                      )}
                      {academicOptions.universities.map((university) => (
                        <option key={university.id} value={university.id}>
                          {university.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newUniversityName}
                        onChange={(event) => {
                          setNewUniversityName(event.target.value);
                          setAcademicStatus(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleAddUniversity();
                          }
                        }}
                        placeholder="Add missing university"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-[#cfd7e3] bg-white px-3 text-sm outline-none focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20"
                      />
                      <Button
                        type="button"
                        onClick={handleAddUniversity}
                        disabled={addingUniversity || !newUniversityName.trim()}
                        className="gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
                      >
                        <Plus className="size-4" />
                        {addingUniversity ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                </label>
              )}

              {/* Department Field (Students only) */}
              {isStudent && (
                <label className="grid gap-2 text-sm font-medium text-[#17202a]">
                  Department
                  <div className="grid gap-2">
                    <select
                      value={departmentId}
                      onChange={(event) => {
                        setDepartmentId(event.target.value);
                        setAcademicStatus(null);
                      }}
                      disabled={!selectedUniversity}
                      className="h-9 w-full rounded-lg border border-[#cfd7e3] bg-[#f7f8fa] px-3 text-sm outline-none focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20 disabled:opacity-60"
                    >
                      <option value="">Select department</option>
                      {selectedUniversity && selectedUniversity.departments.length === 0 && (
                        <option value="" disabled>
                          No departments available
                        </option>
                      )}
                      {selectedUniversity?.departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDepartmentName}
                        onChange={(event) => {
                          setNewDepartmentName(event.target.value);
                          setAcademicStatus(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleAddDepartment();
                          }
                        }}
                        disabled={!selectedUniversity}
                        placeholder="Add missing department"
                        className="h-9 min-w-0 flex-1 rounded-lg border border-[#cfd7e3] bg-white px-3 text-sm outline-none focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20 disabled:opacity-60"
                      />
                      <Button
                        type="button"
                        onClick={handleAddDepartment}
                        disabled={addingDepartment || !selectedUniversity || !newDepartmentName.trim()}
                        className="gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
                      >
                        <Plus className="size-4" />
                        {addingDepartment ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                </label>
              )}
            </div>

            {/* Graduation Year Field (Students only) */}
            {isStudent && (
              <label className="grid max-w-xs gap-2 text-sm font-medium text-[#17202a]">
                Graduation year
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={graduationYear}
                  onChange={(event) => {
                    setGraduationYear(event.target.value);
                    setAcademicStatus(null);
                  }}
                  placeholder="2027"
                  className="h-9 rounded-lg border border-[#cfd7e3] bg-[#f7f8fa] px-3 text-sm outline-none focus:border-[#0c66e4] focus:ring-2 focus:ring-[#0c66e4]/20"
                />
              </label>
            )}

            {academicStatus && (
              <p className="rounded-lg bg-[#f7f8fa] px-3 py-2 text-sm text-[#44546f]">{academicStatus}</p>
            )}

            {/* Save Button (Hide for Professors and Alumni) */}
            {!(isProfessor || isAlumni) && (
              <div>
                <Button
                  type="button"
                  onClick={handleAcademicProfileSave}
                  disabled={savingAcademicProfile || !universityId || academicOptions.universities.length === 0}
                  className="gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
                >
                  <Save className="size-4" />
                  {savingAcademicProfile ? "Saving..." : "Save academic profile"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-lg border-[#dfe3ea] bg-white py-0 shadow-sm">
        <CardHeader className="border-b border-[#edf0f5] px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="size-4 text-[#1f845a]" />
            Sign-in methods
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4">
          <div className="flex flex-col gap-3 rounded-lg border border-[#edf0f5] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#17202a]">Email confirmation</p>
              <p className="text-sm text-[#626f86]">{user?.emailVerified ? "Verified" : "Not verified"}</p>
            </div>
            <span className={user?.emailVerified ? "text-sm font-medium text-[#1f845a]" : "text-sm font-medium text-[#974f0c]"}>
              {user?.emailVerified ? "Confirmed" : "Pending"}
            </span>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#edf0f5] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-[#17202a]">
                <Github className="size-4" />
                GitHub
              </p>
              <p className="text-sm text-[#626f86]">
                {user?.githubConnected ? `Connected as ${user.githubHandle}` : "Connect later to scan repositories."}
              </p>
            </div>
            <div className="w-full sm:w-56">
              {user?.githubConnected ? (
                <Button variant="outline" className="w-full border-[#cfd7e3] bg-white" disabled>
                  Connected
                </Button>
              ) : (
                <GitHubConnectButton label="Connect GitHub" link />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-[#edf0f5] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#17202a]">Google</p>
              <p className="text-sm text-[#626f86]">{user?.googleConnected ? "Connected" : "Use Google as a sign-in method."}</p>
            </div>
            <div className="w-full sm:w-56">
              {user?.googleConnected ? (
                <Button variant="outline" className="w-full border-[#cfd7e3] bg-white" disabled>
                  Connected
                </Button>
              ) : (
                <GoogleConnectButton label="Connect Google" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-[#dfe3ea] bg-white p-4 shadow-sm">
        <Button variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50" onClick={handleLogout}>
          <LogOut className="size-4" />
          Log out
        </Button>
      </Card>
    </section>
  );
}
