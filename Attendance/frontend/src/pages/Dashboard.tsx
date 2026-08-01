import { useAttendanceSummary } from "@/hooks/useAttendance";
import { StatsCard, TodaySummary, RecentRecordsSkeleton } from "@/components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, TrendingUp, ClipboardCheck } from "lucide-react";

export function Dashboard() {
  const { data: summary, isLoading } = useAttendanceSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Students"
          value={summary?.totalStudents || 0}
          icon={<Users className="h-5 w-5" />}
          description="All registered students"
        />
        <StatsCard
          title="Present Today"
          value={summary?.presentToday || 0}
          icon={<UserCheck className="h-5 w-5" />}
          variant="success"
          description="Attended today"
        />
        <StatsCard
          title="Absent Today"
          value={summary?.absentToday || 0}
          icon={<UserX className="h-5 w-5" />}
          variant="destructive"
          description="Marked absent"
        />
        <StatsCard
          title="Attendance %"
          value={`${summary?.attendancePercentage || 0}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          description="Today's rate"
        />
      </div>

      <TodaySummary
        present={summary?.presentToday || 0}
        absent={summary?.absentToday || 0}
        percentage={summary?.attendancePercentage || 0}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary?.recentRecords && summary.recentRecords.length > 0 ? (
            <div className="space-y-3">
              {summary.recentRecords.map((record) => (
                <div key={record._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{record.studentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.registerNumber} • {record.subject}
                    </p>
                  </div>
                  <Badge variant={record.status === "present" ? "success" : "destructive"}>
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No attendance records for today</p>
              <p className="text-sm">Start by marking attendance</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
