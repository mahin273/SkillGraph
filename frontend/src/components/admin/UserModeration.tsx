import { useEffect, useState, FormEvent } from "react";
import { listUsers, updateUser, createInvitation } from "../../services/admin.service";
import { getAcademicOptions } from "../../services/auth.service";
import { useAuthStore } from "../../store/auth.store";
import { Shield, ToggleLeft, ToggleRight, User, Users, Clipboard, Check, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserModeration() {
  const { academicProfile } = useAuthStore();
  const isSuperAdmin = !academicProfile?.universityId;

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("professor");
  const [inviteUnivId, setInviteUnivId] = useState("");
  const [universities, setUniversities] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  // Filter states
  const [filterPending, setFilterPending] = useState(false);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const data = await listUsers(page, 20, filterPending ? false : undefined);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers(currentPage);
  }, [currentPage, filterPending]);

  useEffect(() => {
    if (isSuperAdmin) {
      getAcademicOptions()
        .then((data) => {
          setUniversities(data.universities);
          if (data.universities.length > 0) {
            setInviteUnivId(data.universities[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isSuperAdmin]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser(userId, { isActive: !currentStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
      );
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await updateUser(userId, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      alert("Failed to update role: " + err.message);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await updateUser(userId, { isVerified: true });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isVerified: true } : u))
      );
      if (filterPending) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err: any) {
      alert("Failed to approve user: " + err.message);
    }
  };

  const handleCreateInvitation = async (e: FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteLink("");
    setInviteLoading(true);
    try {
      const data = await createInvitation({
        email: inviteEmail,
        role: inviteRole,
        universityId: isSuperAdmin ? inviteUnivId : undefined
      });
      const link = `${window.location.origin}/signup?invite=${data.token}`;
      setInviteLink(link);
      setInviteEmail("");
    } catch (err: any) {
      setInviteError(err.response?.data?.error?.message || err.message || "Failed to create invitation");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPageNumbers = () => {
    if (!pagination) return [];
    const pages: (number | string)[] = [];
    const range = 1;

    for (let i = 1; i <= pagination.totalPages; i++) {
      if (
        i === 1 ||
        i === pagination.totalPages ||
        (i >= currentPage - range && i <= currentPage + range)
      ) {
        pages.push(i);
      } else if (i === 2 || i === pagination.totalPages - 1) {
        pages.push("...");
      }
    }

    const cleanPages: (number | string)[] = [];
    for (let i = 0; i < pages.length; i++) {
      if (pages[i] === "..." && cleanPages[cleanPages.length - 1] === "...") {
        continue;
      }
      cleanPages.push(pages[i]);
    }
    return cleanPages;
  };

  if (loading && users.length === 0) return <div className="text-center py-8 text-sm text-gray-500">Loading users directory...</div>;
  if (error) return <div className="text-center py-8 text-sm text-red-500">{error}</div>;

  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-6">
        <div className="grid size-9 place-items-center rounded-lg bg-[#e9f2ff] text-[#0c66e4]">
          <Users className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#17202a]">User Directory & Moderation</h2>
          <p className="text-xs text-muted-foreground">Manage platform roles, verify faculty & alumni, and issue invites.</p>
        </div>
      </div>

      {/* Invite Staff / Alumni Portal */}
      <div className="mb-8 rounded-xl border border-[#dfe3ea] bg-[#fdfefe] p-5 shadow-xs transition-all hover:shadow-md">
        <h3 className="text-sm font-semibold text-[#17202a] mb-3 flex items-center gap-2">
          <Plus className="size-4 text-[#0c66e4]" />
          Invite Academic Staff or Alumni
        </h3>
        <form onSubmit={handleCreateInvitation} className="grid gap-4 md:grid-cols-4 items-end">
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Email Address
            <input
              type="email"
              required
              placeholder="e.g. staff@university.edu"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="mt-1 h-9 rounded-md border border-[#cfd7e3] bg-white px-3 text-xs outline-none focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4]"
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
            Role Type
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="mt-1 h-9 rounded-md border border-[#cfd7e3] bg-white px-3 text-xs outline-none focus:border-[#0c66e4]"
            >
              <option value="professor">Professor</option>
              <option value="alumni">Alumni</option>
            </select>
          </label>
          {isSuperAdmin ? (
            <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
              Target University
              <select
                value={inviteUnivId}
                onChange={(e) => setInviteUnivId(e.target.value)}
                className="mt-1 h-9 rounded-md border border-[#cfd7e3] bg-white px-3 text-xs outline-none focus:border-[#0c66e4]"
              >
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="grid gap-1 text-xs font-semibold text-muted-foreground">
              University Scope
              <div className="mt-1 h-9 rounded-md border border-dashed border-[#cfd7e3] bg-[#f4f5f7] px-3 flex items-center text-muted-foreground font-normal select-none">
                {academicProfile?.universityName || "Your University"}
              </div>
            </div>
          )}
          <Button
            type="submit"
            disabled={inviteLoading}
            className="h-9 bg-[#0c66e4] hover:bg-[#0055cc] text-white text-xs font-semibold transition-all"
          >
            {inviteLoading ? "Generating..." : "Generate Invitation"}
          </Button>
        </form>

        {inviteError && (
          <div className="mt-3 text-xs text-[#ae2a19] bg-[#ffebe6] p-2 rounded-md border border-[#ffd2cc]">
            {inviteError}
          </div>
        )}

        {inviteLink && (
          <div className="mt-4 p-3 bg-[#e7f8ef] border border-[#cfecdc] rounded-md flex items-center justify-between gap-3 animate-fade-in">
            <div className="text-xs text-[#1f845a] truncate font-medium">
              Invite generated successfully! Share this link: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#cfecdc] ml-1">{inviteLink}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1 text-xs text-[#1f845a] hover:text-[#196b48] font-bold shrink-0 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="size-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Clipboard className="size-3.5" /> Copy Link
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-4 border-b border-[#edf0f5]">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Filter Directory:</span>
          <button
            onClick={() => { setFilterPending(false); setCurrentPage(1); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              !filterPending
                ? "bg-[#0c66e4] text-white"
                : "bg-[#f4f5f7] text-muted-foreground hover:bg-[#edf0f5]"
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => { setFilterPending(true); setCurrentPage(1); }}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              filterPending
                ? "bg-[#0c66e4] text-white"
                : "bg-[#f4f5f7] text-muted-foreground hover:bg-[#edf0f5]"
            }`}
          >
            Pending Approvals
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-[#17202a]">
          <thead>
            <tr className="border-b border-[#cfd7e3] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 px-4">Email</th>
              <th className="pb-3 px-4">Role</th>
              <th className="pb-3 px-4">University / Info</th>
              <th className="pb-3 px-4">Status & Verification</th>
              <th className="pb-3 pl-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f5]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-gray-400 font-medium">
                  No users found matching your filters.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-[#f7f8fa]">
                  <td className="py-3.5 pr-4 font-medium flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" />
                    {user.fullName}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">{user.email || "No email"}</td>
                  <td className="py-3.5 px-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      className="h-8 rounded border border-[#cfd7e3] bg-white px-2 text-xs outline-none focus:border-[#0c66e4]"
                    >
                      <option value="student">Student</option>
                      <option value="professor">Professor</option>
                      <option value="alumni">Alumni</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-muted-foreground">
                    {user.studentProfile?.university?.shortName
                      ? `${user.studentProfile.university.shortName} (${user.studentProfile.department?.code || "CSE"})`
                      : user.alumniProfile?.university?.shortName
                      ? `Alumni at ${user.alumniProfile.university.shortName}`
                      : user.university?.shortName || user.university?.name
                      ? `Faculty at ${user.university?.shortName || user.university?.name}`
                      : "System User"}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium w-fit ${
                          user.isActive
                            ? "bg-[#e7f8ef] text-[#1f845a]"
                            : "bg-[#ffebe6] text-[#ae2a19]"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium w-fit ${
                          user.isVerified
                            ? "bg-[#e9f2ff] text-[#0c66e4]"
                            : "bg-[#ffebe6] text-[#ae2a19] animate-pulse"
                        }`}
                      >
                        {user.isVerified ? "Verified" : "Pending Verification"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 pl-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleToggleStatus(user.id, user.isActive)}
                        className="flex items-center gap-1 text-xs"
                      >
                        {user.isActive ? (
                          <>
                            <ToggleRight className="size-4 text-[#1f845a]" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="size-4 text-muted-foreground" />
                            Activate
                          </>
                        )}
                      </Button>
                      {!user.isVerified && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleApproveUser(user.id)}
                          className="border-[#1f845a] text-[#1f845a] hover:bg-[#e7f8ef] font-semibold text-xs flex items-center gap-1 shrink-0"
                        >
                          <Check className="size-3.5" />
                          Approve
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#edf0f5] pt-4 mt-6">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-[#17202a]">{(currentPage - 1) * pagination.limit + 1}</span> to{" "}
            <span className="font-semibold text-[#17202a]">
              {Math.min(currentPage * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-[#17202a]">{pagination.total}</span> users
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="h-8 text-xs px-3 border-[#cfd7e3] hover:bg-[#f4f5f7] disabled:opacity-50 disabled:hover:bg-white"
            >
              Previous
            </Button>
            {getPageNumbers().map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-1.5 text-gray-400 text-xs select-none">
                    ...
                  </span>
                );
              }
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p as number)}
                  className={`h-8 min-w-[32px] rounded text-xs font-medium transition-colors ${
                    currentPage === p
                      ? "bg-[#0c66e4] text-white"
                      : "border border-[#cfd7e3] bg-white text-[#17202a] hover:bg-[#f4f5f7]"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pagination.totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))}
              className="h-8 text-xs px-3 border-[#cfd7e3] hover:bg-[#f4f5f7] disabled:opacity-50 disabled:hover:bg-white"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
