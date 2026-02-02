import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const provider = params.get("provider");
    const error = params.get("error");

    if (error) {
      console.error("OAuth error:", error);
      setLocation("/auth?error=" + error);
      return;
    }

    if (token) {
      localStorage.setItem("userToken", token);
      
      fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            
            if (data.user.role === "admin" || data.user.role === "superadmin") {
              localStorage.setItem("adminToken", token);
            }
          }
          setLocation("/cabinet");
        })
        .catch(() => {
          setLocation("/cabinet");
        });
    } else {
      setLocation("/auth");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Авторизация...</p>
      </div>
    </div>
  );
}
