import { useEffect, useState } from "react";
import {
  getPendingAlumni,
  verifyAlumni
} from "../../services/mentorship.service";
import {
  Check,
  X,
  FileUser,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Eye,
  Loader2,
  AlertCircle
} from "lucide-react";

export function AlumniVerificationQueue() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await getPendingAlumni();
      setPending(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching pending verification list:", err);
      setError("Failed to load verification queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPending();
  }, []);

  const handleVerify = async (id: string, approve: boolean) => {
    try {
      setActioningId(id);
      await verifyAlumni(id, approve);
      // Remove from state list
      setPending((prev) => prev.filter((item) => item.id !== id));
      if (selectedImage) setSelectedImage(null);
    } catch (err) {
      console.error(`Error verifying alumnus profile ${id}:`, err);
      alert("Failed to process verification request.");
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm text-slate-500">Loading verification queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <AlertCircle className="h-10 w-10 text-rose-500" />
        <p className="mt-3 text-sm font-medium text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-full">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
          Verification Queue ({pending.length})
        </span>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Alumni ID Verification Queue</h3>
        <p className="text-xs text-slate-500">Review uploaded identity cards and verify user credentials before granting mentor privileges.</p>
      </div>

      {/* Main List */}
      <div className="mt-6 flex-1 max-h-[500px] overflow-y-auto space-y-4">
        {pending.map((alumnus) => (
          <div
            key={alumnus.id}
            className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-[#fbfcfe] p-4 transition-all hover:shadow-md md:flex-row md:items-center justify-between"
          >
            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm truncate">{alumnus.fullName}</span>
                <span className="text-[10px] font-semibold text-[#0c66e4] bg-[#e9f2ff] px-2 py-0.5 rounded">
                  Class of {alumnus.graduationYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{alumnus.email}</p>
              <div className="mt-2 text-xs text-slate-700 font-medium">
                {alumnus.currentRole} at <span className="font-semibold">{alumnus.currentCompany}</span> ({alumnus.yearsExperience} yrs exp)
              </div>
              <div className="mt-3 flex items-center gap-3">
                {alumnus.linkedinUrl && (
                  <a
                    href={alumnus.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0c66e4] hover:underline"
                  >
                    LinkedIn Profile
                    <ExternalLink className="size-3" />
                  </a>
                )}
                {alumnus.githubHandle && (
                  <a
                    href={`https://github.com/${alumnus.githubHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:underline"
                  >
                    GitHub: @{alumnus.githubHandle}
                  </a>
                )}
              </div>
            </div>

            {/* Thumbnail ID Preview & Verification Actions */}
            <div className="flex items-center gap-4 shrink-0 mt-3 md:mt-0">
              {alumnus.alumniCardUrl ? (
                <div className="relative group size-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                  <img
                    src={alumnus.alumniCardUrl}
                    alt="Alumni ID Card"
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(alumnus.alumniCardUrl)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    title="View card"
                  >
                    <Eye className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="size-20 rounded-lg border border-slate-200 border-dashed bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <FileUser className="size-6" />
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={actioningId !== null}
                  onClick={() => void handleVerify(alumnus.id, true)}
                  className="flex items-center justify-center size-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
                  title="Approve Alumnus"
                >
                  {actioningId === alumnus.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={actioningId !== null}
                  onClick={() => void handleVerify(alumnus.id, false)}
                  className="flex items-center justify-center size-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all disabled:opacity-50"
                  title="Reject Alumnus"
                >
                  {actioningId === alumnus.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {pending.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-slate-200 rounded-xl">
            <ShieldCheck className="h-10 w-10 text-emerald-400" />
            <h4 className="mt-3 text-sm font-bold text-slate-700">All Clear!</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-[280px]">
              There are no pending alumni ID verification requests in the queue.
            </p>
          </div>
        )}
      </div>

      {/* Large Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute right-4 top-4 z-10 flex items-center justify-center size-8 rounded-full bg-black/50 text-white hover:bg-black/75 transition-colors"
            >
              <X className="size-4" />
            </button>
            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[300px] max-h-[500px]">
              <img
                src={selectedImage}
                alt="Alumni ID Card Fullview"
                className="max-h-[460px] object-contain rounded-lg"
              />
            </div>
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end gap-3">
              {/* Find the alumnus item in state to let verification be triggered from here */}
              {pending.find((item) => item.alumniCardUrl === selectedImage) && (
                <>
                  <button
                    type="button"
                    disabled={actioningId !== null}
                    onClick={() => {
                      const item = pending.find((p) => p.alumniCardUrl === selectedImage);
                      if (item) void handleVerify(item.id, false);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    <X className="size-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={actioningId !== null}
                    onClick={() => {
                      const item = pending.find((p) => p.alumniCardUrl === selectedImage);
                      if (item) void handleVerify(item.id, true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="size-4" />
                    Approve & Verify
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
