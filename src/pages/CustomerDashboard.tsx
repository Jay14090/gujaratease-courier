import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CustomerDashboard() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [parcels, setParcels] = useState<any[]>([]);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
    fetchParcels();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (data && !error) {
      setProfile(data);
      setIsProfileComplete(!!(data.name && data.phone && data.address && data.pincode));
    }
  };

  const fetchParcels = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("parcels")
      .select("*")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    
    if (data && !error) {
      setParcels(data);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      id: user.id,
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      pincode: formData.get("pincode") as string,
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(updates);

    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully!");
      fetchProfile();
    }
  };

  const calculateCost = (type: string, weight: number = 1) => {
    const baseCosts: Record<string, number> = {
      document: 50,
      small_package: 100,
      medium_package: 200,
      large_package: 400,
      fragile: 300,
    };
    return baseCosts[type] * weight;
  };

  const handleCreateParcel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const parcelType = formData.get("parcel_type") as "document" | "small_package" | "medium_package" | "large_package" | "fragile";
    const weight = parseFloat(formData.get("weight") as string) || 1;
    
    const { data: trackingData } = await supabase
      .rpc("generate_tracking_code");
    
    const parcel = {
      customer_id: user.id,
      tracking_code: trackingData || `GCS${Date.now()}`,
      from_pincode: formData.get("from_pincode") as string,
      to_pincode: formData.get("to_pincode") as string,
      parcel_type: parcelType,
      weight,
      description: formData.get("description") as string,
      cost: calculateCost(parcelType, weight),
      status: "created" as const,
    };

    const { error } = await supabase
      .from("parcels")
      .insert([parcel]);

    if (error) {
      toast.error("Failed to create parcel");
    } else {
      toast.success(`Parcel created! Tracking code: ${parcel.tracking_code}`);
      fetchParcels();
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

  if (!isProfileComplete && profile) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-6 h-6" />
                Complete Your Profile
              </CardTitle>
              <CardDescription>
                Please fill in your details to start using the service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" name="name" required defaultValue={profile?.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" name="phone" type="tel" required defaultValue={profile?.phone} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea id="address" name="address" required defaultValue={profile?.address} />
                </div>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" name="city" required defaultValue={profile?.city} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input id="state" name="state" required defaultValue={profile?.state} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input id="pincode" name="pincode" required defaultValue={profile?.pincode} />
                  </div>
                </div>
                
                <Button type="submit" className="w-full">
                  Save Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Customer Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {profile?.name}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList>
            <TabsTrigger value="create">Create Parcel</TabsTrigger>
            <TabsTrigger value="track">Track Parcels</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create New Parcel</CardTitle>
                <CardDescription>Fill in the parcel details to create a shipment</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateParcel} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="from_pincode">From Pincode *</Label>
                      <Input id="from_pincode" name="from_pincode" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="to_pincode">To Pincode *</Label>
                      <Input id="to_pincode" name="to_pincode" required />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="parcel_type">Parcel Type *</Label>
                      <Select name="parcel_type" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="document">Document (₹50)</SelectItem>
                          <SelectItem value="small_package">Small Package (₹100)</SelectItem>
                          <SelectItem value="medium_package">Medium Package (₹200)</SelectItem>
                          <SelectItem value="large_package">Large Package (₹400)</SelectItem>
                          <SelectItem value="fragile">Fragile (₹300)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input id="weight" name="weight" type="number" step="0.1" min="0.1" defaultValue="1" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" placeholder="Optional" />
                  </div>

                  <Button type="submit" className="w-full">
                    Create Parcel
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="track">
            <Card>
              <CardHeader>
                <CardTitle>Your Parcels</CardTitle>
                <CardDescription>Track all your shipments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parcels.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No parcels yet. Create your first parcel!
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

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Update Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input id="edit-name" name="name" defaultValue={profile?.name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input id="edit-phone" name="phone" defaultValue={profile?.phone} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Textarea id="edit-address" name="address" defaultValue={profile?.address} />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-city">City</Label>
                      <Input id="edit-city" name="city" defaultValue={profile?.city} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-state">State</Label>
                      <Input id="edit-state" name="state" defaultValue={profile?.state} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-pincode">Pincode</Label>
                      <Input id="edit-pincode" name="pincode" defaultValue={profile?.pincode} />
                    </div>
                  </div>
                  
                  <Button type="submit">Update Profile</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
