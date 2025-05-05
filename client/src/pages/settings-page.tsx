import { useState } from "react";
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const { user } = useAuth();
  const { toast } = useToast();
  
  const generalForm = useForm<z.infer<typeof generalSettingsSchema>>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      propertyName: "PropertyPro",
      address: "123 Main Street, Anytown, USA",
      contactEmail: "admin@property.com",
      contactPhone: "(555) 123-4567",
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
  
  const onSubmitGeneral = (data: z.infer<typeof generalSettingsSchema>) => {
    // In a real app, this would save to the backend
    toast({
      title: "Settings saved",
      description: "Your general settings have been saved successfully",
    });
    console.log(data);
  };
  
  const onSubmitNotifications = (data: z.infer<typeof notificationSettingsSchema>) => {
    // In a real app, this would save to the backend
    toast({
      title: "Settings saved",
      description: "Your notification settings have been saved successfully",
    });
    console.log(data);
  };
  
  return (
    <MainLayout title="Settings">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
      </div>
      
      <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
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
                  
                  <Button type="submit" disabled={generalForm.formState.isSubmitting}>
                    {generalForm.formState.isSubmitting ? (
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
                  
                  <Button type="submit" disabled={notificationForm.formState.isSubmitting}>
                    {notificationForm.formState.isSubmitting ? (
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
        
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Backup and Restore</CardTitle>
              <CardDescription>
                Manage system backups and restore from previous backups.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-2">Create Backup</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Create a complete backup of all system data including residents, rooms, billings, and visitor records.
                </p>
                <Button>Create Backup</Button>
              </div>
              
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-2">Restore from Backup</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Restore your system from a previous backup file. This will replace all current data.
                </p>
                <div className="flex items-center gap-4">
                  <Input type="file" />
                  <Button variant="outline">Restore</Button>
                </div>
              </div>
              
              <div className="rounded-lg border p-4">
                <h3 className="text-lg font-medium mb-2">Scheduled Backups</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Configure automated backups to run on a schedule.
                </p>
                <div className="flex items-center gap-2 mb-4">
                  <Switch id="auto-backup" />
                  <label htmlFor="auto-backup" className="text-sm font-medium">
                    Enable automated backups
                  </label>
                </div>
                <Input
                  type="text" 
                  placeholder="Weekly on Sunday at 2:00 AM"
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
