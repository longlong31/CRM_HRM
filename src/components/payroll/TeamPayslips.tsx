import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Download, Users } from "lucide-react";
import { UserRole } from "@/lib/auth";

interface TeamPayslipsProps {
  role: UserRole;
  userId: string;
}

interface TeamMemberSalary {
  id: string;
  user_id: string;
  employee_name: string;
  base_salary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  tax_amount: number;
  net_salary: number;
  pay_period_start: string;
  pay_period_end: string;
  payment_status: string;
}

export default function TeamPayslips({ role, userId }: TeamPayslipsProps) {
  const { toast } = useToast();
  const [teamSalaries, setTeamSalaries] = useState<TeamMemberSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userId) return;
    loadTeamSalaries();
  }, [userId, role]);

  const loadTeamSalaries = async () => {
    try {
      setLoading(true);

      // For admin/HR: get all salaries
      // For leaders: get only their team's salaries
      let query = supabase
        .from('salaries')
        .select(`
          id,
          user_id,
          base_salary,
          allowances,
          bonus,
          deductions,
          tax_amount,
          net_salary,
          pay_period_start,
          pay_period_end,
          payment_status,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .order('pay_period_start', { ascending: false });

      // If leader, filter by team
      if (role === 'leader') {
        const { data: leaderProfile } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', userId)
          .single();

        if (leaderProfile?.team_id) {
          query = query.eq('profiles.team_id', leaderProfile.team_id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const formattedData = data.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          employee_name: item.profiles 
            ? `${item.profiles.first_name || ''} ${item.profiles.last_name || ''}`.trim()
            : 'Unknown',
          base_salary: item.base_salary,
          allowances: item.allowances,
          bonus: item.bonus,
          deductions: item.deductions,
          tax_amount: item.tax_amount,
          net_salary: item.net_salary,
          pay_period_start: item.pay_period_start,
          pay_period_end: item.pay_period_end,
          payment_status: item.payment_status
        }));
        setTeamSalaries(formattedData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải dữ liệu lương';
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSalaries = teamSalaries.filter(salary =>
    salary.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-muted-foreground">Đang tải dữ liệu...</p>
      </div>
    );
  }

  const totalTeamSalary = teamSalaries.reduce((sum, s) => sum + s.net_salary, 0);
  const uniqueEmployees = new Set(teamSalaries.map(s => s.user_id)).size;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng Lương Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalTeamSalary)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Số Nhân Viên</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trung Bình Lương</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uniqueEmployees > 0 ? formatCurrency(totalTeamSalary / uniqueEmployees) : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Salaries Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Phiếu Lương Team</CardTitle>
            <Input
              placeholder="Tìm kiếm nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredSalaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có dữ liệu lương</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nhân Viên</TableHead>
                    <TableHead>Kỳ Lương</TableHead>
                    <TableHead className="text-right">Lương Cơ Bản</TableHead>
                    <TableHead className="text-right">Phụ Cấp</TableHead>
                    <TableHead className="text-right">Thưởng</TableHead>
                    <TableHead className="text-right">Khấu Trừ</TableHead>
                    <TableHead className="text-right">Lương Ròng</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell className="font-medium">{salary.employee_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(salary.pay_period_start)} - {formatDate(salary.pay_period_end)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(salary.base_salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(salary.allowances)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(salary.bonus)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(salary.deductions)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(salary.net_salary)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          salary.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          salary.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {salary.payment_status === 'paid' ? 'Đã Thanh Toán' :
                           salary.payment_status === 'pending' ? 'Chờ Xử Lý' : 'Thất Bại'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
