import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Plus, Download } from "lucide-react";

interface PayslipRecord {
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
  created_at: string;
}

export default function PayrollManagement() {
  const { toast } = useToast();
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadAllPayslips();
  }, [filterStatus]);

  const loadAllPayslips = async () => {
    try {
      setLoading(true);
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
          created_at,
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('payment_status', filterStatus);
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
          payment_status: item.payment_status,
          created_at: item.created_at
        }));
        setPayslips(formattedData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải dữ liệu';
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayslip = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa phiếu lương này?')) return;

    try {
      const { error } = await supabase
        .from('salaries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Phiếu lương đã được xóa"
      });

      loadAllPayslips();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể xóa phiếu lương';
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMessage
      });
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nhân Viên', 'Kỳ Lương', 'Lương Cơ Bản', 'Phụ Cấp', 'Thưởng', 'Khấu Trừ', 'Thuế', 'Lương Ròng', 'Trạng Thái'];
    const rows = filteredPayslips.map(p => [
      p.employee_name,
      `${new Date(p.pay_period_start).toLocaleDateString('vi-VN')} - ${new Date(p.pay_period_end).toLocaleDateString('vi-VN')}`,
      p.base_salary,
      p.allowances,
      p.bonus,
      p.deductions,
      p.tax_amount,
      p.net_salary,
      p.payment_status
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Thành công",
      description: "Dữ liệu đã được xuất CSV"
    });
  };

  const filteredPayslips = payslips.filter(payslip =>
    payslip.employee_name.toLowerCase().includes(searchTerm.toLowerCase())
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

  const totalPayroll = payslips.reduce((sum, p) => sum + p.net_salary, 0);
  const totalEmployees = new Set(payslips.map(p => p.user_id)).size;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng Chi Lương</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayroll)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Số Nhân Viên</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lương Trung Bình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalEmployees > 0 ? formatCurrency(totalPayroll / totalEmployees) : formatCurrency(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Tìm kiếm nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">Tất Cả Trạng Thái</option>
                <option value="pending">Chờ Xử Lý</option>
                <option value="paid">Đã Thanh Toán</option>
                <option value="failed">Thất Bại</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Xuất CSV
              </Button>
              <Button
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Thêm Phiếu Lương
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quản Lý Phiếu Lương</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayslips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Chưa có phiếu lương nào</p>
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
                    <TableHead>Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium">{payslip.employee_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(payslip.pay_period_start)} - {formatDate(payslip.pay_period_end)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(payslip.base_salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payslip.allowances)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payslip.bonus)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payslip.deductions)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(payslip.net_salary)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          payslip.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          payslip.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payslip.payment_status === 'paid' ? 'Đã Thanh Toán' :
                           payslip.payment_status === 'pending' ? 'Chờ Xử Lý' : 'Thất Bại'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePayslip(payslip.id)}
                            className="gap-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
