import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertVisitorSchema, Visitor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";

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
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { z } from "zod";

interface VisitorFormProps {
  visitor?: Visitor;
  isPublic?: boolean;
  isWalkIn?: boolean;
  onClose: () => void;
}

export default function VisitorForm({ visitor, isPublic = false, isWalkIn = false, onClose }: VisitorFormProps) {
  const { toast } = useToast();

  // Fetch residents for dropdown
  const { data: residents } = useQuery({
    queryKey: ["/api/residents"],
    enabled: !visitor?.residentId, // Only fetch if we don't have a resident ID
  });

  // Create form with default values
  const form = useForm<z.infer<typeof insertVisitorSchema>>({
    resolver: zodResolver(insertVisitorSchema),
    defaultValues: {
      residentId: visitor?.residentId || 0,
      fullName: visitor?.fullName || "",
      email: visitor?.email || "",
      phone: visitor?.phone || "",
      countryCode: visitor?.countryCode || "+60",
      nricPassport: visitor?.nricPassport || "",
      purposeOfVisit: visitor?.purposeOfVisit || "general_visit",
      visitDate: visitor?.visitDate || new Date().toISOString().split('T')[0],
      visitTime: visitor?.visitTime || "",
      residentName: visitor?.residentName || "",
      roomNumber: visitor?.roomNumber || "",
      vehicleNumber: visitor?.vehicleNumber || "",
      numberOfVisitors: visitor?.numberOfVisitors || 1,
      details: visitor?.details || "",
    },
  });

  // Create visitor request mutation
  const visitorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertVisitorSchema>) => {
      let endpoint = "/api/visitors";
      if (isPublic) {
        endpoint = "/api/public/visitor-request";
      } else if (isWalkIn) {
        endpoint = "/api/visitors/walk-in";
      }
      const res = await apiRequest("POST", endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isWalkIn ? "Walk-in visitor registered" : "Visit request submitted",
        description: isPublic
          ? "Your request has been submitted. You will be notified when approved."
          : isWalkIn 
            ? "Walk-in visitor has been registered and automatically approved. QR code is generated."
            : "Visit request has been created successfully.",
      });
      if (!isPublic) {
        queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      }
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

  const onSubmit = (data: z.infer<typeof insertVisitorSchema>) => {
    visitorMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        {!visitor && (
          <FormField
            control={form.control}
            name="residentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resident to Visit</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  defaultValue={field.value ? field.value.toString() : undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resident" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.isArray(residents) ? residents.map((resident: any) => (
                      <SelectItem key={resident.id} value={resident.id.toString()}>
                        {resident.fullName} - Room {resident.occupancy?.[0]?.room?.unitNumber || "N/A"}
                      </SelectItem>
                    )) : null}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
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
            control={form.control}
            name="countryCode"
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
          name="phone"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        
        <FormField
          control={form.control}
          name="nricPassport"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NRIC / Passport Number</FormLabel>
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
              <FormLabel>Purpose of Visit</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="general_visit">General Visit</SelectItem>
                  <SelectItem value="site_visit">Site Visit</SelectItem>
                  <SelectItem value="celebration">Celebration</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="visitDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Visit Date</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  min={isWalkIn ? undefined : new Date().toISOString().split('T')[0]}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Additional form fields for comprehensive visitor management */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="visitTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visit Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} value={field.value || ""} />
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
                <FormLabel>Number of Visitors</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="10" 
                    {...field} 
                    value={field.value || 1}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isPublic && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="residentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resident Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Who are you visiting?" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roomNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Number (if known)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 101" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="vehicleNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vehicle Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., ABC 1234" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any special requirements or additional information" 
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
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
          <Button 
            type="submit" 
            disabled={visitorMutation.isPending}
          >
            {visitorMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
