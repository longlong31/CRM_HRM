"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "@/hooks/use-translation"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyRound, Lock, CheckCircle2, Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasToken, setHasToken] = useState(false)
  const [checkingToken, setCheckingToken] = useState(true)

  useEffect(() => {
    // Check if user is coming from a password reset email link
    // The Supabase email link will include recovery token in the URL
    const verifySession = async () => {
      try {
        const { supabaseBrowser } = await import("@/lib/supabase/supabase")
        const { data } = await supabaseBrowser.auth.getSession()

        if (data?.session?.user) {
          setHasToken(true)
        } else {
          setHasToken(false)
        }
      } catch (error) {
        console.error("Error checking session:", error)
        setHasToken(false)
      } finally {
        setCheckingToken(false)
      }
    }

    verifySession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { updatePasswordWithTokenAction } = await import("@/app/actions/auth-actions")
      const result = await updatePasswordWithTokenAction(newPassword, confirmPassword)

      if (!result.success) {
        toast({
          title: "Lỗi",
          description: result.error || "Không thể cập nhật mật khẩu.",
          variant: "destructive",
        })
        return
      }

      setIsSuccess(true)
      toast({
        title: "Thành công",
        description: "Mật khẩu của bạn đã được cập nhật thành công.",
      })

      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
    } catch (error) {
      console.error("Error updating password:", error)
      toast({
        title: "Lỗi",
        description: "Đã xảy ra lỗi khi cập nhật mật khẩu.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-emerald-500" />
          <p className="text-muted-foreground">Đang xác minh phiên làm việc...</p>
        </div>
      </div>
    )
  }

  if (!hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6 text-center"
        >
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Phiên Hết Hạn</h2>
            <p className="text-muted-foreground">
              Liên kết đặt lại mật khẩu của bạn đã hết hạn hoặc không hợp lệ.
            </p>
          </div>
          <Link href="/auth/forgot-password" className="block">
            <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
              Yêu Cầu Liên Kết Mới
            </Button>
          </Link>
        </motion.div>
      </div>
    )
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

          {isSuccess ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Mật Khẩu Đã Cập Nhật</h2>
                <p className="text-muted-foreground">Mật khẩu của bạn đã được thay đổi thành công.</p>
              </div>
              <p className="text-sm text-muted-foreground">Đang chuyển hướng đến trang đăng nhập...</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Tạo Mật Khẩu Mới</h2>
                <p className="text-muted-foreground">Nhập mật khẩu mới của bạn.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Mật Khẩu Mới</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 h-10"
                      required
                      minLength={6}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Tối thiểu 6 ký tự</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác Nhận Mật Khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 h-10"
                      required
                      minLength={6}
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
                    "Cập Nhật Mật Khẩu"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Back to Login */}
          {!isSuccess && (
            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("backToLogin")}
            </Link>
          )}
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
            <h2 className="text-4xl font-bold">B���o mật tài khoản</h2>
            <p className="text-xl text-white/90 max-w-md">
              Tạo mật khẩu mới mạnh để bảo vệ tài khoản của bạn.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
