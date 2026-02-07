"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n"
import { parseApiResult } from "@/lib/api-error"

export default function LoginPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const result = await parseApiResult<{ user?: { id?: number; role?: string } }>(
        response,
        t.auth.login.unexpectedError
      )

      if (!result.ok) {
        setError(t.auth.login.invalidCredentials)
        setIsLoading(false)
        return
      }

      // Backward compatibility while legacy client flows still read localStorage.
      if (result.data.user?.id) {
        localStorage.setItem("userId", String(result.data.user.id))
        localStorage.setItem("userRole", result.data.user.role || "viewer")
      }

      // Redirect to team selection
      router.push("/team_selection")
    } catch (err) {
      setError(t.auth.login.unexpectedError)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-3 sm:p-4 relative">
      {/* Language Selector - Fixed top right */}
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex items-center gap-1 sm:gap-2 z-10">
        <Label htmlFor="language" className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:inline">
          {t.auth.language}:
        </Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger id="language" className="w-[100px] sm:w-[140px] bg-white border-gray-200 text-xs sm:text-sm h-8 sm:h-10">
            <SelectValue>
              {language === "en" && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-sm sm:text-base">🇺🇸</span>
                  <span className="hidden sm:inline">{t.auth.languageEnglish}</span>
                  <span className="sm:hidden">EN</span>
                </div>
              )}
              {language === "fr" && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-sm sm:text-base">🇫🇷</span>
                  <span className="hidden sm:inline">{t.auth.languageFrench}</span>
                  <span className="sm:hidden">FR</span>
                </div>
              )}
              {language === "pt-BR" && (
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-sm sm:text-base">🇧🇷</span>
                  <span className="hidden sm:inline">{t.auth.languagePortuguese}</span>
                  <span className="sm:hidden">PT</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">
              <div className="flex items-center gap-2">
                <span>🇺🇸</span>
                <span>{t.auth.languageEnglish}</span>
              </div>
            </SelectItem>
            <SelectItem value="fr">
              <div className="flex items-center gap-2">
                <span>🇫🇷</span>
                <span>{t.auth.languageFrench}</span>
              </div>
            </SelectItem>
            <SelectItem value="pt-BR">
              <div className="flex items-center gap-2">
                <span>🇧🇷</span>
                <span>{t.auth.languagePortuguese}</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Card */}
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10 border border-gray-100">
          {/* Logo and Branding */}
          <div className="text-center mb-6 sm:mb-8 md:mb-10">
            <div className="inline-flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#6B21A8] uppercase tracking-tight mb-1 sm:mb-2">
                PURPLE STOCK
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                {t.auth.appTagline}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6 text-center font-medium">
            {t.auth.login.instructions}
          </p>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-4 sm:mb-6 border-l-4 border-l-red-500 bg-red-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              <AlertDescription className="text-red-700 text-xs sm:text-sm font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}
          {!error && (
            <Alert variant="destructive" className="mb-4 sm:mb-6 border-l-4 border-l-red-500 bg-red-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
              <AlertDescription className="text-red-700 text-xs sm:text-sm font-medium">
                {t.auth.login.mustSignInOrSignUp}
              </AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">
                {t.auth.login.emailLabel}
                </Label>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.login.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 sm:h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-semibold text-sm">
                {t.auth.login.passwordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth.login.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 sm:h-11 pr-12 sm:pr-10 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors p-1 touch-manipulation"
                  aria-label={showPassword ? t.auth.login.hidePassword : t.auth.login.showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 sm:h-5 sm:w-5" />
                  ) : (
                    <Eye className="h-5 w-5 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white font-semibold py-5 sm:py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6 text-base sm:text-base touch-manipulation min-h-[48px]"
            >
              {isLoading ? t.auth.login.signingIn : t.auth.login.signIn}
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 sm:mt-8 text-center">
            <span className="text-gray-600 text-xs sm:text-sm">{t.auth.login.dontHaveAccount} </span>
            <Link
              href="/signup"
              className="text-[#6B21A8] hover:text-[#7C3AED] font-semibold text-xs sm:text-sm transition-colors"
            >
              {t.auth.login.signUpLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
