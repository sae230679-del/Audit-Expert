import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { AdminLayout } from "./layout";
import AdminDashboard from "./dashboard";
import AdminUsers from "./users";
import AdminPackages from "./packages";
import AdminCases from "./cases";
import AdminPromoCodes from "./promo-codes";
import AdminReferrals from "./referrals";
import AdminFaq from "./faq";
import AdminSettings from "./settings";
import AdminDocuments from "./documents";
import AdminPayments from "./payments";
import AdminLogin from "./login";
import AdminSites from "./sites";
import AdminTickets from "./tickets";
import AdminOrders from "./orders";
import AdminMessages from "./messages";
import AdminGigaChat from "./gigachat";
import AdminAnalytics from "./analytics";
import AdminAnalyticsUsers from "./analytics-users";
import AdminAnalyticsExpress from "./analytics-express";
import ManagerDashboard from "./manager-dashboard";
import LawyerDashboard from "./lawyer-dashboard";
import AISettingsPage from "./ai-settings";

export default function AdminIndex() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    setIsAuthenticated(!!token);
  }, [location]);

  // Wait for auth check
  if (isAuthenticated === null) {
    return null;
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/sites" component={AdminSites} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/messages" component={AdminMessages} />
        <Route path="/admin/tickets" component={AdminTickets} />
        <Route path="/admin/packages" component={AdminPackages} />
        <Route path="/admin/promo-codes" component={AdminPromoCodes} />
        <Route path="/admin/referrals" component={AdminReferrals} />
        <Route path="/admin/cases" component={AdminCases} />
        <Route path="/admin/faq" component={AdminFaq} />
        <Route path="/admin/gigachat" component={AdminGigaChat} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
        <Route path="/admin/analytics/users" component={AdminAnalyticsUsers} />
        <Route path="/admin/analytics/express" component={AdminAnalyticsExpress} />
        <Route path="/admin/manager" component={ManagerDashboard} />
        <Route path="/admin/lawyer" component={LawyerDashboard} />
        <Route path="/admin/ai-settings" component={AISettingsPage} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/documents" component={AdminDocuments} />
        <Route path="/admin/payments" component={AdminPayments} />
        <Route component={AdminDashboard} />
      </Switch>
    </AdminLayout>
  );
}
