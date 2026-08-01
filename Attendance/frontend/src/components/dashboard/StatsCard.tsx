import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  variant?: "default" | "success" | "destructive";
}

export const StatsCard = memo(function StatsCard({ title, value, icon, description, variant = "default" }: StatsCardProps) {
  const iconColors = {
    default: "text-primary",
    success: "text-emerald-500",
    destructive: "text-red-500",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={iconColors[variant]}>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
});

interface TodaySummaryProps {
  present: number;
  absent: number;
  percentage: number;
}

export const TodaySummary = memo(function TodaySummary({ present, absent, percentage }: TodaySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Attendance Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-emerald-500">{present}</p>
            <p className="text-sm text-muted-foreground">Present</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-500">{absent}</p>
            <p className="text-sm text-muted-foreground">Absent</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">{percentage}%</p>
            <p className="text-sm text-muted-foreground">Attendance</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const RecentRecordsSkeleton = memo(function RecentRecordsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-pulse">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
          <div className="h-6 w-16 bg-muted rounded-full" />
        </div>
      ))}
    </div>
  );
});
