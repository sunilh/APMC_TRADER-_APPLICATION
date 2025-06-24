import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { Settings as SettingsIcon, User, Globe, Bell, Shield } from "lucide-react";

export default function Settings() {
  const { user, logoutMutation } = useAuth();
  const { language, setLanguage, t } = useI18n();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8" />
            {t("settings.title")}
          </h1>
          <p className="text-muted-foreground">{t("settings.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t("settings.profile.title")}
              </CardTitle>
              <CardDescription>{t("settings.profile.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">{t("settings.profile.name")}</Label>
                <Input id="name" value={user?.name || ""} disabled />
              </div>
              <div>
                <Label htmlFor="username">{t("settings.profile.username")}</Label>
                <Input id="username" value={user?.username || ""} disabled />
              </div>
              <div>
                <Label htmlFor="email">{t("settings.profile.email")}</Label>
                <Input id="email" value={user?.email || ""} disabled />
              </div>
              <div>
                <Label htmlFor="role">{t("settings.profile.role")}</Label>
                <Input id="role" value={user?.role || ""} disabled />
              </div>
            </CardContent>
          </Card>

          {/* Language & Regional Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {t("settings.language.title")}
              </CardTitle>
              <CardDescription>{t("settings.language.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="language">{t("settings.language.select")}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                    <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                {t("settings.notifications.title")}
              </CardTitle>
              <CardDescription>{t("settings.notifications.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("settings.notifications.comingSoon")}
              </p>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t("settings.security.title")}
              </CardTitle>
              <CardDescription>{t("settings.security.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? t("settings.security.loggingOut") : t("settings.security.logout")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}