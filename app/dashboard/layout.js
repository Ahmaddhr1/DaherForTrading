import { MySideBar } from "@/components/MySideBar";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { PageBackBar } from "@/components/PageBackBar";
import { CartProvider } from "@/core/orders/cartContext";
import CartDrawer from "@/app/dashboard/products/CartDrawer";

export default function RootLayout({ children }) {
  return (
    <CartProvider>
      <div className={"flex min-h-screen antialiased"}>
        <div className="w-fit">
          <MySideBar />
        </div>
        <main className="flex-1 p-4 pb-24 lg:pb-4 overflow-auto">
          <PageBackBar />
          {children}
        </main>
        <MobileBottomBar />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
