"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n"
import { fetchApiJsonResult } from "@/lib/api-client"
import { ERROR_CODES } from "@/lib/errors"
import { BrandMark } from "@/components/brand/BrandMark"
import { LanguageSwitch } from "@/components/brand/LanguageSwitch"

export default function SignUpPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const getSignupErrorMessage = (errorCode?: string, fallbackMessage?: string) => {
    if (errorCode === ERROR_CODES.EMAIL_ALREADY_IN_USE) {
      return t.auth.signup.emailAlreadyInUse
    }

    return fallbackMessage || t.auth.signup.signupError
  }

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
      const result = await fetchApiJsonResult<{ user?: { id?: number; role?: string } }>(
        "/api/auth/signup",
        {
          method: "POST",
          body: { companyName, email, phone, password },
          fallbackError: t.auth.signup.unexpectedError,
        }
      )

      if (!result.ok) {
        setError(getSignupErrorMessage(result.error.errorCode, result.error.error))
        setIsLoading(false)
        return
      }

      if (result.data.user?.id) {
        localStorage.setItem("userId", String(result.data.user.id))
        localStorage.setItem("userRole", result.data.user.role || "viewer")
      }

      setSuccess(t.auth.signup.accountCreatedRedirecting)
      router.push("/team_selection")
    } catch (err) {
      setError(t.auth.signup.unexpectedError)
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas p-4 text-ink">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitch />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-xl border border-hairline bg-white p-8 shadow-rest sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandMark size={40} className="mb-4 text-brand" />
            <h1 className="text-[28px] font-medium leading-[1.15] text-ink">Purple Stock</h1>
            <p className="mt-1 text-sm text-ink-2">{t.auth.appTagline}</p>
          </div>

          {/* Instructions */}
          <p className="mb-6 text-sm text-ink-2">
            {t.auth.signup.instructions}
          </p>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-6 rounded-lg border-hairline bg-red-50">
              <AlertTriangle className="h-4 w-4 text-negative" />
              <AlertDescription className="text-sm text-negative">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="mb-6 rounded-lg border-hairline bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-positive" />
              <AlertDescription className="text-sm text-positive">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium text-ink">
                {t.auth.signup.companyNameLabel}
              </Label>
              <Input
                id="companyName"
                type="text"
                placeholder={t.auth.signup.companyNamePlaceholder}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-11"
                required
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-ink">
                {t.auth.signup.emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.signup.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-ink">
                {t.auth.signup.phoneLabel}
              </Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder={t.auth.signup.phonePlaceholder}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-ink">
                {t.auth.signup.passwordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth.signup.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                  aria-label={showPassword ? t.auth.signup.hidePassword : t.auth.signup.showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-ink-3">{t.auth.signup.passwordMinHint}</p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
                {t.auth.signup.confirmPasswordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.auth.signup.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
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
              className="mt-2 h-11 w-full"
            >
              {isLoading ? t.auth.signup.creatingAccount : t.auth.signup.signUp}
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center text-sm text-ink-2">
            <span>{t.auth.signup.alreadyHaveAccount} </span>
            <Link
              href="/"
              className="font-medium text-brand hover:text-brand-hover"
            >
              {t.auth.signup.signInLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
