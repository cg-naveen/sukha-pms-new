import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  Users,
  Building2,
  Receipt,
  UserPlus,
  User,
  Settings,
  ChevronUp,
  MoreHorizontal
} from "lucide-react";

export default function MobileNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showMore, setShowMore] = useState(false);
  
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  
  const mainNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Residents', href: '/residents', icon: Users },
    { name: 'Rooms', href: '/rooms', icon: Building2 },
    { name: 'Billing', href: '/billings', icon: Receipt },
    { name: 'Visitors', href: '/visitors', icon: UserPlus },
  ];
  
  const adminNavigation = isAdmin ? [
    { name: 'Users', href: '/users', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ] : [];
  
  const allNavigation = [...mainNavigation, ...adminNavigation];
  
  // Show first 4 items, then "More" if there are more items
  const visibleItems = allNavigation.slice(0, 4);
  const moreItems = allNavigation.slice(4);
  const hasMoreItems = moreItems.length > 0;
  
  const isActive = (href: string) => {
    if (href === '/billings' && pathname === '/billing') return true;
    return pathname === href;
  };
  
  return (
    <>
      {/* More menu overlay */}
      {showMore && hasMoreItems && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        />
      )}
      
      {/* More menu popup */}
      {showMore && hasMoreItems && (
        <div className="fixed bottom-20 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden shadow-lg">
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">More</span>
            <button
              onClick={() => setShowMore(false)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <ChevronUp className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <div className="py-2">
            {moreItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setShowMore(false)}
                className={cn(
                  "flex items-center px-4 py-3 text-sm",
                  isActive(item.href)
                    ? "text-primary-600 bg-primary-50"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Bottom Navigation Bar */}
      <div className="mobile-nav fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 z-30 md:hidden">
        <div className="flex items-stretch py-2 safe-area-bottom w-full">
          {visibleItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 flex-1 w-0",
                isActive(item.href)
                  ? "text-primary-600"
                  : "text-gray-600"
              )}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs mt-1 truncate text-center">{item.name}</span>
            </Link>
          ))}
          
          {hasMoreItems && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={cn(
                "flex flex-col items-center justify-center py-1 flex-1 w-0",
                showMore
                  ? "text-primary-600"
                  : "text-gray-600"
              )}
            >
              <MoreHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs mt-1">More</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
