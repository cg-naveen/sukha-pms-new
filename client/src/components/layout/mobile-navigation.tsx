import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Building2,
  DollarSign,
  MoreHorizontal
} from "lucide-react";

export default function MobileNavigation() {
  const pathname = usePathname();
  
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Residents', href: '/residents', icon: Users },
    { name: 'Rooms', href: '/rooms', icon: Building2 },
    { name: 'Billing', href: '/billing', icon: DollarSign },
    { name: 'More', href: '/more', icon: MoreHorizontal },
  ];
  
  return (
    <div className="mobile-nav fixed bottom-0 w-full bg-white border-t border-gray-200 z-10">
      <div className="flex items-center justify-around py-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href === '/more' ? '/visitors' : item.href}
            className={cn(
              "flex flex-col items-center px-3 py-1",
              pathname === item.href || (item.href === '/more' && location === '/visitors')
                ? "text-primary-600"
                : "text-gray-600"
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs mt-1">{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
