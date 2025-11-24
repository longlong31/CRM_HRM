import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, XCircle, TrendingUp, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";

type ShiftType = 'morning' | 'afternoon' | 'overtime';

interface ShiftRecord {
  id: string;
  user_id: string;
  shift_type: ShiftType;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'pending' | 'checked_in' | 'completed' | 'absent';
  location: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

interface ShiftStats {
  totalShifts: number;
  completedShifts: number;
  pendingShifts: number;
  absentShifts: number;
}

const SHIFT_TIMES = {
  morning: { label: 'Buổi Sáng', start: '08:00', end: '11:30' },
  afternoon: { label: 'Buổi Chiều', start: '13:00', end: '17:00' },
  overtime: { label: 'Tăng Ca', start: '17:00', end: '19:00' }
};

const ShiftAttendanceWidget = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [todayRecords, setTodayRecords] = useState<ShiftRecord[]>([]);
  const [allRecords, setAllRecords] = useState<ShiftRecord[]>([]);
  const [stats, setStats] = useState<ShiftStats>({
    totalShifts: 0,
    completedShifts: 0,
    pendingShifts: 0,
    absentShifts: 0
  });
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>('today');

  const calculateStats = useCallback((records: ShiftRecord[]) => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const monthRecords = records.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= monthStart && recordDate <= monthEnd;
    });

    // Group by day (all shifts per day count as one work day)
    const shiftsByDay: { [key: string]: ShiftRecord[] } = {};
    monthRecords.forEach(r => {
      if (!shiftsByDay[r.date]) shiftsByDay[r.date] = [];
      shiftsByDay[r.date].push(r);
    });

    let completedShifts = 0;
    let pendingShifts = 0;
    let absentShifts = 0;

    Object.values(shiftsByDay).forEach(dayRecords => {
      // Check if all shifts for the day are completed
      const allCompleted = dayRecords.every(r => r.status === 'completed');
      const allAbsent = dayRecords.every(r => r.status === 'absent');
      const anyCheckedIn = dayRecords.some(r => r.status === 'checked_in');

      if (allAbsent) {
        absentShifts++;
      } else if (allCompleted) {
        completedShifts++;
      } else if (anyCheckedIn || dayRecords.some(r => r.status === 'pending')) {
        pendingShifts++;
      } else {
        absentShifts++;
      }
    });

    setStats({
      totalShifts: Object.keys(shiftsByDay).length,
      completedShifts,
      pendingShifts,
      absentShifts
    });
  }, []);

  const loadAllAttendance = useCallback(async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('shift_attendance')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .limit(100);

      if (error) {
        const errorMsg = error && typeof error === 'object' ? (error as any).message : String(error);
        console.error('Attendance query error:', errorMsg);
        throw new Error(errorMsg || 'Failed to load attendance');
      }
      setAllRecords(data || []);
      calculateStats(data || []);
    } catch (error) {
      let errorMessage = 'Không thể tải lịch sử chấm công';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      console.error('Error loading all attendance:', errorMessage);
    }
  }, [calculateStats]);

  const loadTodayAttendance = useCallback(async (uid: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('shift_attendance')
        .select('*')
        .eq('user_id', uid)
        .eq('date', today)
        .order('shift_type');

      if (error) {
        const errorMsg = error && typeof error === 'object' ? (error as any).message : String(error);
        console.error('Today attendance query error:', errorMsg);
        throw new Error(errorMsg || 'Failed to load today attendance');
      }
      setTodayRecords(data || []);
    } catch (error) {
      let errorMessage = 'Không thể tải chấm công hôm nay';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      console.error('Error loading today attendance:', errorMessage);
    }
  }, []);

  useEffect(() => {
    const initUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        await loadTodayAttendance(user.id);
        await loadAllAttendance(user.id);
      }
    };
    initUser();
  }, [loadTodayAttendance, loadAllAttendance]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('shift_attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_attendance',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadTodayAttendance(userId);
          loadAllAttendance(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadTodayAttendance, loadAllAttendance]);

  const getLocation = async (): Promise<string> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve(`${position.coords.latitude}, ${position.coords.longitude}`);
          },
          () => {
            resolve("Location unavailable");
          }
        );
      } else {
        resolve("Geolocation not supported");
      }
    });
  };

  const handleShiftCheckIn = async (shiftType: ShiftType) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const location = await getLocation();
      const today = new Date().toISOString().split('T')[0];
      const checkInTime = new Date().toISOString();

      const { data: existingRecord, error: fetchError } = await supabase
        .from('shift_attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .eq('shift_type', shiftType)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(fetchError.message);
      }

      if (existingRecord) {
        // Update existing record with check_in
        const { error: updateError } = await supabase
          .from('shift_attendance')
          .update({
            check_in: checkInTime,
            location,
            status: 'checked_in'
          })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('shift_attendance')
          .insert({
            user_id: userId,
            shift_type: shiftType,
            date: today,
            check_in: checkInTime,
            location,
            status: 'checked_in'
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Chấm công thành công",
        description: `Đã chấm công ${SHIFT_TIMES[shiftType].label} lúc ${format(new Date(), 'HH:mm')}`,
      });

      await loadTodayAttendance(userId);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Chấm công thất bại",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShiftCheckOut = async (shiftType: ShiftType) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const location = await getLocation();
      const today = new Date().toISOString().split('T')[0];
      const checkOutTime = new Date().toISOString();

      const { data: existingRecord, error: fetchError } = await supabase
        .from('shift_attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .eq('shift_type', shiftType)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(fetchError.message);
      }

      if (existingRecord) {
        // Update existing record with check_out
        const { error: updateError } = await supabase
          .from('shift_attendance')
          .update({
            check_out: checkOutTime,
            location,
            status: 'completed'
          })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Chấm công thành công",
        description: `Đã chấm công ra ${SHIFT_TIMES[shiftType].label} lúc ${format(new Date(), 'HH:mm')}`,
      });

      await loadTodayAttendance(userId);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Chấm công thất bại",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const renderShiftCard = (shiftType: ShiftType) => {
    const shiftInfo = SHIFT_TIMES[shiftType];
    const shiftRecord = todayRecords.find(r => r.shift_type === shiftType);
    const hasCheckIn = !!shiftRecord?.check_in;
    const hasCheckOut = !!shiftRecord?.check_out;

    let statusText = 'Chưa chấm';
    let color = 'bg-gray-100 text-gray-700';

    if (hasCheckIn && hasCheckOut) {
      statusText = 'Hoàn thành';
      color = 'bg-green-100 text-green-700';
    } else if (hasCheckIn && !hasCheckOut) {
      statusText = 'Đang làm';
      color = 'bg-blue-100 text-blue-700';
    }

    const isCompleted = hasCheckIn && hasCheckOut;

    return (
      <Card key={shiftType} className="overflow-hidden hover:shadow-medium transition-shadow">
        <CardContent className="p-3 md:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-heading font-semibold text-base md:text-lg">{shiftInfo.label}</h4>
              <p className="text-xs md:text-sm text-muted-foreground">
                {shiftInfo.start} - {shiftInfo.end}
              </p>
            </div>
            <Badge className={`${color} border-0 text-xs flex-shrink-0`}>
              {statusText}
            </Badge>
          </div>

          {(hasCheckIn || hasCheckOut) && (
            <div className="text-xs md:text-sm space-y-1 bg-muted/50 rounded p-2">
              {shiftRecord?.check_in && (
                <p className="text-foreground">
                  <span className="font-medium">Vào:</span> {(() => {
                    const isValidDate = (dateString: string | null): boolean => {
                      if (!dateString) return false;
                      const date = new Date(dateString);
                      return date instanceof Date && !isNaN(date.getTime());
                    };
                    if (!isValidDate(shiftRecord.check_in)) return '---';
                    try {
                      return format(new Date(shiftRecord.check_in), 'HH:mm');
                    } catch {
                      return '---';
                    }
                  })()}
                </p>
              )}
              {shiftRecord?.check_out && (
                <p className="text-foreground">
                  <span className="font-medium">Ra:</span> {(() => {
                    const isValidDate = (dateString: string | null): boolean => {
                      if (!dateString) return false;
                      const date = new Date(dateString);
                      return date instanceof Date && !isNaN(date.getTime());
                    };
                    if (!isValidDate(shiftRecord.check_out)) return '---';
                    try {
                      return format(new Date(shiftRecord.check_out), 'HH:mm');
                    } catch {
                      return '---';
                    }
                  })()}
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 text-xs md:text-sm h-9 md:h-10"
              disabled={hasCheckIn || isLoading}
              onClick={() => handleShiftCheckIn(shiftType)}
            >
              {isLoading ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" /> : <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />}
              Vào
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs md:text-sm h-9 md:h-10"
              disabled={!hasCheckIn || hasCheckOut || isLoading}
              onClick={() => handleShiftCheckOut(shiftType)}
            >
              {isLoading ? <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" /> : <XCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />}
              Ra
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const filteredRecords = allRecords.filter(record => {
    const recordDate = new Date(record.date);
    const today = new Date().toISOString().split('T')[0];

    if (activeTab === 'today') {
      return record.date === today;
    } else if (activeTab === 'week') {
      return recordDate >= startOfWeek(new Date()) && recordDate <= endOfWeek(new Date());
    } else {
      return recordDate >= startOfMonth(new Date()) && recordDate <= endOfMonth(new Date());
    }
  });

  return (
    <div className="space-y-6">
      {/* Today's Shifts */}
      <div>
        <h3 className="text-xl font-heading font-semibold mb-4 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Chấm công hôm nay
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(SHIFT_TIMES) as ShiftType[]).map(shiftType => renderShiftCard(shiftType))}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="shadow-soft">
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Tổng ca làm</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold font-heading">{stats.totalShifts}</div>
            <p className="text-xs text-muted-foreground mt-1">Tháng này</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Hoàn thành</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold font-heading text-green-600">{stats.completedShifts}</div>
            <p className="text-xs text-success mt-1">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Tốt
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Chờ xử lý</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold font-heading text-blue-600">{stats.pendingShifts}</div>
            <p className="text-xs text-muted-foreground mt-1">Đang làm</p>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-2 md:pb-3 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">Vắng mặt</CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold font-heading text-red-600">{stats.absentShifts}</div>
            <p className="text-xs text-destructive mt-1">Cần chú ý</p>
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="font-heading">Lịch sử chấm công</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'week' | 'month')} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today" className="data-[state=active]:bg-primary">Hôm nay</TabsTrigger>
              <TabsTrigger value="week" className="data-[state=active]:bg-primary">Tuần này</TabsTrigger>
              <TabsTrigger value="month" className="data-[state=active]:bg-primary">Tháng này</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-3 mt-4">
              {filteredRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Không có lịch sử chấm công</p>
              ) : (
                filteredRecords.map((record) => {
                  const isValidDate = (dateString: string | null): boolean => {
                    if (!dateString) return false;
                    const date = new Date(dateString);
                    return date instanceof Date && !isNaN(date.getTime());
                  };

                  const formatDate = (dateString: string | null, formatStr: string) => {
                    if (!isValidDate(dateString)) return '---';
                    try {
                      return format(new Date(dateString), formatStr);
                    } catch {
                      return '---';
                    }
                  };

                  const shiftInfo = SHIFT_TIMES[record.shift_type];
                  const statusColor =
                    record.status === 'completed' ? 'bg-green-100 text-green-700' :
                    record.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                    record.status === 'absent' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700';
                  const statusText =
                    record.status === 'completed' ? 'Hoàn thành' :
                    record.status === 'checked_in' ? 'Đang làm' :
                    record.status === 'absent' ? 'Vắng mặt' :
                    'Chờ xử lý';

                  return (
                    <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{shiftInfo.label}</p>
                          <Badge variant="outline" className="text-xs">
                            {formatDate(record.date, 'MMM dd')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.check_in && record.check_out && isValidDate(record.check_in) && isValidDate(record.check_out)
                            ? `${formatDate(record.check_in, 'HH:mm')} - ${formatDate(record.check_out, 'HH:mm')}`
                            : record.check_in && isValidDate(record.check_in)
                            ? `Vào: ${formatDate(record.check_in, 'HH:mm')}`
                            : 'Chưa chấm công'
                          }
                        </p>
                      </div>
                      <Badge className={`${statusColor} border-0`}>{statusText}</Badge>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShiftAttendanceWidget;
