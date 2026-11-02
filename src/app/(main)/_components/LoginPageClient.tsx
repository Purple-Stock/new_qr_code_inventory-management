"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useTranslation } from "@/lib/i18n"
import { fetchApiJsonResult } from "@/lib/api-client"
import { BrandMark } from "@/components/brand/BrandMark"
import { LanguageSwitch } from "@/components/brand/LanguageSwitch"
import { ui } from "@/lib/ui"

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
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
      const result = await fetchApiJsonResult<{ user?: { id?: number; role?: string } }>(
        "/api/auth/login",
        {
          method: "POST",
          body: { email, password },
          fallbackError: t.auth.login.unexpectedError,
        }
      )

      if (!result.ok) {
        setError(
          result.error.status === 401
            ? t.auth.login.invalidCredentials
            : t.auth.login.unexpectedError
        )
        setIsLoading(false)
        return
      }

      if (result.data.user?.id) {
        localStorage.setItem("userId", String(result.data.user.id))
        localStorage.setItem("userRole", result.data.user.role || "viewer")
      }

      router.push("/team_selection")
    } catch (err) {
      setError(t.auth.login.unexpectedError)
      setIsLoading(false)
    }
  }

  return (
    <div className={`${ui.page} relative flex items-center justify-center p-4`}>
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitch />
      </div>

      <div className="w-full max-w-md">
        <div className={`${ui.card} p-8 sm:p-10`}>
          <div className="mb-8 flex flex-col items-center text-center">
            <BrandMark size={40} className="mb-4 text-brand" />
            <h1 className="text-[28px] font-medium leading-[1.15] text-ink">Purple Stock</h1>
            <p className="mt-1 text-sm text-ink-2">{t.auth.appTagline}</p>
          </div>

          <p className="mb-6 text-sm text-ink-2">{t.auth.login.instructions}</p>

          {error ? (
            <Alert variant="destructive" className="mb-6 rounded-lg border-hairline bg-red-50">
              <AlertTriangle className="h-4 w-4 text-negative" />
              <AlertDescription className="text-sm text-negative">{error}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-ink">
                {t.auth.login.emailLabel}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.login.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-ink">
                {t.auth.login.passwordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t.auth.login.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                  aria-label={showPassword ? t.auth.login.hidePassword : t.auth.login.showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="mt-2 h-11 w-full">
              {isLoading ? t.auth.login.signingIn : t.auth.login.signIn}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-2">
            {t.auth.login.dontHaveAccount}{" "}
            <Link href="/signup" className="font-medium text-brand hover:text-brand-hover">
              {t.auth.login.signUpLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
