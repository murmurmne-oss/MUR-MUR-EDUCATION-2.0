export const dynamic = "force-dynamic";

import LoginForm from "./login-form";
import { getEnabledAuthModes, loadAdminAuthConfig } from "@/lib/admin-auth-config";

type LoginPageProps = {
  searchParams?: {
    redirect?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const redirectParam = searchParams?.redirect;
  const redirectTo =
    typeof redirectParam === "string" && redirectParam.trim().length > 0
      ? redirectParam
      : "/";

  const config = loadAdminAuthConfig();
  const modes = getEnabledAuthModes(config);

  return <LoginForm redirectTo={redirectTo} modes={modes} />;
}
