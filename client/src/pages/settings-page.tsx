import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const generalSettingsSchema = z.object({
  propertyName: z.string().min(2, {
    message: "Property name must be at least 2 characters.",
  }),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
  contactEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  contactPhone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
});

const notificationSettingsSchema = z.object({
  enableEmailNotifications: z.boolean().default(true),
  enableSmsNotifications: z.boolean().default(false),
  billingReminderDays: z.coerce.number().int().min(1).max(30),
  visitorApprovalNotification: z.boolean().default(true),
});

const jobSchedulingSchema = z.object({
  billingGenerationEnabled: z.boolean().default(true),
  billingGenerationHour: z.coerce.number().int().min(0).max(23),
  billingGenerationMinute: z.coerce.number().int().min(0).max(59),
});

const contentManagementSchema = z.object({
  visitorTermsAndConditions: z.string().optional(),
});

const integrationSettingsSchema = z.object({
  wabotApiBaseUrl: z.string().url("Please enter a valid URL").optional(),
  visitorApprovalMessageTemplate: z.string().optional(),
  visitorRejectionMessageTemplate: z.string().optional(),
});

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // Fetch Wabot credentials status
  const { data: wabotCredentials } = useQuery<{
    instanceIdConfigured: boolean;
    accessTokenConfigured: boolean;
  }>({
    queryKey: ["/api/settings/wabot-credentials"],
    queryFn: async () => {
      const response = await fetch("/api/settings/wabot-credentials", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch credentials status");
      return response.json();
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update settings");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const generalForm = useForm<z.infer<typeof generalSettingsSchema>>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      propertyName: "",
      address: "",
      contactEmail: "",
      contactPhone: "",
    },
  });
  
  const notificationForm = useForm<z.infer<typeof notificationSettingsSchema>>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      enableEmailNotifications: true,
      enableSmsNotifications: false,
      billingReminderDays: 7,
      visitorApprovalNotification: true,
    },
  });

  const jobSchedulingForm = useForm<z.infer<typeof jobSchedulingSchema>>({
    resolver: zodResolver(jobSchedulingSchema),
    defaultValues: {
      billingGenerationEnabled: true,
      billingGenerationHour: 2,
      billingGenerationMinute: 0,
    },
  });

  const contentManagementForm = useForm<z.infer<typeof contentManagementSchema>>({
    resolver: zodResolver(contentManagementSchema),
    defaultValues: {
      visitorTermsAndConditions: "",
    },
  });

  const integrationSettingsForm = useForm<z.infer<typeof integrationSettingsSchema>>({
    resolver: zodResolver(integrationSettingsSchema),
    defaultValues: {
      wabotApiBaseUrl: "https://app.wabot.my/api",
      visitorApprovalMessageTemplate: "",
      visitorRejectionMessageTemplate: "",
    },
  });

  // Update form values when settings are loaded
  useEffect(() => {
    if (settingsData) {
      generalForm.reset({
        propertyName: settingsData.propertyName || "",
        address: settingsData.address || "",
        contactEmail: settingsData.contactEmail || "",
        contactPhone: settingsData.contactPhone || "",
      });
      notificationForm.reset({
        enableEmailNotifications: settingsData.enableEmailNotifications ?? true,
        enableSmsNotifications: settingsData.enableSmsNotifications ?? false,
        billingReminderDays: settingsData.billingReminderDays ?? 7,
        visitorApprovalNotification: settingsData.visitorApprovalNotification ?? true,
      });
      jobSchedulingForm.reset({
        billingGenerationEnabled: settingsData.billingGenerationEnabled ?? true,
        billingGenerationHour: settingsData.billingGenerationHour ?? 2,
        billingGenerationMinute: settingsData.billingGenerationMinute ?? 0,
      });
      contentManagementForm.reset({
        visitorTermsAndConditions: settingsData.visitorTermsAndConditions || "",
      });
      integrationSettingsForm.reset({
        wabotApiBaseUrl: settingsData.wabotApiBaseUrl || settingsData.wabot_api_base_url || "https://app.wabot.my/api",
        visitorApprovalMessageTemplate: settingsData.visitorApprovalMessageTemplate || settingsData.visitor_approval_message_template || "",
        visitorRejectionMessageTemplate: settingsData.visitorRejectionMessageTemplate || settingsData.visitor_rejection_message_template || "",
      });
    }
  }, [settingsData, generalForm, notificationForm, jobSchedulingForm, contentManagementForm, integrationSettingsForm]);
  
  const onSubmitGeneral = (data: z.infer<typeof generalSettingsSchema>) => {
    updateSettingsMutation.mutate(data);
  };
  
  const onSubmitNotifications = (data: z.infer<typeof notificationSettingsSchema>) => {
    updateSettingsMutation.mutate(data);
  };

  const onSubmitJobScheduling = (data: z.infer<typeof jobSchedulingSchema>) => {
    updateSettingsMutation.mutate(data);
  };

  const onSubmitContentManagement = (data: z.infer<typeof contentManagementSchema>) => {
    updateSettingsMutation.mutate(data);
  };

  const onSubmitIntegrationSettings = (data: z.infer<typeof integrationSettingsSchema>) => {
    updateSettingsMutation.mutate(data);
  };
  
  return (
    <MainLayout title="Settings">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="jobs">Job Scheduling</TabsTrigger>
            <TabsTrigger value="content">Content Management</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
          </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage your property's general settings and information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form onSubmit={generalForm.handleSubmit(onSubmitGeneral)} className="space-y-6">
                  <FormField
                    control={generalForm.control}
                    name="propertyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          This is the name of your property that will appear throughout the system.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={generalForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormDescription>
                          The physical address of your property.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={generalForm.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Primary contact email for the property.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={generalForm.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Primary contact phone for the property.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when notifications are sent from the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onSubmitNotifications)} className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="enableEmailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Email Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive notifications via email.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="enableSmsNotifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            SMS Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive notifications via text message.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="billingReminderDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Reminder Days</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            min="1"
                            max="30"
                          />
                        </FormControl>
                        <FormDescription>
                          Days before due date to send billing reminders.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={notificationForm.control}
                    name="visitorApprovalNotification"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Visitor Approval Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive notifications for visitor approval requests.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Job Scheduling</CardTitle>
              <CardDescription>
                Configure automated job schedules for system tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...jobSchedulingForm}>
                <form onSubmit={jobSchedulingForm.handleSubmit(onSubmitJobScheduling)} className="space-y-6">
                  <FormField
                    control={jobSchedulingForm.control}
                    name="billingGenerationEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Enable Automated Billing Generation
                          </FormLabel>
                          <FormDescription>
                            Automatically generate monthly billings for residents based on their billing date.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {jobSchedulingForm.watch("billingGenerationEnabled") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-lg border p-4">
                      <FormField
                        control={jobSchedulingForm.control}
                        name="billingGenerationHour"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hour (24-hour format)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                min="0"
                                max="23"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Hour of day to run billing generation (0-23).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={jobSchedulingForm.control}
                        name="billingGenerationMinute"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minute</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                min="0"
                                max="59"
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Minute of hour to run billing generation (0-59).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  {jobSchedulingForm.watch("billingGenerationEnabled") && (
                    <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                      <p className="font-medium mb-1">Current Schedule:</p>
                      <p>
                        Billing generation will run daily at{" "}
                        {String(jobSchedulingForm.watch("billingGenerationHour") || 0).padStart(2, "0")}:
                        {String(jobSchedulingForm.watch("billingGenerationMinute") || 0).padStart(2, "0")}{" "}
                        (UTC timezone)
                      </p>
                      <p className="mt-2 text-xs text-blue-600">
                        Note: The cron job must be configured in your deployment platform (e.g., Vercel) to match this schedule.
                      </p>
                    </div>
                  )}
                  
                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>
                Manage content displayed to visitors and users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...contentManagementForm}>
                <form onSubmit={contentManagementForm.handleSubmit(onSubmitContentManagement)} className="space-y-6">
                  <FormField
                    control={contentManagementForm.control}
                    name="visitorTermsAndConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visitor Terms and Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={15}
                            placeholder="Enter the terms and conditions for visitor registration. This content will be displayed in the visitor registration form."
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormDescription>
                          This content will be shown to visitors when they click on "Terms and Conditions" during registration. You can use markdown formatting.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="integration">
          <Card>
            <CardHeader>
              <CardTitle>Integration Settings</CardTitle>
              <CardDescription>
                Configure third-party integrations for notifications and messaging.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...integrationSettingsForm}>
                <form onSubmit={integrationSettingsForm.handleSubmit(onSubmitIntegrationSettings)} className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={integrationSettingsForm.control}
                      name="wabotApiBaseUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wabot API Base URL *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="https://app.wabot.my/api"
                            />
                          </FormControl>
                          <FormDescription>
                            The base URL for your Wabot / WhatsApp provider API.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="rounded-lg border p-4 bg-gray-50">
                      <h4 className="text-sm font-medium mb-2">API Credentials (from .env)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {wabotCredentials?.instanceIdConfigured ? (
                            <span className="text-xs text-green-600">✓ Configured</span>
                          ) : (
                            <span className="text-xs text-amber-600">⚠️ Not Configured</span>
                          )}
                          <span className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">WABOT_INSTANCE_ID</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {wabotCredentials?.accessTokenConfigured ? (
                            <span className="text-xs text-green-600">✓ Configured</span>
                          ) : (
                            <span className="text-xs text-amber-600">⚠️ Not Configured</span>
                          )}
                          <span className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">WABOT_ACCESS_TOKEN</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        These credentials are stored in your <span className="px-1 py-0.5 bg-gray-200 rounded font-mono text-xs">.env</span> file. Update them on the server.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-lg font-semibold">Message Templates</h4>
                    
                    <FormField
                      control={integrationSettingsForm.control}
                      name="visitorApprovalMessageTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visitor Approval Notification Template</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={6}
                              placeholder="Hello {visitorName}, your visit request to {residentName} on {visitDate} at {visitTime} has been approved. Your QR code: {qrCodeUrl}"
                              className="font-mono text-sm"
                            />
                          </FormControl>
                          <FormDescription>
                            WhatsApp message template for visitor approval. Available variables: {"{"}visitorName{"}"}, {"{"}residentName{"}"}, {"{"}visitDate{"}"}, {"{"}visitTime{"}"}, {"{"}qrCodeUrl{"}"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={integrationSettingsForm.control}
                      name="visitorRejectionMessageTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Visitor Rejection Notification Template</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={6}
                              placeholder="Hello {visitorName}, we regret to inform you that your visit request to {residentName} on {visitDate} at {visitTime} has been rejected. Please contact us for more information."
                              className="font-mono text-sm"
                            />
                          </FormControl>
                          <FormDescription>
                            WhatsApp message template for visitor rejection. Available variables: {"{"}visitorName{"}"}, {"{"}residentName{"}"}, {"{"}visitDate{"}"}, {"{"}visitTime{"}"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </MainLayout>
  );
}
