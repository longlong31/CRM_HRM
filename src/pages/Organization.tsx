import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { getUserRole, getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamsManagement from "@/components/organization/TeamsManagement";
import ShiftsManagement from "@/components/organization/ShiftsManagement";
import UsersManagement from "@/components/organization/UsersManagement";
import AttendanceManagement from "@/components/organization/AttendanceManagement";
import SalaryManagement from "@/components/organization/SalaryManagement";
import SalaryStatistics from "@/components/organization/SalaryStatistics";

const Organization = () => {
 // Khởi tạo state role (vai trò) mặc định là 'staff' (nhân viên)
 const [role, setRole] = useState<UserRole>('staff');

 useEffect(() => {
  // Hàm bất đồng bộ để tải vai trò của người dùng
  const loadRole = async () => {
   // Lấy người dùng hiện tại
   const user = await getCurrentUser();
   // Nếu không có người dùng, thoát
   if (!user) return;
   // Lấy vai trò của người dùng dựa trên ID
   const userRole = await getUserRole(user.id);
   // Cập nhật state role
   setRole(userRole);
  };
  // Chạy hàm tải vai trò
  loadRole();
 }, []); // Chạy chỉ một lần sau khi render ban đầu

 // Kiểm tra xem người dùng có phải là admin không
 if (role !== 'admin') {
  return (
   // Hiển thị layout Dashboard
   <DashboardLayout role={role}>
    <div className="text-center py-12">
     <h2 className="text-2xl font-bold">Truy Cập Bị Từ Chối</h2>
     <p className="text-muted-foreground mt-2">Chỉ quản trị viên (admin) mới có thể truy cập trang này.</p>
    </div>
   </DashboardLayout>
  );
 }

  return (
    <DashboardLayout role={role}>
      <div className="space-y-4 md:space-y-6 animate-fade-in pb-20 md:pb-6">
        <div className="mb-2">
          <h1 className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent text-2xl md:text-3xl lg:text-4xl">
            Quản Lý Tổ Chức
          </h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">Quản lý đội nhóm, người dùng, ca làm, chấm công và lương</p>
        </div>

        <Tabs defaultValue="teams" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
            <TabsTrigger value="teams" className="data-[state=active]:bg-primary text-xs md:text-sm">Đội nhóm</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary text-xs md:text-sm">Người dùng</TabsTrigger>
            <TabsTrigger value="shifts" className="data-[state=active]:bg-primary text-xs md:text-sm">Ca làm</TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-primary text-xs md:text-sm">Chấm công</TabsTrigger>
            <TabsTrigger value="salary" className="data-[state=active]:bg-primary text-xs md:text-sm">Lương</TabsTrigger>
            <TabsTrigger value="statistics" className="data-[state=active]:bg-primary text-xs md:text-sm">Thống kê</TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="mt-6">
            <TeamsManagement />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UsersManagement />
          </TabsContent>
          <TabsContent value="shifts" className="mt-6">
            <ShiftsManagement />
          </TabsContent>
          <TabsContent value="attendance" className="mt-6">
            <AttendanceManagement />
          </TabsContent>
          <TabsContent value="salary" className="mt-6">
            <SalaryManagement />
          </TabsContent>
          <TabsContent value="statistics" className="mt-6">
            <SalaryStatistics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Organization; // Xuất component Organization
