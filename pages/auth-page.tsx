import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Building2, Users, DollarSign, UserPlus } from "lucide-react";
import { insertUserSchema, loginSchema } from "@shared/schema";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation, isLoading } = useAuth();
  const [_, navigate] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: ""
    },
  });

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  // Register form
  const registerForm = useForm<z.infer<typeof insertUserSchema>>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      fullName: "",
      role: "user"
    },
  });

  const onRegisterSubmit = (values: z.infer<typeof insertUserSchema>) => {
    registerMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left column - Auth forms */}
      <div className="flex flex-col justify-center flex-1 px-6 py-12 lg:px-8 lg:flex-none lg:w-1/2">
        <div className="w-full max-w-sm mx-auto lg:w-[350px]">
          <div className="flex items-center justify-center mb-8">
            <Building2 className="h-10 w-10 text-primary" />
            <h2 className="ml-2 text-2xl font-bold text-gray-900">Sukha Senior Resort</h2>
          </div>
          
          <Tabs 
            defaultValue="login" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="login" className="w-full">Login</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Logging in...
                          </>
                        ) : "Log in"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="justify-center">
                  <p className="text-sm text-gray-500">
                    Planning to visit?{" "}
                    <Link
                      href="/visitor-registration"
                      className="text-primary hover:underline"
                    >
                      Register as visitor
                    </Link>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>
                    Enter your details to create a new account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="johndoe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : "Register"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="justify-center">
                  <p className="text-sm text-gray-500">
                    Already have an account?{" "}
                    <button 
                      className="text-primary hover:underline"
                      onClick={() => setActiveTab("login")}
                    >
                      Log in
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right column - Hero section */}
      <div className="hidden relative lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-800 to-primary-600">
          <div className="flex flex-col justify-center items-center h-full px-16 text-white">
            <Building2 className="h-20 w-20 mb-6" />
            <h1 className="text-4xl font-bold mb-4">Sukha Senior Resort Management</h1>
            <p className="text-lg text-center mb-8">
              A comprehensive solution for managing properties, residents, billing, and visitor access.
            </p>
            <div className="grid grid-cols-2 gap-8 max-w-lg">
              <div className="flex flex-col items-center">
                <div className="bg-white/10 rounded-lg p-3 mb-3">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Resident Management</h3>
                <p className="text-center text-sm mt-1">Manage all resident details with ease</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white/10 rounded-lg p-3 mb-3">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Room Management</h3>
                <p className="text-center text-sm mt-1">Track room status and occupancy</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white/10 rounded-lg p-3 mb-3">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Billing System</h3>
                <p className="text-center text-sm mt-1">Manage renewals and payments</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-white/10 rounded-lg p-3 mb-3">
                  <UserPlus className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Visitor Management</h3>
                <p className="text-center text-sm mt-1">Approve and track visitors</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
