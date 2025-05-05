import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import TopBar from "./topbar";
import MobileNavigation from "./mobile-navigation";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
}

export default function MainLayout({ children, title }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto md:ml-64">
        <TopBar title={title} onMenuClick={toggleSidebar} />
        
        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
}
