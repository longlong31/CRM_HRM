import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText } from "lucide-react";
import { UserRole } from "@/lib/auth";

interface MyPayslipsProps {
  userId: string;
  role: UserRole;
}

interface Payslip {
  id: string;
  user_id: string;
  base_salary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  tax_amount: number;
  net_salary: number;
  pay_period_start: string;
  pay_period_end: string;
  payment_date: string;
  payment_status: string;
  notes: string;
  created_at: string;
}

export default function MyPayslips({ userId, role }: MyPayslipsProps) {
  const { toast } = useToast();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSalary, setTotalSalary] = useState(0);

  useEffect(() => {
    if (!userId) return;
    loadMyPayslips();
  }, [userId]);

  const loadMyPayslips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .eq('user_id', userId)
        .order('pay_period_start', { ascending: false });

      if (error) throw error;

      if (data) {
        setPayslips(data);
        const total = data.reduce((sum, p) => sum + (p.net_salary || 0), 0);
        setTotalSalary(total);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể tải phiếu lương';
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (payslip: Payslip) => {
    // TODO: Implement PDF generation
    toast({
      title: "Thông báo",
      description: "Tính năng tải PDF sẽ được cập nhật sớm"
    });
  };

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
        <p className="text-muted-foreground">Đang tải phiếu lương...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tổng Lương Ròng</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSalary)}</div>
            <p className="text-xs text-muted-foreground mt-2">{payslips.length} tháng</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lương Cơ Bản Trung Bình</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payslips.length > 0 
                ? formatCurrency(payslips.reduce((sum, p) => sum + p.base_salary, 0) / payslips.length)
                : formatCurrency(0)
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Phiếu Lương Gần Nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {payslips.length > 0 ? formatCurrency(payslips[0].net_salary) : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {payslips.length > 0 ? `Tháng ${new Date(payslips[0].pay_period_start).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}` : "Chưa có"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payslips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chi tiết Phiếu Lương</CardTitle>
        </CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có phiếu lương nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kỳ Lương</TableHead>
                    <TableHead className="text-right">Lương Cơ Bản</TableHead>
                    <TableHead className="text-right">Phụ Cấp</TableHead>
                    <TableHead className="text-right">Thưởng</TableHead>
                    <TableHead className="text-right">Khấu Trừ</TableHead>
                    <TableHead className="text-right">Thuế</TableHead>
                    <TableHead className="text-right">Lương Ròng</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead>Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell>
                        <div className="font-medium">
                          {formatDate(payslip.pay_period_start)} - {formatDate(payslip.pay_period_end)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(payslip.base_salary)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payslip.allowances)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payslip.bonus)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payslip.deductions)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payslip.tax_amount)}</TableCell>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(payslip)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Tải</span>
                        </Button>
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
