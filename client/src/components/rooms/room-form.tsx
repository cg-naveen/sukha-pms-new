import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertRoomSchema, Room } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";

interface RoomFormProps {
  room: Room | null;
  onClose: () => void;
}

const bedConfigToCount: Record<string, number> = {
  single: 1,
  twin_sharing: 2,
  quad_suite: 4,
  vip: 4,
};

export default function RoomForm({ room, onClose }: RoomFormProps) {
  const { toast } = useToast();

  // Derive initial bedConfig from existing room data
  const getInitialBedConfig = (r: Room | null): string => {
    if (r?.bedConfig) return r.bedConfig;
    // fallback for old records without bedConfig
    if (r?.numberOfBeds === 2) return 'twin_sharing';
    if (r?.numberOfBeds === 4) return 'vip';
    return 'single';
  };

  // Create form with default values
  const form = useForm<z.infer<typeof insertRoomSchema>>({
    resolver: zodResolver(insertRoomSchema),
    defaultValues: {
      unitNumber: room?.unitNumber || "",
      slotLabel: room?.slotLabel || "",
      roomType: room?.roomType || "studio",
      size: room?.size || 0,
      floor: room?.floor || 1,
      numberOfBeds: room?.numberOfBeds || 1,
      bedConfig: getInitialBedConfig(room),
      status: room?.status || "vacant",
      monthlyRate: room?.monthlyRate || 0,
      description: room?.description || "",
      remark: room?.remark || "",
    },
  });

  // Create or update room mutation
  const roomMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertRoomSchema>) => {
      if (room) {
        // Update existing room
        const res = await apiRequest(
          "PUT", 
          `/api/rooms/${room.id}`, 
          data
        );
        return res.json();
      } else {
        // Create new room slots based on bed configuration
        const bedCount = data.numberOfBeds || 1;
        const slots = Array.from({ length: bedCount }, (_, i) =>
          bedCount === 1 ? "" : String.fromCharCode(65 + i)
        );

        const existingRooms = queryClient.getQueryData<any[]>(['/api/rooms']) || [];
        const results = [];
        for (const slot of slots) {
          const alreadyExists = existingRooms.some(
            (r) => r.unitNumber === data.unitNumber && (r.slotLabel || "") === slot
          );
          if (alreadyExists) continue;
          const payload = { ...data, slotLabel: slot };
          const res = await apiRequest("POST", "/api/rooms", payload);
          results.push(await res.json());
        }
        return results;
      }
    },
    onSuccess: (result) => {
      if (room) {
        toast({
          title: "Room updated",
          description: `Room ${form.getValues().unitNumber}${form.getValues().slotLabel ? ` ${form.getValues().slotLabel}` : ""} has been updated successfully`,
        });
      } else {
        const bedCount = form.getValues().numberOfBeds || 1;
        const createdCount = Array.isArray(result) ? result.length : (result ? 1 : 0);
        toast({
          title: createdCount > 0 ? "Room slots created" : "No new slots created",
          description:
            createdCount > 0
              ? `Created ${createdCount}/${bedCount} slot${bedCount > 1 ? "s" : ""} for ${form.getValues().unitNumber}`
              : `All slots already exist for ${form.getValues().unitNumber}`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
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

  const onSubmit = (data: z.infer<typeof insertRoomSchema>) => {
    roomMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="unitNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Number</FormLabel>
              <FormControl>
                <Input placeholder="101A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="not_in_use">Not In Use</SelectItem>
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
            name="bedConfig"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bed Configuration</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('numberOfBeds', bedConfigToCount[value] ?? 1);
                  }}
                  value={field.value || "single"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bed configuration" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="single">Single (1 bed)</SelectItem>
                    <SelectItem value="twin_sharing">Twin Sharing (2 beds)</SelectItem>
                    <SelectItem value="quad_suite">Quad Suite (4 beds)</SelectItem>
                    <SelectItem value="vip">VIP (4 beds)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="monthlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Rate (RM)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="1000" 
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === "" ? "0" : e.target.value;
                      field.onChange(parseInt(value, 10));
                    }}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter room description" 
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="remark"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remark</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter remark" 
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
          <Button 
            type="submit" 
            disabled={roomMutation.isPending}
          >
            {roomMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {room ? "Updating..." : "Creating..."}
              </>
            ) : (
              room ? "Update Room" : "Create Room"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
