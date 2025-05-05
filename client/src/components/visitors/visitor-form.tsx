import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertVisitorSchema, Visitor } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
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
  onClose: () => void;
}

export default function VisitorForm({ visitor, isPublic = false, onClose }: VisitorFormProps) {
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
      purpose: visitor?.purpose || "",
      visitDate: visitor?.visitDate ? new Date(visitor.visitDate) : new Date(),
    },
  });

  // Create visitor request mutation
  const visitorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertVisitorSchema>) => {
      const endpoint = isPublic ? "/api/public/visitor-request" : "/api/visitors";
      const res = await apiRequest("POST", endpoint, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Visit request submitted",
        description: isPublic
          ? "Your request has been submitted. You will be notified when approved."
          : "Visit request has been created successfully.",
      });
      if (!isPublic) {
        queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
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
                    {residents?.map((resident: any) => (
                      <SelectItem key={resident.id} value={resident.id.toString()}>
                        {resident.fullName} - Room {resident.occupancy?.[0]?.room?.unitNumber || "N/A"}
                      </SelectItem>
                    ))}
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
            name="phone"
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
        
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose of Visit</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter the purpose of your visit" 
                  className="resize-none"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="visitDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Visit Date</FormLabel>
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
                      date < new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
