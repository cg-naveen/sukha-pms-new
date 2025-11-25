import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, CalendarIcon } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertResidentSchema, insertNextOfKinSchema, Resident } from "@shared/schema";
import DocumentsTab from "./documents-tab";

const salesReferralOptions = [
  'caGrand',
  'Sales Team',
  'Offline Event',
  'Other'
];

const countryCodeOptions = [
  { value: '+60', label: '+60 (Malaysia)' },
  { value: '+65', label: '+65 (Singapore)' },
  { value: '+86', label: '+86 (China)' },
  { value: '+1', label: '+1 (US/Canada)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+91', label: '+91 (India)' },
  { value: '+82', label: '+82 (South Korea)' },
  { value: '+81', label: '+81 (Japan)' },
];

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
  const { data: residentDetail, isLoading: isLoadingDetail } = useQuery<any>({
    queryKey: [`/api/residents/${resident?.id || 0}`],
    enabled: !!resident,
  });

  // Fetch available rooms for the dropdown
  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ['/api/rooms'],
  });

  // Fetch occupancy data for all rooms to calculate available beds
  const { data: occupanciesData } = useQuery<Record<number, number>>({
    queryKey: ['/api/rooms/occupancies'],
    queryFn: async () => {
      // Fetch all rooms and their occupancy counts
      const occupancyMap: Record<number, number> = {};
      if (rooms.length > 0) {
        await Promise.all(
          rooms.map(async (room: any) => {
            try {
              const res = await fetch(`/api/rooms/${room.id}/occupancy`, {
                credentials: 'include',
              });
              if (res.ok) {
                const data = await res.json();
                occupancyMap[room.id] = data.activeOccupancyCount || 0;
              }
            } catch (error) {
              console.error(`Error fetching occupancy for room ${room.id}:`, error);
              occupancyMap[room.id] = 0;
            }
          })
        );
      }
      return occupancyMap;
    },
    enabled: rooms.length > 0,
  });

  // Create form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resident: {
        fullName: resident?.fullName || "",
        email: resident?.email || "",
        phone: resident?.phone || "",
        countryCode: resident?.countryCode || "+60",
        dateOfBirth: resident?.dateOfBirth || undefined,
        idNumber: resident?.idNumber || "",
        address: resident?.address || "",
        photo: resident?.photo || "",
        roomId: resident?.roomId || undefined,
        salesReferral: resident?.salesReferral || "Other",
        billingDate: resident?.billingDate || 1,
        numberOfBeds: resident?.numberOfBeds || 1,
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
  useEffect(() => {
    if (residentDetail) {
      // Update resident data
      if (residentDetail.fullName) {
        form.setValue("resident.fullName", residentDetail.fullName);
      }
      if (residentDetail.email) {
        form.setValue("resident.email", residentDetail.email);
      }
      if (residentDetail.phone) {
        form.setValue("resident.phone", residentDetail.phone);
      }
      if (residentDetail.countryCode) {
        form.setValue("resident.countryCode", residentDetail.countryCode);
      }
      if (residentDetail.dateOfBirth) {
        form.setValue("resident.dateOfBirth", residentDetail.dateOfBirth);
      }
      if (residentDetail.idNumber) {
        form.setValue("resident.idNumber", residentDetail.idNumber);
      }
      if (residentDetail.address) {
        form.setValue("resident.address", residentDetail.address);
      }
      if (residentDetail.roomId) {
        form.setValue("resident.roomId", residentDetail.roomId);
      }
      if (residentDetail.salesReferral) {
        form.setValue("resident.salesReferral", residentDetail.salesReferral);
      }
      if (residentDetail.billingDate !== undefined) {
        form.setValue("resident.billingDate", residentDetail.billingDate);
      }
      if (residentDetail.numberOfBeds !== undefined) {
        form.setValue("resident.numberOfBeds", residentDetail.numberOfBeds);
      }

      // Update next of kin data if it exists
      if (residentDetail.nextOfKin && residentDetail.nextOfKin.length > 0) {
        const nextOfKinData = residentDetail.nextOfKin[0];
        console.log('Loading next of kin data:', nextOfKinData);
      form.setValue("nextOfKin", {
          fullName: nextOfKinData.fullName || "",
          relationship: nextOfKinData.relationship || "",
          phone: nextOfKinData.phone || "",
          email: nextOfKinData.email || "",
          address: nextOfKinData.address || "",
      });
      } else {
        console.log('No next of kin data found for resident');
      }
    }
  }, [residentDetail, form]);

  // Create or update resident mutation
  const residentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Prepare resident data - date should already be a string from the form
      const residentData: any = {
        ...data.resident,
      };
      
      // Ensure dateOfBirth is a string (YYYY-MM-DD) or undefined
      if (residentData.dateOfBirth) {
        if (residentData.dateOfBirth instanceof Date) {
          residentData.dateOfBirth = residentData.dateOfBirth.toISOString().split('T')[0];
        } else if (typeof residentData.dateOfBirth === 'string') {
          // Already a string, keep it
        }
      } else {
        // Remove undefined/null dateOfBirth
        delete residentData.dateOfBirth;
      }
      
      // Remove undefined values to avoid validation issues (but keep empty strings for optional fields)
      Object.keys(residentData).forEach(key => {
        if (residentData[key] === undefined || residentData[key] === null) {
          delete residentData[key];
        }
      });

      if (resident) {
        // Update existing resident
        const res = await apiRequest(
          "PUT", 
          `/api/residents/${resident.id}`, 
          residentData
        );
        const updatedResident = await res.json();

        // Update next of kin if provided (must have required fields)
        if (data.nextOfKin && 
            data.nextOfKin.fullName && data.nextOfKin.fullName.trim().length >= 2 && 
            data.nextOfKin.relationship && data.nextOfKin.relationship.trim().length > 0 &&
            data.nextOfKin.phone && data.nextOfKin.phone.trim().length >= 10) {
          try {
            // Clean up the data
            const nextOfKinData = {
              fullName: data.nextOfKin.fullName.trim(),
              relationship: data.nextOfKin.relationship.trim(),
              phone: data.nextOfKin.phone.trim(),
              email: data.nextOfKin.email?.trim() || undefined,
              address: data.nextOfKin.address?.trim() || undefined,
            };
            
            // Check if next of kin already exists
            const nextOfKinRes = await apiRequest(
              "GET",
              `/api/residents/${resident.id}/next-of-kin`
            );
            const existingNextOfKin = await nextOfKinRes.json();

            if (existingNextOfKin && existingNextOfKin.length > 0) {
              // For now, just create a new one (or we could delete the old one first)
              // Since there's no PUT endpoint, we'll create a new record
              await apiRequest(
                "POST",
                `/api/residents/${resident.id}/next-of-kin`,
                nextOfKinData
              );
            } else {
              // Create new next of kin
              await apiRequest(
                "POST",
                `/api/residents/${resident.id}/next-of-kin`,
                nextOfKinData
              );
            }
          } catch (error) {
            console.error('Error updating next of kin:', error);
            // Don't fail the whole operation if next of kin update fails
          }
        }

        return updatedResident;
      } else {
        // Create new resident
        const res = await apiRequest(
          "POST", 
          "/api/residents", 
          residentData
        );
        const newResident = await res.json();

        // Create next of kin if provided (must have required fields)
        if (data.nextOfKin && 
            data.nextOfKin.fullName && data.nextOfKin.fullName.trim().length >= 2 && 
            data.nextOfKin.relationship && data.nextOfKin.relationship.trim().length > 0 &&
            data.nextOfKin.phone && data.nextOfKin.phone.trim().length >= 10) {
          try {
            console.log('Creating next of kin with data:', data.nextOfKin);
            // Clean up the data - remove empty strings, keep only valid fields
            const nextOfKinData = {
              fullName: data.nextOfKin.fullName.trim(),
              relationship: data.nextOfKin.relationship.trim(),
              phone: data.nextOfKin.phone.trim(),
              email: data.nextOfKin.email?.trim() || undefined,
              address: data.nextOfKin.address?.trim() || undefined,
            };
            
            const nextOfKinRes = await apiRequest(
              "POST",
              `/api/residents/${newResident.id}/next-of-kin`,
              nextOfKinData
            );
            const createdNextOfKin = await nextOfKinRes.json();
            console.log('Next of kin created successfully:', createdNextOfKin);
          } catch (error: any) {
            console.error('Error creating next of kin:', error);
            // Show error to user but don't fail the whole operation
            toast({
              title: "Warning",
              description: "Resident created but next of kin could not be saved. You can add it later.",
              variant: "destructive",
            });
          }
        }

        return newResident;
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
    onError: (error: any) => {
      console.error('Resident mutation error:', error);
      const errorMessage = error?.message || "Failed to save resident";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log('✅ Form submitted with data:', data);
    console.log('✅ Starting mutation...');
    try {
    residentMutation.mutate(data);
    } catch (error) {
      console.error('❌ Error in onSubmit:', error);
    }
  };

  const handleFormError = (errors: any) => {
    console.error('Form validation errors:', errors);
    console.error('Form values:', form.getValues());
    toast({
      title: "Validation Error",
      description: "Please fill in all required fields. Check the form for details.",
      variant: "destructive",
    });
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
      <form onSubmit={form.handleSubmit(onSubmit, handleFormError)}>
        <Tabs defaultValue="personal" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Personal Information</TabsTrigger>
            <TabsTrigger value="nextOfKin">Next of Kin</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="resident.fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} value={field.value || ''} />
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
                      <Input type="email" placeholder="john@example.com" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="resident.countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Code</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {countryCodeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="resident.phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="resident.roomId"
                render={({ field }) => {
                  // Calculate available beds for each room
                  const roomsWithAvailability = rooms.map((room: any) => {
                    const occupiedBeds = occupanciesData?.[room.id] || 0;
                    const availableBeds = (room.numberOfBeds || 1) - occupiedBeds;
                    return {
                      ...room,
                      availableBeds,
                      isAvailable: availableBeds > 0 || room.id === field.value
                    };
                  });

                  return (
                  <FormItem>
                    <FormLabel>Assigned Room</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "no_room" ? undefined : parseInt(value))} defaultValue={field.value?.toString() || "no_room"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select room (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="no_room">No room assigned</SelectItem>
                          {roomsWithAvailability
                            .filter((room: any) => room.isAvailable)
                            .map((room: any) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                                {room.unitNumber} - {room.roomType.replace('_', ' ')} 
                                {room.availableBeds !== undefined && ` (${room.availableBeds}/${room.numberOfBeds || 1} beds available)`}
                                {room.availableBeds === undefined && ` (${room.numberOfBeds || 1} beds)`}
                                {' '}(RM {room.monthlyRate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="resident.salesReferral"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Referral</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select referral source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {salesReferralOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
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
                name="resident.billingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Date (Day of Month)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1" 
                        min="1"
                        max="31"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === "" ? "1" : e.target.value;
                          const numValue = parseInt(value, 10);
                          if (numValue >= 1 && numValue <= 31) {
                            field.onChange(numValue);
                          }
                        }}
                        value={field.value || 1}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Day of month (1-31) for billing generation
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resident.numberOfBeds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Beds Required</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1" 
                        min="1"
                        max="10"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === "" ? "1" : e.target.value;
                          const numValue = parseInt(value, 10);
                          if (numValue >= 1 && numValue <= 10) {
                            field.onChange(numValue);
                          }
                        }}
                        value={field.value || 1}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Number of beds this resident requires (1-10)
                    </p>
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
                            type="button"
                            variant="outline"
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            // Convert Date to string format (YYYY-MM-DD) for the form
                            if (date) {
                              const dateString = date.toISOString().split('T')[0];
                              field.onChange(dateString);
                            } else {
                              field.onChange(undefined);
                            }
                          }}
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
                       <Input placeholder="ID123456789" {...field} value={field.value || ''} />
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
                      value={field.value || ''}
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
                    <Input placeholder="Jane Doe" {...field} value={field.value || ''} />
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
                    <Input placeholder="Spouse, Parent, Sibling, etc." {...field} value={field.value || ''} />
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
                      <Input placeholder="(555) 987-6543" {...field} value={field.value || ''} />
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
                      <Input type="email" placeholder="jane@example.com" {...field} value={field.value || ''} />
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
                       value={field.value || ''}
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
              <div className="flex gap-2">
                <Button type="button" onClick={() => setActiveTab("documents")} variant="outline">
                  Next
                </Button>
                <Button 
                  type="submit" 
                  disabled={residentMutation.isPending}
                  onClick={(e) => {
                    console.log('Create Resident button clicked');
                    console.log('Form values:', form.getValues());
                    console.log('Form errors:', form.formState.errors);
                    // Don't prevent default - let form submit normally
                  }}
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
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4 py-4">
            {resident ? (
              <DocumentsTab residentId={resident.id} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Please save the resident first to manage documents.</p>
              </div>
            )}
            
            <div className="flex justify-between pt-2">
              <Button type="button" onClick={() => setActiveTab("nextOfKin")}>
                Previous
              </Button>
              <Button 
                type="submit" 
                disabled={residentMutation.isPending}
                onClick={(e) => {
                  console.log('Create Resident button clicked (documents tab)');
                  console.log('Form values:', form.getValues());
                  console.log('Form errors:', form.formState.errors);
                }}
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
