import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/components/e3u/I18nProvider";
import HQ from "@/pages/HQ";
import Login from "@/pages/Login";
import { ForgotPassword, Register, ResetPassword } from "@/pages/Register";
import Profile from "@/pages/Profile";
import Bank from "@/pages/Bank";
import Trucks from "@/pages/Trucks";
import Members from "@/pages/Members";
import Forum from "@/pages/Forum";
import ThreadView from "@/pages/ThreadView";
import Events from "@/pages/Events";
import Recruitment from "@/pages/Recruitment";
import Contact from "@/pages/Contact";
import Diplomacy from "@/pages/Diplomacy";
import Codex from "@/pages/Codex";
import Assistant from "@/pages/Assistant";
import Officer from "@/pages/Officer";
import Audit from "@/pages/Audit";
import Admin from "@/pages/Admin";

export default function App() {
  return (
    <I18nProvider>
      <Routes>
        <Route path="/" element={<HQ />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/bank" element={<Bank />} />
        <Route path="/trucks" element={<Trucks />} />
        <Route path="/members" element={<Members />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/forum/:threadId" element={<ThreadView />} />
        <Route path="/events" element={<Events />} />
        <Route path="/recruitment" element={<Recruitment />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/diplomacy" element={<Diplomacy />} />
        <Route path="/codex" element={<Codex />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/officer" element={<Officer />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<HQ />} />
      </Routes>
      <Toaster richColors />
    </I18nProvider>
  );
}
