import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Receipt, UserCheck, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  type: string;
  data: any;
  timestamp: string;
}

interface RecentActivityProps {
  activities: Activity[];
  isLoading: boolean;
}

export default function RecentActivity({ activities = [], isLoading }: RecentActivityProps) {
  if (isLoading) {
    return (
      <Card className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-800">Recent Activity</h2>
          <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">View All</button>
        </div>
        <div className="divide-y divide-gray-200">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-6 py-4 flex items-start">
              <Skeleton className="flex-shrink-0 w-12 h-12 rounded-md mr-4" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="flex-shrink-0 h-4 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'visitor_request':
        return <UserPlus className="text-primary-600 w-5 h-5" />;
      case 'billing_due':
        return <Receipt className="text-warning-600 w-5 h-5" />;
      case 'visitor_approved':
        return <UserCheck className="text-secondary-600 w-5 h-5" />;
      case 'room_update':
        return <Building2 className="text-primary-600 w-5 h-5" />;
      default:
        return <UserPlus className="text-primary-600 w-5 h-5" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch(type) {
      case 'visitor_request':
        return 'bg-primary-100';
      case 'billing_due':
        return 'bg-warning-100';
      case 'visitor_approved':
        return 'bg-secondary-100';
      case 'room_update':
        return 'bg-primary-100';
      default:
        return 'bg-primary-100';
    }
  };

  const getActivityTitle = (activity: Activity) => {
    switch(activity.type) {
      case 'visitor_request':
        return 'New visitor request';
      case 'billing_due':
        return 'Billing reminder sent';
      case 'visitor_approved':
        return 'Visitor request approved';
      case 'room_update':
        return 'Room status updated';
      default:
        return 'Activity recorded';
    }
  };

  const getActivityDescription = (activity: Activity) => {
    switch(activity.type) {
      case 'visitor_request':
        return `${activity.data.fullName} requested to visit ${activity.data.resident?.fullName || 'a resident'}`;
      case 'billing_due':
        return `Billing for ${activity.data.occupancy?.resident?.fullName || 'a resident'} is due soon`;
      case 'visitor_approved':
        return `${activity.data.fullName} approved for visit`;
      case 'room_update':
        return `Room ${activity.data.unitNumber} status updated to ${activity.data.status}`;
      default:
        return 'No description available';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'recently';
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-800">Recent Activity</h2>
        <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">View All</button>
      </div>
      
      <div className="divide-y divide-gray-200">
        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <div key={index} className="px-6 py-4 flex items-start">
              <div className={`flex-shrink-0 ${getActivityColor(activity.type)} rounded-md p-2 mr-4`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{getActivityTitle(activity)}</p>
                <p className="text-sm text-gray-500">{getActivityDescription(activity)}</p>
              </div>
              <div className="flex-shrink-0 text-sm text-gray-500">{getTimeAgo(activity.timestamp)}</div>
            </div>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </Card>
  );
}
