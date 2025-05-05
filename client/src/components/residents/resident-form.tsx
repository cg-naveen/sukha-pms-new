import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { insertResidentSchema, insertNextOfKinSchema, Resident } from "@shared/schema";

interface ResidentFormProps {
  resident: Resident | null;
  onClose: () => void;
}

// Combine the resident and next of kin schemas
const formSchema = z.object({
  resident: insertResidentSchema,
  nextOfKin: insertNextOfKinSchema.omit({ residentId: true }),
});

export default function ResidentForm({ resident, onClose }: ResidentFormProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const { toast } = useToast();

  // If editing a resident, fetch additional details like next of kin
  const { data: residentDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: resident ? [`/api/residents/${resident.id}`] : null,
    enabled: !!resident,
  });

  // Create form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resident: {
        fullName: resident?.fullName || "",
        email: resident?.email || "",
        phone: resident?.phone || "",
        dateOfBirth: resident?.dateOfBirth ? new Date(resident.dateOfBirth) : undefined,
        idNumber: resident?.idNumber || "",
        address: resident?.address || "",
        photo: resident?.photo || "",
      },
      nextOfKin: {
        fullName: "",
        relationship: "",
        phone: "",
        email: "",
        address: "",
      },
    },
  });

  // Update form values once we have the resident details
  useState(() => {
    if (residentDetail && residentDetail.nextOfKin?.length > 0) {
      const nextOfKin = residentDetail.nextOfKin[0];
      form.setValue("nextOfKin", {
        fullName: nextOfKin.fullName,
        relationship: nextOfKin.relationship,
        phone: nextOfKin.phone,
        email: nextOfKin.email || "",
        address: nextOfKin.address || "",
      });
    }
  });

  // Create or update resident mutation
  const residentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (resident) {
        // Update existing resident
        const res = await apiRequest(
          "PUT", 
          `/api/residents/${resident.id}`, 
          data
        );
        return res.json();
      } else {
        // Create new resident
        const res = await apiRequest(
          "POST", 
          "/api/residents", 
          data
        );
        return res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: resident ? "Resident updated" : "Resident created",
        description: resident 
          ? `${form.getValues().resident.fullName} has been updated successfully` 
          : `${form.getValues().resident.fullName} has been added successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/residents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/residents/${resident?.id}`] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    residentMutation.mutate(data);
  };

  if (resident && isLoadingDetail) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="personal" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="nextOfKin">Next of Kin</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="resident.fullName"
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="resident.email"
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
                control={form.control}
                name="resident.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="resident.dateOfBirth"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
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
                name="resident.idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Number</FormLabel>
                    <FormControl>
                      <Input placeholder="ID123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="resident.address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter previous address" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={() => setActiveTab("nextOfKin")}>
                Next
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="nextOfKin" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="nextOfKin.fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nextOfKin.relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship</FormLabel>
                  <FormControl>
                    <Input placeholder="Spouse, Parent, Sibling, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nextOfKin.phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 987-6543" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nextOfKin.email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="nextOfKin.address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter address" 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-between pt-2">
              <Button type="button" onClick={() => setActiveTab("personal")}>
                Previous
              </Button>
              <Button 
                type="submit" 
                disabled={residentMutation.isPending}
              >
                {residentMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {resident ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  resident ? "Update Resident" : "Create Resident"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
