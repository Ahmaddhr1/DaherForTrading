import { MySideBar } from "@/components/MySideBar";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { CartProvider } from "@/lib/cartContext";
import CartDrawer from "@/app/dashboard/products/CartDrawer";

export default function RootLayout({ children }) {
  return (
    <CartProvider>
      <div className={"flex min-h-screen antialiased"}>
        <div className="w-fit">
          <MySideBar />
        </div>
        <main className="flex-1 p-4 pb-24 lg:pb-4 overflow-auto">
          {children}
        </main>
        <MobileBottomBar />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
