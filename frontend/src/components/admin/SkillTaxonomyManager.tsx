import { useEffect, useState } from "react";
import { 
  getAllSkills, getCategories, createCategory, 
  createSkill, updateSkill, deleteSkill, SkillCategory 
} from "../../services/admin.service";
import { 
  Plus, Edit2, Trash2, FolderPlus, Tag, 
  Search, Award, X, RefreshCw, Layers 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SkillItem {
  id: string;
  name: string;
  category?: string;
  categoryId?: string | null;
  aliases?: string[];
}

export function SkillTaxonomyManager() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");

  // Modals / Forms States
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  const [showSkillForm, setShowSkillForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillCategoryId, setSkillCategoryId] = useState("");
  const [skillAliasesStr, setSkillAliasesStr] = useState("");
  const [skillSubmitting, setSkillSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [skillsData, catsData] = await Promise.all([
        getAllSkills(),
        getCategories()
      ]);
      
      // The getAllSkills response might not include aliases out of the box depending on 
      // the base model but we want to map database responses gracefully.
      setSkills(skillsData.map((s: any) => ({
        id: s.id,
        name: s.name,
        category: typeof s.category === 'object' ? s.category?.name : s.category,
        categoryId: s.categoryId || (typeof s.category === 'object' ? s.category?.id : null),
        aliases: s.aliases || []
      })));
      setCategories(catsData);
      setError(undefined);
    } catch (err: any) {
      setError(err.message || "Failed to load skills taxonomy data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setCategorySubmitting(true);
      await createCategory(newCategoryName.trim());
      setNewCategoryName("");
      setShowCategoryForm(false);
      await fetchData();
    } catch (err: any) {
      alert("Failed to create category: " + (err.message || err));
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleOpenSkillForm = (skill?: SkillItem) => {
    if (skill) {
      setEditingSkill(skill);
      setSkillName(skill.name);
      setSkillCategoryId(skill.categoryId || "");
      setSkillAliasesStr(skill.aliases ? skill.aliases.join(", ") : "");
    } else {
      setEditingSkill(null);
      setSkillName("");
      setSkillCategoryId(categories[0]?.id || "");
      setSkillAliasesStr("");
    }
    setShowSkillForm(true);
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) return;
    
    const aliases = skillAliasesStr
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    try {
      setSkillSubmitting(true);
      const payload = {
        name: skillName.trim(),
        categoryId: skillCategoryId || undefined,
        aliases
      };

      if (editingSkill) {
        await updateSkill(editingSkill.id, payload);
      } else {
        await createSkill(payload);
      }
      setShowSkillForm(false);
      await fetchData();
    } catch (err: any) {
      alert("Failed to save skill: " + (err.message || err));
    } finally {
      setSkillSubmitting(false);
    }
  };

  const handleDeleteSkill = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the skill "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteSkill(id);
      await fetchData();
    } catch (err: any) {
      alert("Failed to delete skill: " + (err.message || err));
    }
  };

  // Filter logic
  const filteredSkills = skills.filter((skill) => {
    const matchesSearch = 
      !searchTerm ||
      skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (skill.aliases && skill.aliases.some((a) => a.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesCategory = 
      !selectedCategoryFilter || 
      skill.category === selectedCategoryFilter;
      
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Skill Manager Main Body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Side: Category Quick Actions */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#edf0f5]">
              <h3 className="text-xs font-bold text-[#17202a] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="size-4 text-[#0c66e4]" />
                Skill Categories
              </h3>
              <button 
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                className="text-xs text-[#0c66e4] hover:underline flex items-center gap-0.5"
              >
                <FolderPlus className="size-3.5" />
                Add
              </button>
            </div>

            {showCategoryForm && (
              <form onSubmit={handleCreateCategory} className="mb-4 bg-[#f7f8fa] p-3 rounded-lg border border-[#dfe3ea] space-y-2">
                <label className="block text-xs font-semibold text-[#17202a]">
                  New Category Name
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Frontend Development"
                    className="mt-1 h-8 w-full rounded border border-[#cfd7e3] px-2.5 text-xs outline-none focus:border-[#0c66e4]"
                    required
                  />
                </label>
                <div className="flex gap-2 justify-end">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs px-2"
                    onClick={() => setShowCategoryForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="h-7 text-xs px-2.5 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
                    disabled={categorySubmitting}
                  >
                    {categorySubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategoryFilter("")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategoryFilter === "" 
                    ? "bg-[#deebff] text-[#0747a6]" 
                    : "text-muted-foreground hover:bg-[#f7f8fa] hover:text-[#17202a]"
                }`}
              >
                All Categories ({skills.length})
              </button>
              {categories.map((cat) => {
                const count = skills.filter((s) => s.category === cat.name).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryFilter(cat.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      selectedCategoryFilter === cat.name
                        ? "bg-[#deebff] text-[#0747a6]" 
                        : "text-muted-foreground hover:bg-[#f7f8fa] hover:text-[#17202a]"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Skill Listing Table and Form */}
        <div className="lg:col-span-3 space-y-4">
          {/* Skill Form Modal Overlay (if visible) */}
          {showSkillForm && (
            <div className="fixed inset-0 z-50 bg-[#091e42]/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg border border-[#dfe3ea] shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-[#edf0f5] pb-3 mb-4">
                  <h3 className="text-sm font-bold text-[#17202a] flex items-center gap-1.5">
                    <Award className="size-4.5 text-[#0c66e4]" />
                    {editingSkill ? `Edit Skill: ${editingSkill.name}` : "Create New Skill"}
                  </h3>
                  <button 
                    onClick={() => setShowSkillForm(false)}
                    className="text-muted-foreground hover:text-[#17202a]"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveSkill} className="space-y-4">
                  <label className="block text-xs font-semibold text-[#17202a]">
                    Skill Name
                    <input
                      type="text"
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      placeholder="e.g. React.js"
                      className="mt-1 h-9 w-full rounded border border-[#cfd7e3] px-3 text-xs outline-none focus:border-[#0c66e4]"
                      required
                    />
                  </label>

                  <label className="block text-xs font-semibold text-[#17202a]">
                    Category
                    <select
                      value={skillCategoryId}
                      onChange={(e) => setSkillCategoryId(e.target.value)}
                      className="mt-1 h-9 w-full rounded border border-[#cfd7e3] px-2.5 text-xs outline-none bg-white focus:border-[#0c66e4]"
                      required
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-semibold text-[#17202a]">
                    Synonyms & Keyword Aliases
                    <textarea
                      value={skillAliasesStr}
                      onChange={(e) => setSkillAliasesStr(e.target.value)}
                      placeholder="e.g. reactjs, react-js, react framework (comma separated)"
                      rows={3}
                      className="mt-1 w-full rounded border border-[#cfd7e3] p-2.5 text-xs outline-none focus:border-[#0c66e4]"
                    />
                    <span className="text-[10px] font-normal text-muted-foreground mt-1 block">
                      Aliases help the NLP parser map variations of skills in student files and repos to this standard node.
                    </span>
                  </label>

                  <div className="flex gap-2 justify-end pt-2 border-t border-[#edf0f5]">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="h-9 text-xs px-4"
                      onClick={() => setShowSkillForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="h-9 text-xs px-4 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
                      disabled={skillSubmitting}
                    >
                      {skillSubmitting ? "Saving..." : editingSkill ? "Save Changes" : "Create Skill"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* List Toolbar */}
          <div className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-[#deebff] text-[#0747a6]">
                  <Award className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#17202a]">Skill Taxonomy Catalog</h2>
                  <p className="text-xs text-muted-foreground">Manage skill entities, link them to parent categories, and configure aliases.</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search name or alias..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 w-full rounded-md border border-[#cfd7e3] bg-[#f7f8fa] pl-8 pr-2.5 text-xs outline-none focus:border-[#0c66e4]"
                  />
                </div>
                <Button
                  onClick={() => handleOpenSkillForm()}
                  className="h-8 bg-[#0c66e4] text-white hover:bg-[#0055cc] text-xs px-3"
                >
                  <Plus className="size-3.5 mr-1" />
                  Add Skill
                </Button>
                <Button
                  onClick={fetchData}
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#cfd7e3]"
                >
                  <RefreshCw className="size-3.5" />
                </Button>
              </div>
            </div>

            {error && <div className="text-sm text-red-500 mb-4">{error}</div>}

            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading skills catalog...</div>
            ) : filteredSkills.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">No skills found matching filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#dfe3ea] bg-[#f7f8fa] text-muted-foreground font-semibold uppercase">
                      <th className="p-3">Skill Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Aliases (Synonyms)</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0f5]">
                    {filteredSkills.map((skill) => (
                      <tr key={skill.id} className="hover:bg-[#f7f8fa]">
                        <td className="p-3 font-semibold text-[#17202a]">{skill.name}</td>
                        <td className="p-3 text-muted-foreground">
                          <Badge variant="secondary" className="bg-[#edf0f5] text-muted-foreground">
                            {skill.category || "Uncategorized"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {skill.aliases && skill.aliases.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {skill.aliases.map((alias) => (
                                <span key={alias} className="inline-flex items-center gap-0.5 rounded bg-gray-100 text-gray-700 px-1.5 py-0.5 text-[10px]">
                                  <Tag className="size-2 text-gray-500" />
                                  {alias}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No aliases</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenSkillForm(skill)}
                            className="text-[#0c66e4] hover:text-[#0055cc] inline-flex items-center"
                            title="Edit Skill"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(skill.id, skill.name)}
                            className="text-[#ca3521] hover:text-[#a51d0c] inline-flex items-center"
                            title="Delete Skill"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
