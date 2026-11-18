"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Minus, Plus, Trash2, Search, Loader2, User, X } from "lucide-react";

export default function CartDrawer({ cart, onUpdateQty, onRemove, onClear }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(null); // null | "search" | "type"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [typedName, setTypedName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const { data: searchData, isLoading: searching } = useQuery({
    queryKey: ["cart-customer-search", searchTerm],
    queryFn: async () => {
      const res = await axios.get("/api/customers", {
        params: { search: searchTerm, limit: 8, sort: "nameAsc" },
      });
      return res.data;
    },
    enabled: checkoutMode === "search" && searchTerm.trim().length > 0 && !selectedCustomer,
  });
  const customers = searchData?.customers || [];

  const resetCheckout = () => {
    setCheckingOut(false);
    setCheckoutMode(null);
    setSearchTerm("");
    setSelectedCustomer(null);
    setTypedName("");
  };

  const handleClose = () => {
    setOpen(false);
    resetCheckout();
  };

  const buildProductsPayload = () =>
    cart.map((item) => ({ productId: item.productId, price: item.price, quantity: item.quantity }));

  const submitWithCustomer = async () => {
    try {
      setSubmitting(true);
      await axios.post(`/api/orders/${selectedCustomer._id}`, {
        products: buildProductsPayload(),
        taxRate: 0,
        asDraft: true,
      });
      toast.success("Draft order created");
      onClear();
      queryClient.invalidateQueries({ queryKey: ["orders", "draft"] });
      handleClose();
      router.push("/dashboard/orders");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create draft order");
    } finally {
      setSubmitting(false);
    }
  };

  const submitWithTypedName = async () => {
    if (!typedName.trim()) {
      toast.error("Enter a customer name");
      return;
    }
    try {
      setSubmitting(true);
      await axios.post("/api/orders/draft", {
        products: buildProductsPayload(),
        taxRate: 0,
        customerNameText: typedName.trim(),
      });
      toast.success("Draft order created");
      onClear();
      queryClient.invalidateQueries({ queryKey: ["orders", "draft"] });
      handleClose();
      router.push("/dashboard/orders");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create draft order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 p-0 flex items-center justify-center"
      >
        <ShoppingCart className="h-6 w-6" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </Button>

      <Modal open={open} onClose={handleClose} title="Cart" maxWidth="max-w-md">
        {cart.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Your cart is empty.</p>
        ) : !checkingOut ? (
          <div className="space-y-4">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQty(item.productId, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onUpdateQty(item.productId, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => onRemove(item.productId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="font-medium text-gray-700">Total</span>
              <span className="font-bold text-lg text-gray-900">${total.toFixed(2)}</span>
            </div>
            <Button className="w-full" onClick={() => setCheckingOut(true)}>
              Create Draft Order
            </Button>
          </div>
        ) : !checkoutMode ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Who is this order for?</p>
            <Button variant="outline" className="w-full flex items-center gap-2" onClick={() => setCheckoutMode("search")}>
              <Search className="h-4 w-4" />
              Search Existing Customer
            </Button>
            <Button variant="outline" className="w-full flex items-center gap-2" onClick={() => setCheckoutMode("type")}>
              <User className="h-4 w-4" />
              Type a Name
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setCheckingOut(false)}>
              Back to Cart
            </Button>
          </div>
        ) : checkoutMode === "search" ? (
          <div className="space-y-3">
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-900">{selectedCustomer.fullName}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.phoneNumber}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search customers by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                {searchTerm.trim().length > 0 && (
                  <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                    {searching && (
                      <div className="p-4 text-center text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </div>
                    )}
                    {!searching && customers.length === 0 && (
                      <div className="p-4 text-center text-gray-500 text-sm">No customers found</div>
                    )}
                    {!searching &&
                      customers.map((customer) => (
                        <button
                          key={customer._id}
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{customer.fullName}</p>
                            <p className="text-sm text-gray-500">{customer.phoneNumber}</p>
                          </div>
                          <Badge variant={customer.debt > 0 ? "destructive" : "outline"}>
                            ${customer.debt?.toLocaleString() || 0}
                          </Badge>
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
            <Button
              className="w-full"
              disabled={!selectedCustomer || submitting}
              onClick={submitWithCustomer}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Draft Order"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setCheckoutMode(null)}>
              Back
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Customer Name</label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Enter customer name"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                No customer selected yet - you can link a real customer later from the Drafts tab.
              </p>
            </div>
            <Button className="w-full" disabled={submitting} onClick={submitWithTypedName}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Draft Order"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setCheckoutMode(null)}>
              Back
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}
