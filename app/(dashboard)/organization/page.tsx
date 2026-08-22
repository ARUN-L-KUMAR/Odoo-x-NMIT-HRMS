"use client";

import { useState, useEffect } from "react";
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
  CheckCircle2,
  AlertCircle,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/shared/image-upload";
import { toast } from "sonner";
import { format } from "date-fns";

interface OrgData {
  id: string;
  name: string;
  initials: string;
  logoUrl: string | null;
  createdAt: string;
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    departmentsCount: number;
    departments: { name: string; count: number }[];
  };
  leaveTypes: { id: string; name: string; isPaid: boolean; annualLimit: number | null }[];
  recentActivity: { id: string; action: string; description: string; createdAt: string; user?: { employeeId: string } }[];
}

export default function OrganizationPage() {
  const { data: session, update: updateSession } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OrgData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "settings" | "departments" | "leaves">("overview");

  // Form edit states
  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Company name cannot be empty");
      return;
    }
    if (!initials.trim()) {
      toast.error("Company initials cannot be empty");
      return;
    }

    try {
      setSaving(true);
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
      setData((prev) => (prev ? { ...prev, ...result.data } : null));

      // Refresh session context so Sidebar/Topbar immediately show updated name/logo
      await updateSession({
        companyName: result.data.name,
        companyLogo: result.data.logoUrl,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to update organization");
    } finally {
      setSaving(false);
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
        <p className="text-muted-foreground text-sm">
          No organization details could be resolved for this account.
        </p>
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
                <span>Initials Code: <strong className="font-mono text-foreground">{data.initials}</strong></span>
                <span>&bull;</span>
                <span>Created {format(new Date(data.createdAt), "MMMM dd, yyyy")}</span>
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button
              onClick={() => setActiveTab(activeTab === "settings" ? "overview" : "settings")}
              variant={activeTab === "settings" ? "secondary" : "default"}
              className="gap-2 shrink-0 shadow-sm"
            >
              <Edit3 className="h-4 w-4" />
              {activeTab === "settings" ? "View Overview" : "Edit Organization"}
            </Button>
          )}
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
        {isAdmin && (
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

      {/* Tab: Overview */}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Login ID Generator Policy */}
            <Card className="shadow-xs">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Auto Login ID Generation
                </CardTitle>
                <CardDescription>
                  How member credentials are automatically generated for your company.
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

            {/* Recent Organization Activity */}
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

      {/* Tab: Departments */}
      {activeTab === "departments" && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Organization Departments</CardTitle>
            <CardDescription>Active business units and staff distribution in {data.name}.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.stats.departments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No department assignments yet. Assign departments when adding employees.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data.stats.departments.map((dep) => (
                  <div
                    key={dep.name}
                    className="p-4 rounded-xl border bg-card hover:bg-accent/40 transition-colors flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <h4 className="font-semibold text-sm">{dep.name}</h4>
                      <p className="text-xs text-muted-foreground">{dep.count} employee{dep.count > 1 ? "s" : ""}</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {Math.round((dep.count / (data.stats.totalEmployees || 1)) * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Leave Policies */}
      {activeTab === "leaves" && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Configured Leave Policies</CardTitle>
            <CardDescription>
              Time-off schemes provisioned for {data.name} employees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.leaveTypes.map((lt) => (
                <div key={lt.id} className="p-4 rounded-xl border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{lt.name}</h4>
                    <Badge variant={lt.isPaid ? "default" : "outline"} className="text-[11px]">
                      {lt.isPaid ? "Paid Leave" : "Unpaid"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Annual Quota:{" "}
                    <strong>{lt.annualLimit !== null ? `${lt.annualLimit} days/year` : "Unlimited / Custom"}</strong>
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab: Organization Settings (Admin only) */}
      {activeTab === "settings" && isAdmin && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Organization Profile & Branding</CardTitle>
            <CardDescription>Update your company details, logo, and initials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6 max-w-xl">
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
                  Used as the prefix when generating employee Login IDs.
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

              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
