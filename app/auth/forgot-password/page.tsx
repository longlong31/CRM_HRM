"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/hooks/use-translation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyRound, Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { requestPasswordResetAction } = await import("@/app/actions/auth-actions")
      const result = await requestPasswordResetAction(email)

      if (!result.success) {
        toast({
          title: "Lỗi",
          description: result.error || "Không thể gửi email đặt lại mật khẩu.",
          variant: "destructive",
        })
        return
      }

      setEmailSent(true)
      toast({
        title: "Thành công",
        description: "Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.",
      })
    } catch (error) {
      console.error("Error requesting password reset:", error)
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi gửi yêu cầu.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Logo & Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Life OS</h1>
              <p className="text-sm text-muted-foreground">Enterprise Management</p>
            </div>
          </div>

          {emailSent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Email Đã Gửi</h2>
                <p className="text-muted-foreground">Chúng tôi đã gửi liên kết đặt lại mật khẩu đến:</p>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                <p>Vui lòng kiểm tra hộp thư của bạn và nhấp vào liên kết để đặt lại mật khẩu.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false)
                  setEmail("")
                }}
                className="w-full"
              >
                Gửi Lại
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Đặt Lại Mật Khẩu</h2>
                <p className="text-muted-foreground">Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 h-10"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("loading")}
                    </>
                  ) : (
                    "Gửi Liên Kết Đặt Lại"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Back to Login */}
          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("backToLogin")}
          </Link>
        </motion.div>
      </div>

      {/* Right side - Image/Gradient */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-purple-700 via-emerald-600 to-teal-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6 text-center"
          >
            <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto">
              <KeyRound className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-bold">Bảo mật tài khoản</h2>
            <p className="text-xl text-white/90 max-w-md">
              Đặt lại mật khẩu của bạn một cách an toàn chỉ trong vài bước.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
