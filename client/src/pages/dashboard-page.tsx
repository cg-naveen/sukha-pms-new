import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import StatCard from "@/components/dashboard/stat-card";
import RecentActivity from "@/components/dashboard/recent-activity";
import UpcomingRenewals from "@/components/dashboard/upcoming-renewals";
import { useAuth } from "@/hooks/use-auth";
import { ArrowUp, Users, Home, Calendar, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user } = useAuth();
  
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });
  
  const { data: upcomingBillings, isLoading: billingsLoading } = useQuery({
    queryKey: ["/api/billings/upcoming/30"],
  });

  return (
    <MainLayout title="Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Welcome back, {user?.fullName || 'User'}</h1>
        <p className="text-gray-600">Here's what's happening with your property today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Residents"
              value={dashboardStats?.residentCount || 0}
              icon={<Users className="h-6 w-6 text-primary" />}
              change={
                <span className="ml-2 text-sm text-secondary-500 font-medium">
                  <ArrowUp className="inline-block w-3 h-3" />
                  <span>+4%</span>
                </span>
              }
            />
            
            <StatCard
              title="Room Occupancy"
              value={`${dashboardStats?.occupancyRate || 0}%`}
              icon={<Home className="h-6 w-6 text-primary" />}
              change={
                <span className="ml-2 text-sm text-secondary-500 font-medium">
                  <ArrowUp className="inline-block w-3 h-3" />
                  <span>+2%</span>
                </span>
              }
            />
            
            <StatCard
              title="Pending Renewals"
              value={dashboardStats?.pendingRenewals || 0}
              icon={<Calendar className="h-6 w-6 text-warning-500" />}
              change={
                <span className="ml-2 text-sm text-gray-500 font-medium">
                  next 30 days
                </span>
              }
            />
            
            <StatCard
              title="Visitor Requests"
              value={dashboardStats?.visitorRequests || 0}
              icon={<UserPlus className="h-6 w-6 text-primary" />}
              change={
                <span className="ml-2 text-sm text-destructive font-medium">
                  <span className="inline-block w-3 h-3">!</span>
                  <span>Needs approval</span>
                </span>
              }
            />
          </>
        )}
      </div>

      {/* Activity and Renewals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity 
            activities={dashboardStats?.recentActivity || []}
            isLoading={isLoading}
          />
        </div>
        
        <div>
          <UpcomingRenewals 
            renewals={upcomingBillings || []}
            isLoading={billingsLoading}
          />
        </div>
      </div>
    </MainLayout>
  );
}
