// src/components/auth/AuthLayout.tsx

import { Card, CardHeader, Tabs, TabsList, TabsTrigger } from "@/components/ui/card";
import { APP_NAME, LOGO_PATH } from "@/lib/constants"; // Giả định hằng số được chuyển sang file riêng

interface AuthLayoutProps {
    children: React.ReactNode;
    defaultTab: "login" | "signup";
    onTabChange: (value: string) => void;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, defaultTab, onTabChange }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-lg animate-fade-in">
                
                {/* --- HEADER/LOGO (Đã áp dụng Gradient Text) --- */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <img 
                            src={LOGO_PATH} 
                            alt="Logo Tổ chức" 
                            className="w-16 h-16 rounded-xl shadow-xl shadow-primary/30 object-contain"
                        />
                        <h1 className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight">
                            {APP_NAME}
                        </h1>
                    </div>
                </div>

                {/* --- CARD WRAPPER --- */}
                <Card className="shadow-2xl border-2 border-border/70 transform hover:shadow-primary/20 transition-all duration-300">
                    <Tabs defaultValue={defaultTab} className="w-full" onValueChange={onTabChange}>
                        
                        {/* Tab Headers */}
                        <CardHeader className="pt-6 pb-0">
                            <TabsList className="grid w-full grid-cols-2 h-12 text-lg">
                                <TabsTrigger value="login">Đăng nhập</TabsTrigger>
                                <TabsTrigger value="signup">Đăng ký</TabsTrigger> 
                            </TabsList>
                        </CardHeader>

                        {children}

                    </Tabs>
                </Card>
            </div>
        </div>
    );
};

export default AuthLayout;

// --- Lưu ý: Bạn cần tạo file src/lib/constants.ts với nội dung:
// export const APP_NAME = "MSC Center - HRM AI";
// export const LOGO_PATH = "/LOGO.PNG";