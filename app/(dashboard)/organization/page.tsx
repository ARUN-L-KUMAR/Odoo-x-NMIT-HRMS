"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  Building2,
  Users,
  Layers,
  CalendarDays,
  ShieldCheck,
  Edit3,
  Save,
  Loader2,
  Activity,
  Sparkles,
  KeyRound,
  Trash2,
  Plus,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";

interface LeaveTypeItem {
  id: string;
  name: string;
  description: string | null;
  isPaid: boolean;
  annualLimit: number | null;
}

interface OrgItem {
  id: string;
  name: string;
  initials: string;
  logoUrl: string | null;
  employeeCount: number;
  createdAt: string;
}

interface OrgData {
  id: string;
  name: string;
  initials: string;
  logoUrl: string | null;
  createdAt: string;
  isSuperAdmin?: boolean;
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    departmentsCount: number;
    departments: { name: string; count: number }[];
  };
  leaveTypes: LeaveTypeItem[];
  recentActivity: { id: string; action: string; description: string; createdAt: string; user?: { employeeId: string } }[];
  allOrganizations: OrgItem[];
}

export default function OrganizationPage() {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const userRole = session?.user?.role?.toUpperCase();
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isTenantAdmin = userRole === "ADMIN" || isSuperAdmin;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrgData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "departments" | "leaves" | "all_orgs" | "settings">("overview");

  // Protect page: redirect non-admin users
  useEffect(() => {
    if (status === "authenticated" && !isTenantAdmin) {
      toast.error("Access restricted to Admins only");
      router.replace("/dashboard");
    }
  }, [status, isTenantAdmin, router]);


  // Organization Edit Form
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savingOrg, setSavingOrg] = useState(false);

  // Dialogs
  // 1. Create Organization Modal
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgInitials, setNewOrgInitials] = useState("");
  const [newOrgLogo, setNewOrgLogo] = useState<string | null>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);

  // 2. Delete Organization Modal
  const [isDeleteOrgOpen, setIsDeleteOrgOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<OrgItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingOrg, setDeletingOrg] = useState(false);

  // 3. Department Modals (Create & Edit)
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [editingOldDeptName, setEditingOldDeptName] = useState<string | null>(null);
  const [savingDept, setSavingDept] = useState(false);

  // 4. Leave Policy Modals (Create & Edit)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [leaveName, setLeaveName] = useState("");
  const [leaveIsPaid, setLeaveIsPaid] = useState(true);
  const [leaveAnnualLimit, setLeaveAnnualLimit] = useState<string>("12");
  const [leaveDescription, setLeaveDescription] = useState("");
  const [savingLeave, setSavingLeave] = useState(false);

  // Fetch Data
  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/organization");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setName(json.data.name);
        setInitials(json.data.initials);
        setLogoUrl(json.data.logoUrl);
        if (json.data.isSuperAdmin || isSuperAdmin) {
          setActiveTab("all_orgs");
        }
      }
    } catch (err) {
      toast.error("Failed to load organization details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  // ─── Organization CRUD Handlers ──────────────────────────────────────────────

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !initials.trim()) {
      toast.error("Organization name and initials are required");
      return;
    }

    try {
      setSavingOrg(true);
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          initials: initials.trim().toUpperCase(),
          logoUrl,
        }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error?.message || "Failed to update organization");
        return;
      }

      toast.success("Organization profile updated successfully!");
      setData((prev) => (prev ? { ...prev, name: result.data.name, initials: result.data.initials, logoUrl: result.data.logoUrl } : null));

      await updateSession({
        companyName: result.data.name,
        companyLogo: result.data.logoUrl,
        companyInitials: result.data.initials,
      });
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      toast.error("Please provide an organization name");
      return;
    }

    try {
      setCreatingOrg(true);
      const res = await fetch("/api/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOrgName.trim(),
          initials: newOrgInitials.trim() ? newOrgInitials.trim().toUpperCase() : undefined,
          logoUrl: newOrgLogo,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        toast.error(result.error?.message || "Failed to create organization");
        return;
      }

      toast.success(`Organization "${result.data.name}" created!`);
      setIsCreateOrgOpen(false);
      setNewOrgName("");
      setNewOrgInitials("");
      setNewOrgLogo(null);
      fetchOrganization();
    } catch (err: any) {
      toast.error(err.message || "Failed to create organization");
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleSwitchOrg = async (orgId: string) => {
    try {
      const res = await fetch("/api/organization/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: orgId }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error?.message || "Switch failed");
        return;
      }

      toast.success(result.message);
      await updateSession({
        companyId: result.data.companyId,
        companyName: result.data.companyName,
        companyInitials: result.data.companyInitials,
        companyLogo: result.data.companyLogo,
      });

      fetchOrganization();
      setActiveTab("overview");
    } catch (err: any) {
      toast.error(err.message || "Failed to switch organization");
    }
  };

  const handleDeleteOrg = async () => {
    if (!orgToDelete) return;
    if (deleteConfirmText.trim() !== orgToDelete.name.trim()) {
      toast.error("Organization name confirmation does not match");
      return;
    }

    try {
      setDeletingOrg(true);
      const res = await fetch(`/api/organization?id=${orgToDelete.id}`, {
        method: "DELETE",
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error?.message || "Delete failed");
        return;
      }

      toast.success(result.message);
      setIsDeleteOrgOpen(false);
      setOrgToDelete(null);
      setDeleteConfirmText("");
      fetchOrganization();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeletingOrg(false);
    }
  };

  // ─── Departments CRUD Handlers ───────────────────────────────────────────────

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      toast.error("Department name cannot be empty");
      return;
    }

    try {
      setSavingDept(true);
      const res = await fetch("/api/organization/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deptName.trim(),
          oldName: editingOldDeptName || undefined,
        }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error?.message || "Failed to save department");
        return;
      }

      toast.success(result.message);
      setIsDeptModalOpen(false);
      setDeptName("");
      setEditingOldDeptName(null);
      fetchOrganization();
    } catch (err: any) {
      toast.error(err.message || "Failed to save department");
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDepartment = async (name: string) => {
    if (!confirm(`Are you sure you want to remove the "${name}" department? (Staff will be set to unassigned)`)) {
      return;
    }

    try {
      const res = await fetch(`/api/organization/departments?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error?.message || "Failed to delete department");
        return;
      }

      toast.success(result.message);
      fetchOrganization();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete department");
    }
  };

  // ─── Leave Policies CRUD Handlers ───────────────────────────────────────────

  const handleOpenLeaveModal = (leave?: LeaveTypeItem) => {
    if (leave) {
      setEditingLeaveId(leave.id);
      setLeaveName(leave.name);
      setLeaveIsPaid(leave.isPaid);
      setLeaveAnnualLimit(leave.annualLimit !== null ? leave.annualLimit.toString() : "");
      setLeaveDescription(leave.description || "");
    } else {
      setEditingLeaveId(null);
      setLeaveName("");
      setLeaveIsPaid(true);
      setLeaveAnnualLimit("12");
      setLeaveDescription("");
    }
    setIsLeaveModalOpen(true);
  };

  const handleSaveLeavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveName.trim()) {
      toast.error("Policy name is required");
      return;
    }

    try {
      setSavingLeave(true);
      const url = editingLeaveId
        ? `/api/organization/leaves/${editingLeaveId}`
        : "/api/organization/leaves";
      const method = editingLeaveId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leaveName.trim(),
          isPaid: leaveIsPaid,
          annualLimit: leaveAnnualLimit.trim() ? parseInt(leaveAnnualLimit, 10) : null,
          description: leaveDescription.trim() || null,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        toast.error(result.error?.message || "Failed to save leave policy");
        return;
      }

      toast.success(result.message);
      setIsLeaveModalOpen(false);
      fetchOrganization();
    } catch (err: any) {
      toast.error(err.message || "Failed to save leave policy");
    } finally {
      setSavingLeave(false);
    }
  };

  const handleDeleteLeavePolicy = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" leave policy?`)) return;

    try {
      const res = await fetch(`/api/organization/leaves/${id}`, {
        method: "DELETE",
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error?.message || "Failed to delete policy");
        return;
      }

      toast.success(result.message);
      fetchOrganization();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete policy");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Organization Not Found</h2>
        <p className="text-muted-foreground text-sm">No organization details could be resolved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-background to-accent/20 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {data.logoUrl ? (
              <img
                src={data.logoUrl}
                alt={data.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 bg-background shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-2xl shadow-md border-2 border-primary/20">
                {data.initials}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{data.name}</h1>
                <Badge variant="secondary" className="gap-1 font-medium bg-primary/10 text-primary border-primary/20">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Active Tenant
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span>Initials: <strong className="font-mono text-foreground">{data.initials}</strong></span>
                <span>&bull;</span>
                <span>Created {format(new Date(data.createdAt), "MMMM dd, yyyy")}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {isSuperAdmin && (
              <Button
                onClick={() => setIsCreateOrgOpen(true)}
                variant="outline"
                className="gap-2 shadow-xs bg-background hover:bg-accent"
              >
                <Plus className="h-4 w-4 text-primary" />
                New Organization
              </Button>
            )}
            {isTenantAdmin && (
              <Button
                onClick={() => setActiveTab(activeTab === "settings" ? "overview" : "settings")}
                variant={activeTab === "settings" ? "secondary" : "default"}
                className="gap-2 shadow-xs"
              >
                <Edit3 className="h-4 w-4" />
                {activeTab === "settings" ? "Overview" : "Edit Organization"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b overflow-x-auto pb-2">
        <Button
          variant={activeTab === "overview" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("overview")}
          className="gap-2 font-medium"
        >
          <Building2 className="h-4 w-4" />
          Overview
        </Button>
        <Button
          variant={activeTab === "departments" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("departments")}
          className="gap-2 font-medium"
        >
          <Layers className="h-4 w-4" />
          Departments ({data.stats.departmentsCount})
        </Button>
        <Button
          variant={activeTab === "leaves" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("leaves")}
          className="gap-2 font-medium"
        >
          <CalendarDays className="h-4 w-4" />
          Leave Policies ({data.leaveTypes.length})
        </Button>
        {isSuperAdmin && (
          <Button
            variant={activeTab === "all_orgs" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("all_orgs")}
            className="gap-2 font-medium bg-primary/10 text-primary hover:bg-primary/20"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Organizations Switcher ({data.allOrganizations?.length || 1})
          </Button>
        )}
        {isTenantAdmin && (
          <Button
            variant={activeTab === "settings" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("settings")}
            className="gap-2 font-medium"
          >
            <Edit3 className="h-4 w-4" />
            Organization Settings
          </Button>
        )}
      </div>

      {/* ─── TAB 1: OVERVIEW ─── */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.stats.activeEmployees} active accounts
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Departments</CardTitle>
                <Layers className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.departmentsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Operational divisions</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leave Schemes</CardTitle>
                <CalendarDays className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.leaveTypes.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Active time-off categories</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Login ID Format</CardTitle>
                <KeyRound className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-mono font-bold text-primary">{data.initials}JODO2024...</div>
                <p className="text-xs text-muted-foreground mt-1">Tenant ID prefix</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick CRUD Shortcut Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              onClick={() => {
                setDeptName("");
                setEditingOldDeptName(null);
                setIsDeptModalOpen(true);
              }}
              className="p-4 rounded-xl border bg-card hover:bg-accent/40 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">Create Department</h4>
                  <p className="text-xs text-muted-foreground">Add new business unit</p>
                </div>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>

            <div
              onClick={() => handleOpenLeaveModal()}
              className="p-4 rounded-xl border bg-card hover:bg-accent/40 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">Add Leave Policy</h4>
                  <p className="text-xs text-muted-foreground">Define annual quotas</p>
                </div>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>

            {isSuperAdmin && (
              <div
                onClick={() => setIsCreateOrgOpen(true)}
                className="p-4 rounded-xl border bg-card hover:bg-accent/40 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">New Organization</h4>
                    <p className="text-xs text-muted-foreground">Register another tenant</p>
                  </div>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Auto Login ID Rule */}
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Auto Login ID Generation
                </CardTitle>
                <CardDescription>
                  How member credentials are automatically structured for this tenant.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border p-4 bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="text-base font-bold font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                      [{data.initials}][FN2][LN2][YEAR][0001]
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example for John Doe joining in 2024:{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {data.initials}JODO20240001
                    </span>
                  </p>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>Tenant prefix is derived from your organization initials.</li>
                  <li>Ensures unique Login IDs across all companies on the platform.</li>
                  <li>Temporary passwords are generated and forced to change on first login.</li>
                </ul>
              </CardContent>
            </Card>

            {/* Audit Trail */}
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Organization Audit Trail
                </CardTitle>
                <CardDescription>
                  Recent actions and setup events in this tenant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent activity recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {data.recentActivity.map((log) => (
                      <div key={log.id} className="flex items-start justify-between gap-2 border-b pb-2.5 last:border-0 last:pb-0">
                        <div className="space-y-0.5">
                          <p className="text-xs font-medium text-foreground">{log.description}</p>
                          <p className="text-[11px] text-muted-foreground">
                            By {log.user?.employeeId || "System"}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB 2: DEPARTMENTS (FULL CRUD) ─── */}
      {activeTab === "departments" && (
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-base">Organization Departments</CardTitle>
              <CardDescription>Create, rename, or manage business units in {data.name}.</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setDeptName("");
                setEditingOldDeptName(null);
                setIsDeptModalOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            {data.stats.departments.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Layers className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <div className="space-y-1">
                  <p className="text-base font-semibold">No departments created yet</p>
                  <p className="text-xs text-muted-foreground">Add your first department to organize your workforce.</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setDeptName("");
                    setEditingOldDeptName(null);
                    setIsDeptModalOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Create First Department
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data.stats.departments.map((dep) => (
                  <div
                    key={dep.name}
                    className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-sm leading-tight">{dep.name}</h4>
                        <p className="text-xs text-muted-foreground">{dep.count} employee{dep.count !== 1 ? "s" : ""}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs font-semibold">
                        {Math.round((dep.count / (data.stats.totalEmployees || 1)) * 100)}%
                      </Badge>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeptName(dep.name);
                          setEditingOldDeptName(dep.name);
                          setIsDeptModalOpen(true);
                        }}
                        className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="h-3 w-3" />
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDepartment(dep.name)}
                        className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 3: LEAVE POLICIES (FULL CRUD) ─── */}
      {activeTab === "leaves" && (
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-base">Configured Leave Policies</CardTitle>
              <CardDescription>
                Manage time-off allowances and paid/unpaid rules for {data.name}.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => handleOpenLeaveModal()} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              Add Leave Policy
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.leaveTypes.map((lt) => (
                <div key={lt.id} className="p-5 rounded-xl border bg-card space-y-3 shadow-2xs hover:border-primary/40 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="font-semibold text-sm">{lt.name}</h4>
                      <Badge variant={lt.isPaid ? "default" : "outline"} className="text-[10px]">
                        {lt.isPaid ? "Paid Leave" : "Unpaid"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground min-h-[32px]">
                      {lt.description || "No description provided."}
                    </p>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      Annual Quota:{" "}
                      <strong className="text-foreground">
                        {lt.annualLimit !== null ? `${lt.annualLimit} days/year` : "Unlimited / Custom"}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenLeaveModal(lt)}
                        className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteLeavePolicy(lt.id, lt.name)}
                        className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 4: ALL ORGANIZATIONS / SWITCHER (CRUD) ─── */}
      {activeTab === "all_orgs" && (
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-base">All Tenant Organizations</CardTitle>
              <CardDescription>Switch active workspace or manage registered companies on this platform.</CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsCreateOrgOpen(true)} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              Register New Organization
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.allOrganizations?.map((org) => {
                const isCurrent = org.id === data.id;
                return (
                  <div
                    key={org.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 shadow-2xs ${
                      isCurrent
                        ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                        : "bg-card hover:bg-accent/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="w-12 h-12 rounded-xl object-cover border bg-background"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                            {org.initials}
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-sm leading-tight flex items-center gap-2">
                            {org.name}
                            {isCurrent && (
                              <Badge className="text-[10px] bg-primary text-primary-foreground">Active</Badge>
                            )}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Code: <strong className="font-mono">{org.initials}</strong> &bull; {org.employeeCount} staff
                          </p>
                        </div>
                      </div>

                      {!isCurrent && data.allOrganizations.length > 1 && (
                        <button
                          onClick={() => {
                            setOrgToDelete(org);
                            setDeleteConfirmText("");
                            setIsDeleteOrgOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete Organization"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span>Created {format(new Date(org.createdAt), "MMM yyyy")}</span>
                      {!isCurrent ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSwitchOrg(org.id)}
                          className="h-7 text-xs gap-1.5 font-medium"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          Switch Workspace
                        </Button>
                      ) : (
                        <span className="text-xs text-primary font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Current Workspace
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── TAB 5: ORGANIZATION SETTINGS (EDIT & DELETE) ─── */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-base">Organization Profile & Branding</CardTitle>
              <CardDescription>Edit company details, initials, and official logo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateOrg} className="space-y-6 max-w-xl">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization / Company Name</Label>
                  <Input
                    id="orgName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgInitials">
                    Company Initials <span className="text-muted-foreground text-xs">(Max 4 uppercase chars)</span>
                  </Label>
                  <Input
                    id="orgInitials"
                    value={initials}
                    maxLength={4}
                    onChange={(e) => setInitials(e.target.value.toUpperCase())}
                    placeholder="e.g. AC"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used as the prefix when generating employee Login IDs (e.g. <strong>{initials || "DA"}</strong>JODO20240001).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <ImageUpload
                    value={logoUrl}
                    onChange={setLogoUrl}
                    folder="HRMS"
                    label="Upload Logo"
                    shape="square"
                    size="md"
                  />
                </div>

                <Button type="submit" disabled={savingOrg} className="gap-2">
                  {savingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone: Delete Organization */}
          {data.allOrganizations?.length > 1 && (
            <Card className="border-destructive/30 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Permanently delete this organization tenant and its associated records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h4 className="text-sm font-semibold">Delete "{data.name}"</h4>
                    <p className="text-xs text-muted-foreground">
                      This action cannot be undone. All tenant data will be permanently removed.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setOrgToDelete({
                        id: data.id,
                        name: data.name,
                        initials: data.initials,
                        logoUrl: data.logoUrl,
                        employeeCount: data.stats.totalEmployees,
                        createdAt: data.createdAt,
                      });
                      setDeleteConfirmText("");
                      setIsDeleteOrgOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Organization
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── DIALOGS / MODALS ─── */}

      {/* 1. Create Organization Modal */}
      <Dialog open={isCreateOrgOpen} onOpenChange={setIsCreateOrgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Organization</DialogTitle>
            <DialogDescription>
              Create a new isolated company tenant with its own branding, departments, and leave policies.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOrg} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newOrgName">Company Name</Label>
              <Input
                id="newOrgName"
                placeholder="e.g. NextGen Robotics"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newOrgInitials">Company Initials (optional)</Label>
              <Input
                id="newOrgInitials"
                placeholder="e.g. NR (auto-generated if blank)"
                value={newOrgInitials}
                maxLength={4}
                onChange={(e) => setNewOrgInitials(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <Label>Company Logo (optional)</Label>
              <ImageUpload
                value={newOrgLogo}
                onChange={setNewOrgLogo}
                folder="HRMS"
                label="Upload Logo"
                shape="square"
                size="sm"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOrgOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creatingOrg} className="gap-2">
                {creatingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Organization
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Delete Organization Modal */}
      <Dialog open={isDeleteOrgOpen} onOpenChange={setIsDeleteOrgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Delete Organization
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{orgToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Please type <strong className="text-foreground">{orgToDelete?.name}</strong> below to confirm deletion.
            </p>
            <Input
              placeholder={orgToDelete?.name}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteOrgOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingOrg || deleteConfirmText.trim() !== orgToDelete?.name.trim()}
              onClick={handleDeleteOrg}
              className="gap-2"
            >
              {deletingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Department Create / Edit Modal */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOldDeptName ? "Rename Department" : "Add Department"}</DialogTitle>
            <DialogDescription>
              {editingOldDeptName
                ? `Update department name across all staff members in ${data.name}.`
                : `Create a new department unit for ${data.name}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDepartment} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="deptName">Department Name</Label>
              <Input
                id="deptName"
                placeholder="e.g. Product Design"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingDept} className="gap-2">
                {savingDept ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingOldDeptName ? "Save Changes" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Leave Policy Create / Edit Modal */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLeaveId ? "Edit Leave Policy" : "Add Leave Policy"}</DialogTitle>
            <DialogDescription>
              Configure time-off categories and annual allowances for {data.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveLeavePolicy} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="leaveName">Policy Name</Label>
              <Input
                id="leaveName"
                placeholder="e.g. Parental Leave, Study Leave"
                value={leaveName}
                onChange={(e) => setLeaveName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="leaveIsPaid">Compensation</Label>
                <select
                  id="leaveIsPaid"
                  value={leaveIsPaid ? "paid" : "unpaid"}
                  onChange={(e) => setLeaveIsPaid(e.target.value === "paid")}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="paid">Paid Time Off</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaveQuota">Annual Days (blank = unlimited)</Label>
                <Input
                  id="leaveQuota"
                  type="number"
                  placeholder="e.g. 15"
                  value={leaveAnnualLimit}
                  onChange={(e) => setLeaveAnnualLimit(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaveDesc">Description (optional)</Label>
              <Input
                id="leaveDesc"
                placeholder="Brief explanation of policy terms"
                value={leaveDescription}
                onChange={(e) => setLeaveDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsLeaveModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingLeave} className="gap-2">
                {savingLeave ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingLeaveId ? "Save Policy" : "Create Policy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
