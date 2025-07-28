import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: ReactNode;
}

export default function StatCard({ title, value, icon, change }: StatCardProps) {
  return (
    <Card className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <span className="text-primary-500">{icon}</span>
      </div>
      <div className="flex items-baseline">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && change}
      </div>
    </Card>
  );
}
