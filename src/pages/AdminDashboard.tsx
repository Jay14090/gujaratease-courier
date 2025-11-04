import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, LogOut, Users, UserPlus, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [parcels, setParcels] = useState<any[]>([]);
  const [dispatchers, setDispatchers] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAllParcels();
    fetchDispatchers();
  }, [user, navigate]);

  const fetchAllParcels = async () => {
    const { data, error } = await supabase
      .from("parcels")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data && !error) {
      setParcels(data);
    }
  };

  const fetchDispatchers = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, profiles(name, email, phone)")
      .eq("role", "dispatcher");
    
    if (data && !error) {
      setDispatchers(data);
    }
  };

  const handleCreateDispatcher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const pincodes = (formData.get("pincodes") as string).split(",").map(p => p.trim());

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      toast.error("Failed to create dispatcher account");
      return;
    }

    // Add dispatcher role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert([{ user_id: authData.user.id, role: "dispatcher" }]);

    if (roleError) {
      toast.error("Failed to assign dispatcher role");
      return;
    }

    // Add pincodes
    const pincodeInserts = pincodes.map(pincode => ({
      dispatcher_id: authData.user.id,
      pincode,
    }));

    const { error: pincodeError } = await supabase
      .from("dispatcher_pincodes")
      .insert(pincodeInserts);

    if (pincodeError) {
      toast.error("Failed to assign pincodes");
    } else {
      toast.success("Dispatcher created successfully!");
      fetchDispatchers();
      (e.target as HTMLFormElement).reset();
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      created: "bg-muted",
      paid: "bg-primary",
      shipped: "bg-accent",
      delivered: "bg-green-500",
    };
    return colors[status] || "bg-muted";
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Full system control</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="parcels" className="space-y-6">
          <TabsList>
            <TabsTrigger value="parcels">
              <Package className="w-4 h-4 mr-2" />
              All Parcels ({parcels.length})
            </TabsTrigger>
            <TabsTrigger value="dispatchers">
              <Users className="w-4 h-4 mr-2" />
              Dispatchers ({dispatchers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="parcels">
            <Card>
              <CardHeader>
                <CardTitle>All Parcels</CardTitle>
                <CardDescription>Complete parcel tracking overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parcels.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No parcels in the system
                    </p>
                  ) : (
                    parcels.map((parcel) => (
                      <Card key={parcel.id} className="border-l-4 border-l-primary">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                <span className="font-mono font-bold">{parcel.tracking_code}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {parcel.from_pincode} → {parcel.to_pincode}
                              </p>
                              <p className="text-sm">Type: {parcel.parcel_type.replace(/_/g, " ")}</p>
                              <p className="text-sm font-semibold">Cost: ₹{parcel.cost}</p>
                              <p className="text-xs text-muted-foreground">
                                Created: {new Date(parcel.created_at).toLocaleString()}
                              </p>
                            </div>
                            <Badge className={getStatusColor(parcel.status)}>
                              {parcel.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dispatchers">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Dispatcher Management</CardTitle>
                    <CardDescription>Create and manage dispatchers</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Dispatcher
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Dispatcher</DialogTitle>
                        <DialogDescription>
                          Add a new dispatcher with assigned pincodes
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateDispatcher} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input id="password" name="password" type="password" required minLength={6} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pincodes">Pincodes (comma-separated)</Label>
                          <Input 
                            id="pincodes" 
                            name="pincodes" 
                            placeholder="380001, 380002, 380003"
                            required 
                          />
                        </div>
                        <Button type="submit" className="w-full">
                          Create Dispatcher
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dispatchers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No dispatchers yet
                    </p>
                  ) : (
                    dispatchers.map((dispatcher) => (
                      <Card key={dispatcher.user_id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/10 rounded-lg">
                              <Users className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                              <p className="font-semibold">{dispatcher.profiles?.email}</p>
                              <p className="text-sm text-muted-foreground">
                                {dispatcher.profiles?.name || "Name not set"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
