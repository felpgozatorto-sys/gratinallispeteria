import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";

import Header from "@/components/app/Header";
import Footer from "@/components/app/Footer";
import CartModal from "@/components/app/CartModal";
import AuthPromptModal from "@/components/app/AuthPromptModal";
import ProfileCompletionModal from "@/components/app/ProfileCompletionModal";
import { ProtectedRoute, AdminRoute } from "@/components/app/Guards";

import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Checkout from "@/pages/Checkout";
import PromotionDetail from "@/pages/PromotionDetail";
import MyOrders from "@/pages/MyOrders";
import MyAddresses from "@/pages/MyAddresses";
import StoreClosed from "@/pages/StoreClosed";

import AdminLayout from "@/pages/admin/AdminLayout";
import Kanban from "@/pages/admin/Kanban";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminPromotions from "@/pages/admin/AdminPromotions";
import AdminOrderHistory from "@/pages/admin/AdminOrderHistory";
import AdminSettings from "@/pages/admin/AdminSettings";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

function CustomerLayout() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const isAdmin = user && user.role === "admin";
  if (settings && settings.store_open === false && !isAdmin) {
    return <StoreClosed />;
  }
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartModal />
      <AuthPromptModal />
      <ProfileCompletionModal />
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <SettingsProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<CustomerLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/promocao/:id" element={<PromotionDetail />} />
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/meus-pedidos" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
                  <Route path="/meus-enderecos" element={<ProtectedRoute><MyAddresses /></ProtectedRoute>} />
                </Route>
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Register />} />
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<Kanban />} />
                  <Route path="produtos" element={<AdminProducts />} />
                  <Route path="promocoes" element={<AdminPromotions />} />
                  <Route path="historico" element={<AdminOrderHistory />} />
                  <Route path="configuracoes" element={<AdminSettings />} />
                </Route>
              </Routes>
              <Toaster position="top-center" richColors />
            </BrowserRouter>
          </CartProvider>
        </SettingsProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
