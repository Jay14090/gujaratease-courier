import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Calendar, ArrowLeft } from "lucide-react";

export default function PublicTracking() {
  const { trackingCode } = useParams();
  const navigate = useNavigate();
  const [parcel, setParcel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParcel();
  }, [trackingCode]);

  const fetchParcel = async () => {
    if (!trackingCode) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("parcels")
      .select("*")
      .eq("tracking_code", trackingCode)
      .single();
    
    setLoading(false);
    
    if (data && !error) {
      setParcel(data);
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

  const getStatusSteps = (currentStatus: string) => {
    const steps = ["created", "paid", "shipped", "delivered"];
    const currentIndex = steps.indexOf(currentStatus);
    
    return steps.map((step, index) => ({
      label: step.charAt(0).toUpperCase() + step.slice(1),
      completed: index <= currentIndex,
      active: index === currentIndex,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto mb-4 animate-bounce text-primary" />
          <p className="text-muted-foreground">Tracking parcel...</p>
        </div>
      </div>
    );
  }

  if (!parcel) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Parcel Not Found</CardTitle>
            <CardDescription>
              No parcel found with tracking code: {trackingCode}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusSteps = getStatusSteps(parcel.status);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/auth")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Package className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Parcel Tracking</CardTitle>
                  <CardDescription className="font-mono text-lg">
                    {parcel.tracking_code}
                  </CardDescription>
                </div>
              </div>
              <Badge className={getStatusColor(parcel.status) + " text-lg px-4 py-2"}>
                {parcel.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timeline */}
            <div className="relative">
              <div className="absolute top-6 left-6 bottom-6 w-0.5 bg-border" />
              <div className="space-y-6">
                {statusSteps.map((step, index) => (
                  <div key={step.label} className="relative flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 ${
                        step.completed
                          ? "bg-primary border-primary"
                          : "bg-background border-border"
                      }`}
                    >
                      {step.completed && (
                        <div className="w-3 h-3 bg-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`font-semibold ${
                          step.active ? "text-primary" : step.completed ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.active && (
                        <p className="text-sm text-muted-foreground">Current status</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="grid gap-4 md:grid-cols-2 pt-6 border-t">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">From Pincode</span>
                </div>
                <p className="text-lg font-semibold">{parcel.from_pincode}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">To Pincode</span>
                </div>
                <p className="text-lg font-semibold">{parcel.to_pincode}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="w-4 h-4" />
                  <span className="text-sm">Type</span>
                </div>
                <p className="text-lg font-semibold capitalize">
                  {parcel.parcel_type.replace(/_/g, " ")}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Created</span>
                </div>
                <p className="text-lg font-semibold">
                  {new Date(parcel.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {parcel.description && (
              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{parcel.description}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="text-muted-foreground">Total Cost</span>
              <span className="text-2xl font-bold text-primary">₹{parcel.cost}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
