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
  ChevronLeft
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Residents', href: '/residents', icon: Users },
    { name: 'Rooms', href: '/rooms', icon: Building2 },
    { name: 'Billing', href: '/billings', icon: Receipt },
    { name: 'Visitors', href: '/visitors', icon: UserPlus },
  ];
  
  const adminNavigation = [
    { name: 'Users', href: '/users', icon: User },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];
  
  return (
    <>
      {/* Mobile sidebar backdrop */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "sidebar bg-white w-64 h-full fixed left-0 top-0 shadow-lg z-50 transform transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Sukha Senior Resort</h1>
            <p className="text-xs text-gray-500">Management System</p>
          </div>
          <button 
            className="p-1 rounded-full hover:bg-gray-100 md:hidden"
            onClick={onClose}
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        <div className="px-2 py-4">
          <p className="text-xs font-medium text-gray-500 px-4 mb-2">MAIN</p>
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={cn(
                pathname === item.href
                  ? "sidebar-active"
                  : "text-gray-700 hover:bg-gray-100",
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-md mb-1"
              )}
            >
              <item.icon className="h-5 w-5 mr-2" />
              {item.name}
            </Link>
          ))}
          
          {isAdmin && (
            <>
              <p className="text-xs font-medium text-gray-500 px-4 mt-6 mb-2">ADMINISTRATION</p>
              {adminNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    pathname === item.href
                      ? "sidebar-active"
                      : "text-gray-700 hover:bg-gray-100",
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md mb-1"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-2" />
                  {item.name}
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}
