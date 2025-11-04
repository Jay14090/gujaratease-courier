import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Package, Truck } from "lucide-react";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Please complete your profile.");
      navigate("/customer");
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      // Navigation will be handled by auth state change
      toast.success("Welcome back!");
    }
  };

  const handleTrackParcel = async () => {
    if (!trackingCode.trim()) {
      toast.error("Please enter a tracking code");
      return;
    }
    
    navigate(`/track/${trackingCode}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="w-full max-w-6xl relative z-10 grid md:grid-cols-2 gap-8 items-center">
        {/* Branding Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Truck className="w-12 h-12 text-primary" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Gujarat Courier
              </h1>
              <p className="text-muted-foreground text-lg">Fast, Reliable, Secure</p>
            </div>
          </div>
          
          <div className="space-y-4 mt-8">
            <div className="flex items-start gap-3">
              <Package className="w-6 h-6 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Track Anywhere</h3>
                <p className="text-muted-foreground">Real-time tracking for all your parcels</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Truck className="w-6 h-6 text-accent mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Quick Delivery</h3>
                <p className="text-muted-foreground">Pincode-based efficient routing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Section */}
        <Card className="backdrop-blur-sm bg-card/80 border-2 border-border">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4">
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to access your dashboard
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp}>
                <CardContent className="space-y-4">
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Customer account - Start shipping today
                  </CardDescription>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      minLength={6}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </CardContent>
              </form>
            </TabsContent>
          </Tabs>

          {/* Public Tracking */}
          <CardContent className="pt-6 border-t">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tracking">Track Parcel Without Login</Label>
                <div className="flex gap-2">
                  <Input
                    id="tracking"
                    placeholder="Enter tracking code"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTrackParcel()}
                  />
                  <Button onClick={handleTrackParcel} variant="outline">
                    Track
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
