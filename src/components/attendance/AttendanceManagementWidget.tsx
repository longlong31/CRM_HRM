import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Users, Loader2 } from "lucide-react";
import { format, isToday, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, getUserRole } from "@/lib/auth";

interface AttendanceRecord {
  id: string;
  user_id: string;
  timestamp: string;
  shift_type: 'morning' | 'afternoon' | 'overtime';
  type: 'check_in' | 'check_out';
  status?: 'pending' | 'checked_in' | 'completed' | 'absent';
  location: string | null;
  notes: string | null;
  is_leave?: boolean;
  leave_type?: 'annual' | 'sick' | 'unpaid' | null;
}

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface DailyAttendance {
  user_id: string;
  date: string;
  user: UserProfile | null;
  morning_check_in: string | null;
  morning_check_out: string | null;
  afternoon_check_in: string | null;
  afternoon_check_out: string | null;
  overtime_check_in: string | null;
  overtime_check_out: string | null;
  is_leave: boolean;
  leave_type: string | null;
}

const SHIFT_TIMES = {
  morning: { label: 'Sáng', start: '08:00', end: '11:30' },
  afternoon: { label: 'Chiều', start: '13:00', end: '17:00' },
  overtime: { label: 'Tăng ca', start: '17:00', end: '19:00' }
};

const AttendanceManagementWidget = () => {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendance[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    const initUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
        const role = await getUserRole(user.id);
        const isAdminOrLeader = role === 'admin' || role === 'leader' || role === 'hr';
        setIsAdmin(isAdminOrLeader);
        
        if (isAdminOrLeader) {
          await fetchAllUsers();
          setSelectedUserId(user.id);
        }
      }
    };
    initUser();
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .order('last_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Lỗi tải dữ liệu",
        description: "Không thể tải danh sách nhân viên",
      });
    }
  }, [toast]);

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      setLoading(true);
      const userIdToFetch = isAdmin ? (selectedUserId || userId) : userId;

      let query = supabase
        .from('attendance')
        .select('*')
        .eq('user_id', userIdToFetch)
        .gte('timestamp', `${startDate}T00:00:00`)
        .lte('timestamp', `${endDate}T23:59:59`)
        .order('timestamp', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Group by date and user
      const grouped: { [key: string]: DailyAttendance } = {};
      
      (data || []).forEach((record: AttendanceRecord) => {
        const date = record.timestamp.split('T')[0];
        const key = `${userIdToFetch}-${date}`;

        if (!grouped[key]) {
          grouped[key] = {
            user_id: userIdToFetch,
            date,
            user: null,
            morning_check_in: null,
            morning_check_out: null,
            afternoon_check_in: null,
            afternoon_check_out: null,
            overtime_check_in: null,
            overtime_check_out: null,
            is_leave: record.is_leave || false,
            leave_type: record.leave_type || null,
          };
        }

        if (record.type === 'check_in') {
          grouped[key][`${record.shift_type}_check_in` as keyof DailyAttendance] = record.timestamp;
        } else {
          grouped[key][`${record.shift_type}_check_out` as keyof DailyAttendance] = record.timestamp;
        }
      });

      setAttendanceRecords(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        variant: "destructive",
        title: "Lỗi tải dữ liệu",
        description: "Không thể tải lịch sử chấm công",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, selectedUserId, startDate, endDate, isAdmin, toast]);

  useEffect(() => {
    if (isAdmin || userId) {
      fetchAttendanceHistory();
    }
  }, [isAdmin, userId, fetchAttendanceHistory]);

  const getAttendanceStatus = (morning_check_in: string | null, morning_check_out: string | null, is_leave: boolean) => {
    if (is_leave) return { label: 'Nghỉ phép', color: 'bg-yellow-100 text-yellow-700' };
    if (!morning_check_in) return { label: 'Vắng mặt', color: 'bg-red-100 text-red-700' };
    if (morning_check_in && morning_check_out) return { label: 'Đầy đủ', color: 'bg-green-100 text-green-700' };
    return { label: 'Chưa hoàn thành', color: 'bg-blue-100 text-blue-700' };
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
          >
            ← Trước
          </Button>
          <h3 className="font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
          >
            Sau →
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
            <div key={day} className="font-bold text-center text-sm py-2">
              {day}
            </div>
          ))}

          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const attendance = attendanceRecords.find(a => a.date === dateStr);
            const status = attendance ? getAttendanceStatus(
              attendance.morning_check_in,
              attendance.morning_check_out,
              attendance.is_leave
            ) : null;

            return (
              <div
                key={dateStr}
                className={`p-2 text-center text-xs rounded border ${
                  !isSameMonth(day, currentMonth) ? 'opacity-30' : ''
                } ${status ? status.color : 'bg-gray-100'}`}
              >
                <div className="font-semibold">{format(day, 'd')}</div>
                {status && (
                  <div className="text-xs mt-1 truncate">{status.label}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h3 className="text-xl font-heading font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Quản lý Chấm công
        </h3>

        {/* FILTERS */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Bộ lọc</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee-select">Nhân viên</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger id="employee-select">
                      <SelectValue placeholder="Chọn nhân viên" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.last_name} {user.first_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-date">Từ ngày</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">Đến ngày</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-status">Trạng thái</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="present">Đầy đủ</SelectItem>
                      <SelectItem value="absent">Vắng mặt</SelectItem>
                      <SelectItem value="leave">Nghỉ phép</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* MAIN TABS */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="data-[state=active]:bg-primary">Lịch sử Chi tiết</TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-primary">Lịch Chấm công</TabsTrigger>
        </TabsList>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử Chấm công</CardTitle>
              <CardDescription>Danh sách chi tiết các lần chấm công trong khoảng thời gian được chọn</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : attendanceRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Không có dữ liệu chấm công</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Sáng (Vào/Ra)</TableHead>
                        <TableHead>Chiều (Vào/Ra)</TableHead>
                        <TableHead>Tăng ca (Vào/Ra)</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ghi chú</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record) => {
                        const status = getAttendanceStatus(
                          record.morning_check_in,
                          record.morning_check_out,
                          record.is_leave
                        );
                        
                        return (
                          <TableRow key={`${record.user_id}-${record.date}`}>
                            <TableCell className="font-medium">{format(new Date(record.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="text-sm">
                              {record.morning_check_in ? format(new Date(record.morning_check_in), 'HH:mm') : '—'} /
                              {record.morning_check_out ? format(new Date(record.morning_check_out), 'HH:mm') : '—'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {record.afternoon_check_in ? format(new Date(record.afternoon_check_in), 'HH:mm') : '—'} /
                              {record.afternoon_check_out ? format(new Date(record.afternoon_check_out), 'HH:mm') : '—'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {record.overtime_check_in ? format(new Date(record.overtime_check_in), 'HH:mm') : '—'} /
                              {record.overtime_check_out ? format(new Date(record.overtime_check_out), 'HH:mm') : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${status.color} border-0`}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {record.leave_type || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Lịch Chấm công
              </CardTitle>
              <CardDescription>Xem trực quan trạng thái chấm công theo tháng</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : (
                renderCalendarView()
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* LEGEND */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Chú giải</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100"></div>
              <span>Đầy đủ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100"></div>
              <span>Chưa hoàn thành</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100"></div>
              <span>Vắng mặt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100"></div>
              <span>Nghỉ phép</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceManagementWidget;
