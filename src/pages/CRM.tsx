import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Calendar,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Activity,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import oricolLogo from "@/assets/oricol-logo.png";

interface Company {
  id: string;
  name: string;
  industry: string | null;
  status: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  company_id: string | null;
  status: string;
  created_at: string;
}

interface Deal {
  id: string;
  title: string;
  stage: string;
  value: number | null;
  currency: string;
  company_id: string | null;
  expected_close_date: string | null;
  probability: number;
  created_at: string;
}

interface CRMActivity {
  id: string;
  activity_type: string;
  subject: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
}

interface CRMStats {
  totalCompanies: number;
  activeDeals: number;
  totalContacts: number;
  revenueOpportunity: number;
}

const CRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<CRMStats>({
    totalCompanies: 0,
    activeDeals: 0,
    totalContacts: 0,
    revenueOpportunity: 0,
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  
  // Form states
  const [newCompany, setNewCompany] = useState({
    name: "",
    industry: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    website: "",
    notes: "",
    status: "active",
  });

  const [newContact, setNewContact] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    mobile: "",
    job_title: "",
    department: "",
    company_id: "",
    notes: "",
    status: "active",
  });

  const [newDeal, setNewDeal] = useState({
    title: "",
    description: "",
    value: "",
    currency: "USD",
    stage: "lead",
    probability: "0",
    company_id: "",
    contact_id: "",
    expected_close_date: "",
    notes: "",
  });

  const [newActivity, setNewActivity] = useState({
    activity_type: "call",
    subject: "",
    description: "",
    company_id: "",
    contact_id: "",
    deal_id: "",
    scheduled_date: "",
    status: "pending",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });

    fetchCRMData();
  }, [navigate]);

  const fetchCRMData = async () => {
    try {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from("crm_companies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from("crm_contacts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

      // Fetch deals
      const { data: dealsData, error: dealsError } = await supabase
        .from("crm_deals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (dealsError) throw dealsError;
      setDeals(dealsData || []);

      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("crm_activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Calculate stats
      const { count: companiesCount } = await supabase
        .from("crm_companies")
        .select("*", { count: "exact", head: true });

      const { count: contactsCount } = await supabase
        .from("crm_contacts")
        .select("*", { count: "exact", head: true });

      const { count: activeDealsCount } = await supabase
        .from("crm_deals")
        .select("*", { count: "exact", head: true })
        .not("stage", "in", '("won","lost")');

      const { data: dealsValueData } = await supabase
        .from("crm_deals")
        .select("value")
        .not("stage", "in", '("won","lost")');

      const totalValue = (dealsValueData || []).reduce((sum, deal) => sum + (Number(deal.value) || 0), 0);

      setStats({
        totalCompanies: companiesCount || 0,
        totalContacts: contactsCount || 0,
        activeDeals: activeDealsCount || 0,
        revenueOpportunity: totalValue,
      });
      
      setSetupRequired(false);
    } catch (error: any) {
      console.error("Error fetching CRM data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load CRM data",
        variant: "destructive",
      });
      setSetupRequired(true);
    }
  };

  const handleAddCompany = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("crm_companies").insert({
        ...newCompany,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company added successfully",
      });

      setIsAddCompanyOpen(false);
      setNewCompany({
        name: "",
        industry: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postal_code: "",
        website: "",
        notes: "",
        status: "active",
      });
      fetchCRMData();
    } catch (error: any) {
      console.error("Error adding company:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add company",
        variant: "destructive",
      });
    }
  };

  const handleAddContact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("crm_contacts").insert({
        ...newContact,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact added successfully",
      });

      setIsAddContactOpen(false);
      setNewContact({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        mobile: "",
        job_title: "",
        department: "",
        company_id: "",
        notes: "",
        status: "active",
      });
      fetchCRMData();
    } catch (error: any) {
      console.error("Error adding contact:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add contact",
        variant: "destructive",
      });
    }
  };

  const handleAddDeal = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("crm_deals").insert({
        title: newDeal.title,
        description: newDeal.description,
        value: newDeal.value ? parseFloat(newDeal.value) : null,
        currency: newDeal.currency,
        stage: newDeal.stage,
        probability: parseInt(newDeal.probability),
        company_id: newDeal.company_id || null,
        contact_id: newDeal.contact_id || null,
        expected_close_date: newDeal.expected_close_date || null,
        notes: newDeal.notes,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Deal added successfully",
      });

      setIsAddDealOpen(false);
      setNewDeal({
        title: "",
        description: "",
        value: "",
        currency: "USD",
        stage: "lead",
        probability: "0",
        company_id: "",
        contact_id: "",
        expected_close_date: "",
        notes: "",
      });
      fetchCRMData();
    } catch (error: any) {
      console.error("Error adding deal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add deal",
        variant: "destructive",
      });
    }
  };

  const handleAddActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("crm_activities").insert({
        ...newActivity,
        company_id: newActivity.company_id || null,
        contact_id: newActivity.contact_id || null,
        deal_id: newActivity.deal_id || null,
        scheduled_date: newActivity.scheduled_date || null,
        created_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Activity added successfully",
      });

      setIsAddActivityOpen(false);
      setNewActivity({
        activity_type: "call",
        subject: "",
        description: "",
        company_id: "",
        contact_id: "",
        deal_id: "",
        scheduled_date: "",
        status: "pending",
      });
      fetchCRMData();
    } catch (error: any) {
      console.error("Error adding activity:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add activity",
        variant: "destructive",
      });
    }
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      lead: "bg-gray-500",
      qualified: "bg-blue-500",
      proposal: "bg-yellow-500",
      negotiation: "bg-orange-500",
      won: "bg-green-500",
      lost: "bg-red-500",
    };
    return colors[stage] || "bg-gray-500";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500",
      inactive: "bg-gray-500",
      prospect: "bg-blue-500",
      pending: "bg-yellow-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 w-full relative">
        {/* Back Navigation */}
        <div className="relative z-10">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        {/* Oricol Logo Watermark */}
        <div className="fixed top-20 right-8 pointer-events-none z-0 hidden lg:block">
          <img 
            src={oricolLogo} 
            alt="Oricol Environmental Services" 
            className="h-48 w-auto object-contain opacity-10"
          />
        </div>
        
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl font-bold">Oricol CRM</h1>
            <p className="text-muted-foreground">
              Customer Relationship Management System
            </p>
          </div>
        </div>

        {/* Setup Required Alert */}
        {setupRequired && (
          <Alert variant="destructive" className="relative z-10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>CRM Setup Required</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                The CRM database tables haven't been created yet. To use the CRM system, you need to apply the database migration.
              </p>
              <div className="mt-3">
                <p className="font-semibold">For Lovable Users (No CLI):</p>
                <ol className="list-decimal list-inside ml-2 mt-1 space-y-1 text-sm">
                  <li>Open Supabase SQL Editor at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">supabase.com</a></li>
                  <li>Copy the SQL from <code className="bg-muted px-1 py-0.5 rounded">supabase/migrations/20251119080900_create_crm_system.sql</code></li>
                  <li>Paste and run it in the SQL Editor</li>
                </ol>
              </div>
              <div className="mt-3">
                <p className="font-semibold">For CLI Users:</p>
                <p className="text-sm ml-2 mt-1">Run <code className="bg-muted px-1 py-0.5 rounded">npm run migrate</code> in your terminal</p>
              </div>
              <p className="mt-3 text-sm">
                For detailed instructions, see <a 
                  href="https://github.com/craigfelt/oricol-ticket-flow-4084ab4c/blob/main/CRM_SETUP_GUIDE.md" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="underline font-semibold"
                >
                  CRM_SETUP_GUIDE.md
                </a> in the repository.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 w-full relative z-10">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContacts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeDeals}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenue Pipeline</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.revenueOpportunity.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="companies" className="w-full relative z-10">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>

          {/* Companies Tab */}
          <TabsContent value="companies" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-companies"
                    name="search-companies"
                    placeholder="Search companies..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setIsAddCompanyOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Companies</CardTitle>
                <CardDescription>Manage your company relationships</CardDescription>
              </CardHeader>
              <CardContent>
                {companies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No companies yet. Click "Add Company" to get started.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {companies
                      .filter((company) =>
                        company.name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((company) => (
                        <div
                          key={company.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{company.name}</h3>
                              <Badge className={`${getStatusColor(company.status)} text-white`}>
                                {company.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {company.industry && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {company.industry}
                                </span>
                              )}
                              {company.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {company.phone}
                                </span>
                              )}
                              {company.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {company.email}
                                </span>
                              )}
                              {company.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {company.city}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(company.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-contacts"
                    name="search-contacts"
                    placeholder="Search contacts..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setIsAddContactOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
                <CardDescription>Manage your contact relationships</CardDescription>
              </CardHeader>
              <CardContent>
                {contacts.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No contacts yet. Click "Add Contact" to get started.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {contacts
                      .filter((contact) =>
                        `${contact.first_name} ${contact.last_name}`
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      )
                      .map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">
                                {contact.first_name} {contact.last_name}
                              </h3>
                              <Badge className={`${getStatusColor(contact.status)} text-white`}>
                                {contact.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {contact.job_title && <span>{contact.job_title}</span>}
                              {contact.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {contact.email}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {contact.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(contact.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-deals"
                    name="search-deals"
                    placeholder="Search deals..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setIsAddDealOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Deal
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Deals</CardTitle>
                <CardDescription>Track your sales pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                {deals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No deals yet. Click "Add Deal" to get started.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {deals
                      .filter((deal) =>
                        deal.title.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((deal) => (
                        <div
                          key={deal.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{deal.title}</h3>
                              <Badge className={`${getStageColor(deal.stage)} text-white`}>
                                {deal.stage}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {deal.value && (
                                <span className="flex items-center gap-1 font-semibold text-foreground">
                                  <DollarSign className="h-3 w-3" />
                                  {deal.value.toLocaleString()} {deal.currency}
                                </span>
                              )}
                              <span>Probability: {deal.probability}%</span>
                              {deal.expected_close_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(deal.expected_close_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(deal.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-activities"
                    name="search-activities"
                    placeholder="Search activities..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setIsAddActivityOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Activities</CardTitle>
                <CardDescription>Track your customer interactions</CardDescription>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No activities yet. Click "Add Activity" to get started.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activities
                      .filter((activity) =>
                        activity.subject.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4" />
                              <h3 className="font-medium">{activity.subject}</h3>
                              <Badge className={`${getStatusColor(activity.status)} text-white`}>
                                {activity.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="capitalize">{activity.activity_type}</span>
                              {activity.scheduled_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(activity.scheduled_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Company Dialog */}
        <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>
                Enter the company details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name *</Label>
                  <Input
                    id="company-name"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    value={newCompany.industry}
                    onChange={(e) => setNewCompany({ ...newCompany, industry: e.target.value })}
                    placeholder="Technology"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Phone</Label>
                  <Input
                    id="company-phone"
                    value={newCompany.phone}
                    onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={newCompany.email}
                    onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                    placeholder="info@acmecorp.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={newCompany.website}
                  onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                  placeholder="https://acmecorp.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newCompany.address}
                  onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newCompany.city}
                    onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                    placeholder="New York"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={newCompany.state}
                    onChange={(e) => setNewCompany({ ...newCompany, state: e.target.value })}
                    placeholder="NY"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={newCompany.country}
                    onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })}
                    placeholder="USA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal-code">Postal Code</Label>
                  <Input
                    id="postal-code"
                    value={newCompany.postal_code}
                    onChange={(e) => setNewCompany({ ...newCompany, postal_code: e.target.value })}
                    placeholder="10001"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-status">Status</Label>
                <Select
                  value={newCompany.status}
                  onValueChange={(value) => setNewCompany({ ...newCompany, status: value })}
                >
                  <SelectTrigger id="company-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-notes">Notes</Label>
                <Textarea
                  id="company-notes"
                  value={newCompany.notes}
                  onChange={(e) => setNewCompany({ ...newCompany, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCompanyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCompany} disabled={!newCompany.name}>
                Add Company
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Contact Dialog */}
        <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
              <DialogDescription>
                Enter the contact details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name *</Label>
                  <Input
                    id="first-name"
                    value={newContact.first_name}
                    onChange={(e) => setNewContact({ ...newContact, first_name: e.target.value })}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name *</Label>
                  <Input
                    id="last-name"
                    value={newContact.last_name}
                    onChange={(e) => setNewContact({ ...newContact, last_name: e.target.value })}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={newContact.mobile}
                    onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
                    placeholder="+1 234 567 8901"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-title">Job Title</Label>
                  <Input
                    id="job-title"
                    value={newContact.job_title}
                    onChange={(e) => setNewContact({ ...newContact, job_title: e.target.value })}
                    placeholder="Sales Manager"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={newContact.department}
                    onChange={(e) => setNewContact({ ...newContact, department: e.target.value })}
                    placeholder="Sales"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-company">Company</Label>
                  <Select
                    value={newContact.company_id}
                    onValueChange={(value) => setNewContact({ ...newContact, company_id: value })}
                  >
                    <SelectTrigger id="contact-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-status">Status</Label>
                <Select
                  value={newContact.status}
                  onValueChange={(value) => setNewContact({ ...newContact, status: value })}
                >
                  <SelectTrigger id="contact-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-notes">Notes</Label>
                <Textarea
                  id="contact-notes"
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddContactOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddContact}
                disabled={!newContact.first_name || !newContact.last_name}
              >
                Add Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Deal Dialog */}
        <Dialog open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
              <DialogDescription>
                Enter the deal details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deal-title">Deal Title *</Label>
                <Input
                  id="deal-title"
                  value={newDeal.title}
                  onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                  placeholder="Enterprise Software License"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-description">Description</Label>
                <Textarea
                  id="deal-description"
                  value={newDeal.description}
                  onChange={(e) => setNewDeal({ ...newDeal, description: e.target.value })}
                  placeholder="Deal description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deal-value">Value</Label>
                  <Input
                    id="deal-value"
                    type="number"
                    value={newDeal.value}
                    onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={newDeal.currency}
                    onValueChange={(value) => setNewDeal({ ...newDeal, currency: value })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deal-stage">Stage</Label>
                  <Select
                    value={newDeal.stage}
                    onValueChange={(value) => setNewDeal({ ...newDeal, stage: value })}
                  >
                    <SelectTrigger id="deal-stage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probability">Probability (%)</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={newDeal.probability}
                    onChange={(e) => setNewDeal({ ...newDeal, probability: e.target.value })}
                    placeholder="50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deal-company">Company</Label>
                  <Select
                    value={newDeal.company_id}
                    onValueChange={(value) => setNewDeal({ ...newDeal, company_id: value })}
                  >
                    <SelectTrigger id="deal-company">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deal-contact">Contact</Label>
                  <Select
                    value={newDeal.contact_id}
                    onValueChange={(value) => setNewDeal({ ...newDeal, contact_id: value })}
                  >
                    <SelectTrigger id="deal-contact">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected-close-date">Expected Close Date</Label>
                <Input
                  id="expected-close-date"
                  type="date"
                  value={newDeal.expected_close_date}
                  onChange={(e) => setNewDeal({ ...newDeal, expected_close_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deal-notes">Notes</Label>
                <Textarea
                  id="deal-notes"
                  value={newDeal.notes}
                  onChange={(e) => setNewDeal({ ...newDeal, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDealOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDeal} disabled={!newDeal.title}>
                Add Deal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Activity Dialog */}
        <Dialog open={isAddActivityOpen} onOpenChange={setIsAddActivityOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
              <DialogDescription>
                Enter the activity details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activity-type">Activity Type</Label>
                  <Select
                    value={newActivity.activity_type}
                    onValueChange={(value) => setNewActivity({ ...newActivity, activity_type: value })}
                  >
                    <SelectTrigger id="activity-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity-status">Status</Label>
                  <Select
                    value={newActivity.status}
                    onValueChange={(value) => setNewActivity({ ...newActivity, status: value })}
                  >
                    <SelectTrigger id="activity-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-subject">Subject *</Label>
                <Input
                  id="activity-subject"
                  value={newActivity.subject}
                  onChange={(e) => setNewActivity({ ...newActivity, subject: e.target.value })}
                  placeholder="Follow up call with customer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity-description">Description</Label>
                <Textarea
                  id="activity-description"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  placeholder="Activity description..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="activity-company">Company</Label>
                  <Select
                    value={newActivity.company_id}
                    onValueChange={(value) => setNewActivity({ ...newActivity, company_id: value })}
                  >
                    <SelectTrigger id="activity-company">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity-contact">Contact</Label>
                  <Select
                    value={newActivity.contact_id}
                    onValueChange={(value) => setNewActivity({ ...newActivity, contact_id: value })}
                  >
                    <SelectTrigger id="activity-contact">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activity-deal">Deal</Label>
                  <Select
                    value={newActivity.deal_id}
                    onValueChange={(value) => setNewActivity({ ...newActivity, deal_id: value })}
                  >
                    <SelectTrigger id="activity-deal">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {deals.map((deal) => (
                        <SelectItem key={deal.id} value={deal.id}>
                          {deal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled-date">Scheduled Date</Label>
                <Input
                  id="scheduled-date"
                  type="datetime-local"
                  value={newActivity.scheduled_date}
                  onChange={(e) => setNewActivity({ ...newActivity, scheduled_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddActivityOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddActivity} disabled={!newActivity.subject}>
                Add Activity
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CRM;
