import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface RenewalProps {
  renewals: any[];
  isLoading: boolean;
}

export default function UpcomingRenewals({ renewals = [], isLoading }: RenewalProps) {
  const { toast } = useToast();

  const sendReminderMutation = useMutation({
    mutationFn: async (billingId: number) => {
      // In a real app, this would send an email reminder
      // For now, we'll just update the UI
      return await apiRequest("POST", `/api/billings/${billingId}/send-reminder`);
    },
    onSuccess: () => {
      toast({
        title: "Reminder sent",
        description: "Billing reminder has been sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billings/upcoming/30"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send reminder",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Upcoming Renewals</h2>
        </div>
        <div className="divide-y divide-gray-200 max-h-[420px] overflow-y-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-6 py-4">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-3" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // Sort renewals by due date (closest first)
  const sortedRenewals = [...renewals].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const getBadgeColor = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days <= 3) return "bg-yellow-100 text-yellow-800";
    if (days <= 7) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getDaysText = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days <= 0) return "today";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  return (
    <Card className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-800">Upcoming Renewals</h2>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-[420px] overflow-y-auto">
        {sortedRenewals.length > 0 ? (
          sortedRenewals.map((billing) => (
            <div key={billing.id} className="px-6 py-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-medium text-gray-900">
                  {billing.occupancy?.resident?.fullName || "Unknown Resident"}
                </h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getBadgeColor(billing.dueDate)}`}>
                  {getDaysText(billing.dueDate)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Room {billing.occupancy?.room?.unitNumber || "N/A"}, 
                {billing.occupancy?.room?.roomType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Unknown"}
              </p>
              <p className="text-xs font-medium text-gray-700 mt-1">
                RM {billing.amount?.toLocaleString() || 0}
              </p>
              <div className="mt-2 flex">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs bg-primary-50 text-primary-700 hover:bg-primary-100"
                  onClick={() => sendReminderMutation.mutate(billing.id)}
                  disabled={sendReminderMutation.isPending}
                >
                  Send Reminder
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>No upcoming renewals</p>
          </div>
        )}
      </div>
      
      {sortedRenewals.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 text-right">
          <button className="text-sm font-medium text-primary-600 hover:text-primary-800">
            View All Renewals
          </button>
        </div>
      )}
    </Card>
  );
}
