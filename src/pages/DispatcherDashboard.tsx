import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, LogOut, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DispatcherDashboard() {
  const { user, signOut } = useAuth();
  const [sentParcels, setSentParcels] = useState<any[]>([]);
  const [receiveParcels, setReceiveParcels] = useState<any[]>([]);
  const [pincodes, setPincodes] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPincodes();
  }, [user, navigate]);

  useEffect(() => {
    if (pincodes.length > 0) {
      fetchParcels();
    }
  }, [pincodes]);

  const fetchPincodes = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("dispatcher_pincodes")
      .select("pincode")
      .eq("dispatcher_id", user.id);
    
    if (data && !error) {
      setPincodes(data.map(d => d.pincode));
    }
  };

  const fetchParcels = async () => {
    if (!user || pincodes.length === 0) return;
    
    // Sent parcels (from_pincode matches)
    const { data: sent, error: sentError } = await supabase
      .from("parcels")
      .select("*")
      .in("from_pincode", pincodes)
      .order("created_at", { ascending: false });
    
    if (sent && !sentError) {
      setSentParcels(sent);
    }
    
    // Receive parcels (to_pincode matches)
    const { data: receive, error: receiveError } = await supabase
      .from("parcels")
      .select("*")
      .in("to_pincode", pincodes)
      .order("created_at", { ascending: false });
    
    if (receive && !receiveError) {
      setReceiveParcels(receive);
    }
  };

  const updateParcelStatus = async (parcelId: string, newStatus: "created" | "paid" | "shipped" | "delivered") => {
    const { error } = await supabase
      .from("parcels")
      .update({ status: newStatus })
      .eq("id", parcelId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Status updated successfully!");
      fetchParcels();
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

  const getNextStatus = (currentStatus: string, type: "sent" | "receive") => {
    if (type === "sent") {
      const order = ["created", "paid", "shipped"];
      const currentIndex = order.indexOf(currentStatus);
      return currentIndex < order.length - 1 ? order[currentIndex + 1] : null;
    } else {
      return currentStatus === "shipped" ? "delivered" : null;
    }
  };

  const ParcelCard = ({ parcel, type }: { parcel: any; type: "sent" | "receive" }) => {
    const nextStatus = getNextStatus(parcel.status, type);
    
    return (
      <Card className="border-l-4 border-l-accent">
        <CardContent className="pt-6">
          <div className="space-y-4">
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
            
            {nextStatus && (
              <div className="flex gap-2">
                <Select
                  value={parcel.status}
                  onValueChange={(value) => updateParcelStatus(parcel.id, value as "created" | "paid" | "shipped" | "delivered")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dispatcher Dashboard</h1>
            <p className="text-muted-foreground">
              Managing pincodes: {pincodes.join(", ") || "None assigned"}
            </p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="sent" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sent">
              <TrendingUp className="w-4 h-4 mr-2" />
              Sent Parcels ({sentParcels.length})
            </TabsTrigger>
            <TabsTrigger value="receive">
              <TrendingDown className="w-4 h-4 mr-2" />
              Receive Parcels ({receiveParcels.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sent">
            <Card>
              <CardHeader>
                <CardTitle>Parcels to Send</CardTitle>
                <CardDescription>
                  Parcels originating from your pincodes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sentParcels.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No parcels to send
                    </p>
                  ) : (
                    sentParcels.map((parcel) => (
                      <ParcelCard key={parcel.id} parcel={parcel} type="sent" />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="receive">
            <Card>
              <CardHeader>
                <CardTitle>Parcels to Receive</CardTitle>
                <CardDescription>
                  Parcels coming to your pincodes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {receiveParcels.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No parcels to receive
                    </p>
                  ) : (
                    receiveParcels.map((parcel) => (
                      <ParcelCard key={parcel.id} parcel={parcel} type="receive" />
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
