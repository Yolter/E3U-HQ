import { AuthCard } from "@/pages/Login";

export function Register() {
  return <AuthCard mode="register" />;
}

export function ForgotPassword() {
  return <AuthCard mode="forgot" />;
}

export function ResetPassword() {
  return <AuthCard mode="reset" />;
}

export default Register;
