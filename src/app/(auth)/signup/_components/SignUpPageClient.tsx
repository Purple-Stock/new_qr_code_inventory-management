"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react"
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

export default function SignUpPage() {
  const router = useRouter()
  const { language, setLanguage, t } = useTranslation()
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Validation
    if (password !== confirmPassword) {
      setError(t.auth.signup.passwordMismatch)
      return
    }

    if (password.length < 6) {
      setError(t.auth.signup.passwordMinLength)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyName, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(t.auth.signup.signupError)
        setIsLoading(false)
        return
      }

      if (data.user?.id) {
        localStorage.setItem("userId", String(data.user.id))
        localStorage.setItem("userRole", data.user.role || "viewer")
      }

      setSuccess(t.auth.signup.accountCreatedRedirecting)
      router.push("/team_selection")
    } catch (err) {
      setError(t.auth.signup.unexpectedError)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4 relative">
      {/* Language Selector - Fixed top right */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
        <Label htmlFor="language" className="text-sm text-gray-600 font-medium">
          {t.auth.language}:
        </Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger id="language" className="w-[140px] bg-white border-gray-200">
            <SelectValue>
              {language === "en" && (
                <div className="flex items-center gap-2">
                  <span>🇺🇸</span>
                  <span>{t.auth.languageEnglish}</span>
                </div>
              )}
              {language === "fr" && (
                <div className="flex items-center gap-2">
                  <span>🇫🇷</span>
                  <span>{t.auth.languageFrench}</span>
                </div>
              )}
              {language === "pt-BR" && (
                <div className="flex items-center gap-2">
                  <span>🇧🇷</span>
                  <span>{t.auth.languagePortuguese}</span>
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
        <div className="bg-white rounded-2xl shadow-2xl p-10 border border-gray-100">
          {/* Logo and Branding */}
          <div className="text-center mb-10">
            <div className="inline-flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-2xl mb-4 shadow-lg">
                <svg
                  className="w-10 h-10 text-white"
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
              <h1 className="text-3xl font-bold text-[#6B21A8] uppercase tracking-tight mb-2">
                PURPLE STOCK
              </h1>
              <p className="text-sm text-gray-500 font-medium">
                {t.auth.appTagline}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-gray-600 text-base mb-6 text-center font-medium">
            {t.auth.signup.instructions}
          </p>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-6 border-l-4 border-l-red-500 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-700 text-sm font-medium">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="mb-6 border-l-4 border-l-green-500 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-700 text-sm font-medium">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-gray-700 font-semibold text-sm">
                {t.auth.signup.companyNameLabel}
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder={t.auth.signup.companyNamePlaceholder}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-11 border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                required
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">
                {t.auth.signup.emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.signup.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-semibold text-sm">
                {t.auth.signup.passwordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth.signup.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pr-10 border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? t.auth.signup.hidePassword : t.auth.signup.showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">{t.auth.signup.passwordMinHint}</p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-700 font-semibold text-sm">
                {t.auth.signup.confirmPasswordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.auth.signup.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 pr-10 border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                  aria-label={showConfirmPassword ? t.auth.signup.hidePassword : t.auth.signup.showPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign Up Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white font-semibold py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? t.auth.signup.creatingAccount : t.auth.signup.signUp}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-8 text-center">
            <span className="text-gray-600 text-sm">{t.auth.signup.alreadyHaveAccount} </span>
            <Link
              href="/"
              className="text-[#6B21A8] hover:text-[#7C3AED] font-semibold text-sm transition-colors"
            >
              {t.auth.signup.signInLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
