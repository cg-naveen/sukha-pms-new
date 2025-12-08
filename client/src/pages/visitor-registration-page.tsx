"use client";

import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon, Building2, Loader2, Check, ChevronLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";

// Visitor registration form schema
const visitorRegistrationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  nricPassport: z.string().min(6, "NRIC/Passport must be at least 6 characters"),
  residentName: z.string().min(2, "Resident name is required"),
  roomNumber: z.string().optional(),
  visitDate: z.date({
    required_error: "Please select a date for your visit",
  }),
  visitTime: z.string({
    required_error: "Please select a time for your visit",
  }),
  vehicleNumber: z.string().optional(),
  numberOfVisitors: z.coerce.number().int().min(1, "At least 1 visitor is required").max(10, "Maximum 10 visitors allowed"),
  purposeOfVisit: z.enum(["general_visit", "site_visit", "celebration", "other"], {
    required_error: "Please select a purpose for your visit",
  }),
  otherPurpose: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions to proceed",
  }),
}).refine(
  (data) => {
    // If purpose is 'other', otherPurpose must be provided and not empty
    if (data.purposeOfVisit === "other") {
      return data.otherPurpose !== undefined && data.otherPurpose.trim() !== "";
    }
    return true;
  },
  {
    message: "Please specify the purpose of your visit",
    path: ["otherPurpose"]
  }
);

type VisitorRegistrationFormData = z.infer<typeof visitorRegistrationSchema>;

export default function VisitorRegistrationPage() {
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch visitor terms and conditions
  const { data: termsData, isLoading: isLoadingTerms } = useQuery<{ termsAndConditions: string }>({
    queryKey: ['/api/public/visitor-terms'],
    queryFn: async () => {
      const res = await fetch('/api/public/visitor-terms');
      if (!res.ok) throw new Error('Failed to fetch terms');
      return res.json();
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<VisitorRegistrationFormData>({
    resolver: zodResolver(visitorRegistrationSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      nricPassport: "",
      residentName: "",
      roomNumber: "",
      vehicleNumber: "",
      numberOfVisitors: 1,
      purposeOfVisit: "general_visit",
      otherPurpose: "",
      termsAccepted: false,
    },
  });

  const purposeOfVisit = form.watch("purposeOfVisit");

  const visitTimeslots = [
    "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", 
    "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
  ];

  const registerVisitorMutation = useMutation({
    mutationFn: async (data: VisitorRegistrationFormData) => {
      // Format the data as needed for the API
      const formattedData = {
        ...data,
        visitDate: format(data.visitDate, "yyyy-MM-dd"),
        details: data.purposeOfVisit === "other" ? data.otherPurpose : data.purposeOfVisit,
      };

      const res = await apiRequest("POST", "/api/public/visitor-registration", formattedData);
      return await res.json();
    },
    onSuccess: () => {
      setSubmissionSuccess(true);
      toast({
        title: "Registration successful",
        description: "Your visit has been registered. You will receive a confirmation email shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: VisitorRegistrationFormData) {
    registerVisitorMutation.mutate(data);
  }

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-center mb-8">
            <Building2 className="h-10 w-10 text-primary" />
            <h2 className="ml-2 text-2xl font-bold text-gray-900">Sukha Senior Resort</h2>
          </div>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submissionSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto rounded-full bg-green-100 p-3 w-12 h-12 mb-4 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Registration Successful</CardTitle>
            <CardDescription>
              Your visit to Sukha Senior Resort has been registered
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p>
              Thank you for registering your visit. Your registration has been submitted and is awaiting approval.
            </p>
            <p>
              You will receive a confirmation email once your visit is approved by the staff.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/auth">
              <Button variant="outline" className="flex items-center">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left column - Visitor registration form */}
      <div className="flex flex-col justify-center flex-1 px-6 py-12 lg:px-8 lg:flex-none lg:w-1/2">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-center mb-8">
            <Building2 className="h-10 w-10 text-primary" />
            <h2 className="ml-2 text-2xl font-bold text-gray-900">Sukha Senior Resort</h2>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Visitor Registration</CardTitle>
              <CardDescription>
                Register your visit to Sukha Senior Resort
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john.doe@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input placeholder="+60123456789" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="nricPassport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NRIC / Passport Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="123456-78-9012 or A12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="purposeOfVisit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purpose of Visit *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select purpose" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general_visit">General Visit of Father/Mother/Relative</SelectItem>
                              <SelectItem value="site_visit">Site Visit</SelectItem>
                              <SelectItem value="celebration">Celebration</SelectItem>
                              <SelectItem value="other">Other (specify)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {purposeOfVisit === "other" && (
                      <FormField
                        control={form.control}
                        name="otherPurpose"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Please specify purpose *</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Please describe the purpose of your visit" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="residentName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name of Resident to Visit *</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {purposeOfVisit !== "site_visit" && (
                      <FormField
                        control={form.control}
                        name="roomNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Number (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="A101" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="visitDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Visit Date *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => 
                                    date < new Date(new Date().setHours(0, 0, 0, 0)) || 
                                    date > new Date(new Date().setMonth(new Date().getMonth() + 1))
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="visitTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Visit Time *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {visitTimeslots.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="vehicleNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vehicle Number (optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="ABC-1234" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="numberOfVisitors"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Visitors *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1} 
                                max={10} 
                                {...field} 
                                onChange={(e) => {
                                  const value = e.target.value === "" ? "1" : e.target.value;
                                  field.onChange(parseInt(value, 10));
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum 10 visitors allowed
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            I accept the{" "}
                            <button
                              type="button"
                              onClick={() => setIsTermsModalOpen(true)}
                              className="text-primary hover:underline font-medium"
                            >
                              Terms and Conditions
                            </button>
                            {" "}for visitor registration *
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={registerVisitorMutation.isPending}
                  >
                    {registerVisitorMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : "Register Visit"}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  href="/auth"
                  className="text-primary hover:underline"
                >
                  Log in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Right column - Hero section */}
      <div className="hidden relative lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-800 to-primary-600">
          <div className="flex flex-col justify-center items-center h-full px-16 text-white">
            <Building2 className="h-20 w-20 mb-6" />
            <h1 className="text-4xl font-bold mb-4">Visit Our Residents</h1>
            <p className="text-lg text-center mb-8">
              Thank you for taking the time to register your visit. We look forward to welcoming you at Sukha Senior Resort.
            </p>
            
            <div className="bg-white/10 rounded-lg p-6 max-w-md">
              <h3 className="text-xl font-semibold mb-4">Visitor Guidelines</h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>Please arrive at your scheduled time</li>
                <li>Bring a valid ID for security check-in</li>
                <li>Respect the privacy and rest times of all residents</li>
                <li>Children must be supervised at all times</li>
                <li>Follow all health and safety protocols</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Terms and Conditions Modal */}
      <Dialog open={isTermsModalOpen} onOpenChange={setIsTermsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Visitor Terms and Conditions
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {isLoadingTerms ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm text-gray-700">
                  {termsData?.termsAndConditions || "Loading terms and conditions..."}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}