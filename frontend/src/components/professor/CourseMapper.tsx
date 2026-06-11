import { useEffect, useState } from "react";
import { listCourses, mapCourse, getAllSkills, extractSyllabusSkills } from "../../services/admin.service";
import { BookOpen, Check, Link, Plus, RefreshCw, Save, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CourseMapper() {
  const [courses, setCourses] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Form states
  const [courseCode, setCourseCode] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [syllabusText, setSyllabusText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inputMode, setInputMode] = useState<"url" | "pdf">("url");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [coursesData, skillsData] = await Promise.all([listCourses(), getAllSkills()]);
      setCourses(coursesData);
      setSkills(skillsData);
    } catch (err: any) {
      setError(err.message || "Failed to load mapping data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInitialData();
  }, []);

  const handleToggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const updatedCourse = await mapCourse({
        title,
        url,
        courseCode,
        skills: selectedSkills
      });

      // Update courses list
      setCourses((prev) => {
        const index = prev.findIndex((c) => c.url === url);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = updatedCourse;
          return updated;
        }
        return [...prev, updatedCourse];
      });

      setSuccess(true);
      setCourseCode("");
      setTitle("");
      setUrl("");
      setSelectedSkills([]);
      setPdfFile(null);
      setInputMode("url");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to map course: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    setPdfFile(file);
    setParsingPdf(true);
    try {
      const pdfjsUrl = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs";
      const pdfjs: any = await import(/* @vite-ignore */ pdfjsUrl);
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";
      
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let extractedText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        extractedText += pageText + "\n";
      }

      if (!extractedText.trim()) {
        throw new Error("No readable text found in PDF. The PDF might contain scanned images without OCR.");
      }

      setSyllabusText(extractedText);
      
      // Auto-generate unique URL format
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      setUrl(`pdf://${Date.now()}-${sanitizedName}`);
      
      // Auto-prefill course title if not set
      if (!title) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setTitle(nameWithoutExt);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to parse PDF: " + (err.message || err));
      setPdfFile(null);
    } finally {
      setParsingPdf(false);
    }
  };

  const handleExtractSyllabus = async () => {
    if (!syllabusText.trim()) return;
    try {
      setExtracting(true);
      const suggested = await extractSyllabusSkills(syllabusText);
      
      // Auto-toggle checkbox selections on skills matching suggested names
      const skillIdsToSelect: string[] = [];
      suggested.forEach((sug) => {
        const found = skills.find(
          (sk) => sk.name.toLowerCase() === sug.skill_name.toLowerCase()
        );
        if (found) {
          skillIdsToSelect.push(found.id);
        }
      });
      
      setSelectedSkills((prev) => {
        const merged = new Set([...prev, ...skillIdsToSelect]);
        return Array.from(merged);
      });
      
      setSyllabusText("");
      alert(`AI Extraction complete! Pre-selected ${skillIdsToSelect.length} matching skills in the catalog.`);
    } catch (err: any) {
      alert("Failed to extract skills: " + (err.message || err));
    } finally {
      setExtracting(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-sm text-gray-500">Loading course mapper...</div>;
  if (error) return <div className="text-center py-8 text-sm text-red-500">{error}</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Mapped Courses Directory */}
      <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-6">
          <div className="grid size-9 place-items-center rounded-lg bg-[#e9f2ff] text-[#0c66e4]">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#17202a]">Syllabus Course Skill-Mapping</h2>
            <p className="text-xs text-muted-foreground">Pre-fill student skill graphs via curriculum accomplishments.</p>
          </div>
        </div>

        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">No university-approved courses mapped yet. Use the sidebar editor to add one.</div>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
              >
                <div>
                  <span className="rounded bg-[#e9f2ff] px-2 py-0.5 text-xs font-semibold text-[#0c66e4]">
                    {course.courseCode}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold text-[#17202a]">{course.title}</h3>
                  {course.url?.startsWith("pdf://") ? (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="size-3" />
                      PDF: {course.url.substring(6).replace(/^\d+-/, "")}
                    </span>
                  ) : (
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-[#0c66e4] hover:underline"
                    >
                      <Link className="size-3" />
                      Syllabus Link
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-w-sm">
                  {course.skills.map((rs: any) => (
                    <span
                      key={rs.id}
                      className="rounded-md border border-[#e2e6ed] bg-white px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {rs.skill?.name || "Skill"}
                    </span>
                  ))}
                  {course.skills.length === 0 && (
                    <span className="text-xs text-muted-foreground">No skills mapped yet</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Course Mapping Form */}
      <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm h-fit">
        <h3 className="text-sm font-semibold text-[#17202a] border-b border-[#edf0f5] pb-3 mb-4">
          Map New Course
        </h3>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Course Code
            <Input
              type="text"
              placeholder="e.g. CSE 3522"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              className="mt-1"
              required
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Course Title
            <Input
              type="text"
              placeholder="e.g. Database Management Systems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
              required
            />
          </label>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Syllabus Source
              </span>
              <div className="flex gap-2 bg-[#f7f8fa] p-0.5 rounded-md border border-[#dfe3ea]">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("url");
                    setUrl("");
                    setPdfFile(null);
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    inputMode === "url"
                      ? "bg-white text-[#0c66e4] shadow-sm"
                      : "text-muted-foreground hover:text-[#17202a]"
                  }`}
                >
                  URL Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("pdf");
                    setUrl("");
                    setSyllabusText("");
                  }}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    inputMode === "pdf"
                      ? "bg-white text-[#0c66e4] shadow-sm"
                      : "text-muted-foreground hover:text-[#17202a]"
                  }`}
                >
                  Upload PDF
                </button>
              </div>
            </div>

            {inputMode === "url" ? (
              <Input
                type="url"
                placeholder="https://uiu.ac.bd/dbms-syllabus"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            ) : (
              <div className="grid gap-2">
                <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#cfd7e3] bg-[#f7f8fa] p-4 text-center transition-all hover:bg-[#eef1f6] group">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={parsingPdf}
                  />
                  <Upload className="size-5 text-muted-foreground mb-1.5 group-hover:text-[#0c66e4] transition-colors" />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="font-semibold text-[#0c66e4]">
                      {parsingPdf ? "Parsing document..." : "Click to upload syllabus PDF"}
                    </p>
                    <p>PDF files only (max 10MB)</p>
                  </div>
                </div>

                {pdfFile && (
                  <div className="flex items-center justify-between rounded-md border border-[#e2e6ed] bg-[#f7f8fa] px-3 py-2 text-xs">
                    <span className="font-medium text-muted-foreground truncate max-w-[220px]">
                      {pdfFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfFile(null);
                        setUrl("");
                        setSyllabusText("");
                      }}
                      className="text-[#dc2626] font-semibold hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-[#edf0f5] pt-3 my-1">
            <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI Syllabus Parser
              <textarea
                placeholder="Paste syllabus text / description to auto-select technical skills..."
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-[#cfd7e3] p-2.5 text-xs outline-none focus:border-[#0c66e4]"
              />
            </label>
            <Button
              type="button"
              onClick={handleExtractSyllabus}
              disabled={extracting || !syllabusText.trim()}
              className="mt-2 w-full h-8 text-xs bg-[#e9f2ff] text-[#0c66e4] hover:bg-[#deebff]"
            >
              {extracting ? (
                <RefreshCw className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <Plus className="size-3.5 mr-1.5" />
              )}
              {extracting ? "Extracting Skills..." : "Suggest Skills with AI"}
            </Button>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Linked Skills
            </span>
            <div className="mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-[#cfd7e3] p-2 space-y-1 bg-[#f7f8fa]">
              {skills.map((skill) => {
                const isSelected = selectedSkills.includes(skill.id);
                return (
                  <button
                    type="button"
                    key={skill.id}
                    onClick={() => handleToggleSkill(skill.id)}
                    className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-[#e9f2ff] text-[#0c66e4]"
                        : "hover:bg-[#eef1f6] text-muted-foreground"
                    }`}
                  >
                    {skill.name}
                    {isSelected && <Check className="size-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
          >
            {saving ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : success ? (
              <Check className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {saving ? "Mapping..." : success ? "Course Mapped!" : "Map Course"}
          </Button>
        </form>
      </div>
    </div>
  );
}
